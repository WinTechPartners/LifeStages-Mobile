import { randomBytes, createHash } from 'node:crypto'
import { Resend } from 'resend'
import { pool } from '@/lib/db'
import type { PoolClient } from 'pg'

const digest = (value: string) => createHash('sha256').update(value).digest('hex')
export async function POST(request: Request) {
  let client: PoolClient | undefined
  try {
    client = await pool.connect()
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({error:'Enter a valid email address.'},{status:400})
    await client.query(`CREATE TABLE IF NOT EXISTS account_deletion_requests (email_hash TEXT PRIMARY KEY, token_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL)`)
    await client.query('BEGIN')
    // Serialize requests for the same address, including the initial request.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[email])
    const tables = await client.query("SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='email' AND table_name IN ('subscriptions','push_tokens')")
    let hasRecords = false
    for (const {table_name} of tables.rows) {
      const found = await client.query(`SELECT 1 FROM ${table_name} WHERE lower(email)=$1 LIMIT 1`,[email])
      if (found.rowCount) hasRecords = true
    }
    if (!hasRecords) {
      await client.query('DELETE FROM account_deletion_requests WHERE email_hash=$1',[digest(email)])
      await client.query('COMMIT')
      return Response.json({success:true})
    }
    // An email typed into a local profile is not proof of ownership. Confirm
    // through that inbox before erasing remotely stored email-linked records.
    const pending = await client.query('SELECT token_hash, expires_at, created_at FROM account_deletion_requests WHERE email_hash=$1 FOR UPDATE',[digest(email)])
    const previous = pending.rows[0]
    if (typeof body.token === 'string') {
      if (!previous || new Date(previous.expires_at).getTime() < Date.now() || digest(body.token) !== previous.token_hash) {
        await client.query('ROLLBACK')
        return Response.json({error:'This confirmation link expired. Request account deletion again.'},{status:400})
      }
      for (const {table_name} of tables.rows) await client.query(`DELETE FROM ${table_name} WHERE lower(email)=$1`,[email])
      await client.query('DELETE FROM account_deletion_requests WHERE email_hash=$1',[digest(email)])
      await client.query('COMMIT')
      return Response.json({success:true})
    }
    if (previous && Date.now()-new Date(previous.created_at).getTime()<60000) {
      await client.query('COMMIT')
      return Response.json({verificationRequired:true,error:'Check your email for the account-deletion confirmation link. After confirming, retry deletion in the app.'},{status:202})
    }
    if (!process.env.RESEND_API_KEY) throw new Error('Email verification unavailable')
    const token = randomBytes(32).toString('hex')
    await client.query(`INSERT INTO account_deletion_requests(email_hash,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL '15 minutes') ON CONFLICT(email_hash) DO UPDATE SET token_hash=EXCLUDED.token_hash,created_at=NOW(),expires_at=EXCLUDED.expires_at`,[digest(email),digest(token)])
    const link = `https://bibleforlifestages.com/account/delete?email=${encodeURIComponent(email)}&token=${token}`
    const sent = await new Resend(process.env.RESEND_API_KEY).emails.send({from:'Bible for Life Stages <verse@bibleforlifestages.com>',to:email,subject:'Confirm account deletion',text:`You requested deletion of your Bible for Life Stages account. Open this link and confirm within 15 minutes: ${link}\nIf you did not request this, ignore this message. Deleting your account does not cancel an Apple subscription.`})
    if (sent.error) throw new Error('Email verification unavailable')
    await client.query('COMMIT')
    return Response.json({verificationRequired:true,error:'Check your email for the account-deletion confirmation link. After confirming, retry deletion in the app.'},{status:202})
  } catch {
    await client?.query('ROLLBACK').catch(()=>{})
    return Response.json({error:'Account deletion could not be completed. Please retry or contact info@wintechpartners.com.'},{status:503})
  } finally { client?.release() }
}
