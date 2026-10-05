// Operator-only provisioning helper. Never imported by the app; not run automatically.
// Usage after approval: node scripts/create-church-invite.mjs --email leader@example.org --app-url https://your-app.example
import { randomBytes, createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
const args = process.argv.slice(2)
const emailIndex = args.indexOf('--email')
const email = (emailIndex >= 0 ? args[emailIndex + 1] || '' : '').trim().toLowerCase()
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Provide the approved leader email with --email.')
const appUrlIndex = args.indexOf('--app-url')
const appUrlValue = (appUrlIndex >= 0 ? args[appUrlIndex + 1] : process.env.NEXT_PUBLIC_APP_URL) || ''
let appOrigin = ''
if (appUrlValue) {
  const appUrl = new URL(appUrlValue)
  if (appUrl.protocol !== 'https:' || appUrl.username || appUrl.password) throw new Error('The app URL must be HTTPS without embedded credentials.')
  appOrigin = appUrl.origin
}
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Operator database configuration is missing.')
const token = randomBytes(32).toString('base64url')
const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString()
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const { error } = await db.from('church_management_invites').insert({ token_hash: createHash('sha256').update(token).digest('hex'), email, expires_at: expiresAt })
if (error) throw new Error('Invitation could not be created; check the migration and database access.')
// Fragments are not sent to the web server or included in the HTTP Referer header.
const invitationLink = `${appOrigin}/church/manage#invite=${encodeURIComponent(token)}`
console.log(JSON.stringify({ email, expiresAt, invitationLink, instruction: 'Give this one-time link only to the approved recipient. Do not post it publicly.' }, null, 2))
