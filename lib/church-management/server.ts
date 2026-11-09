// Node server entry only; credentials and password hashes never reach client components.
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual, pbkdf2, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { validateChurchManagementRequest, type ChurchAdminRole, type ManagedChurch, type PublishedSermon, type SermonDraft, type ChurchBranding } from './contract'
import { getSermonAutomationForChurch, saveSermonSourceForChurch } from '../sermon-automation/server'
import type { SermonAutomationState, SermonSourceInput } from '../sermon-automation/contract'
type Environment = Record<string, string | undefined>
export interface ManagedAdmin { id: string; church_id: string; email: string; name: string | null; role: ChurchAdminRole; password_hash: string }
export interface ChurchManagementStorage {
  consumeAttempt(key: string): Promise<boolean>
  loginRecord(slug: string, email: string): Promise<{ church: ManagedChurch; admin: ManagedAdmin } | null>
  adminById(id: string, churchId: string): Promise<ManagedAdmin | null>
  churchById(id: string): Promise<ManagedChurch | null>
  sermons(churchId: string, limit: number): Promise<PublishedSermon[]>
  updateChurch(churchId: string, updates: Partial<ChurchBranding>): Promise<void>
  publish(churchId: string, adminId: string, sermon: SermonDraft): Promise<PublishedSermon | null>
  acceptInvite(input: { tokenHash: string; email: string; passwordHash: string; name: string; slug: string; churchName: string }): Promise<{ church: ManagedChurch; admin: ManagedAdmin } | null>
  automation?(churchId: string): Promise<SermonAutomationState>
  saveSource?(churchId: string, adminId: string, source: SermonSourceInput): Promise<void>
}
export interface ChurchManagementDependencies { env?: Environment; storage?: ChurchManagementStorage; now?: () => number }
const scryptAsync = promisify(scrypt), pbkdf2Async = promisify(pbkdf2)
const equal = (a: string, b: string) => { const left = Buffer.from(a), right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right) }
export async function hashManagementPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = await scryptAsync(password, salt, 64) as Buffer
  return `scrypt-v1$${salt}$${derived.toString('hex')}`
}
export async function verifyManagementPassword(password: string, hash: string) {
  if (/^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash)) {
    const [, salt, stored] = hash.split('$')
    return equal((await scryptAsync(password, salt, 64) as Buffer).toString('hex'), stored)
  }
  // Existing admins use the original application's 10,000-round PBKDF2 format.
  if (/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash)) {
    const [salt, stored] = hash.split(':')
    return equal((await pbkdf2Async(password, salt, 10000, 64, 'sha512')).toString('hex'), stored)
  }
  return false
}
const dbConfigured = (env: Environment) => !!((env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL) && env.SUPABASE_SERVICE_ROLE_KEY)
export const churchManagementEnabled = (env: Environment = process.env) => env.CHURCH_MANAGEMENT_ENABLED === 'true' && dbConfigured(env) && (env.CHURCH_ADMIN_SESSION_SECRET?.length || 0) >= 32
const credentialTag = (admin: ManagedAdmin, secret: string) => createHmac('sha256', secret).update(`credential:${admin.id}:${admin.password_hash}`).digest('hex')
export function issueChurchSession(admin: ManagedAdmin, secret: string, now = Date.now()) {
  const expiresAt = now + 60 * 60_000
  const claims = { version: 1, adminId: admin.id, churchId: admin.church_id, issuedAt: now, expiresAt, credential: credentialTag(admin, secret) }
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return { token: `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`, expiresAt: new Date(expiresAt).toISOString() }
}
export function verifyChurchSession(token: string, secret: string, now = Date.now()): { adminId: string; churchId: string; credential: string } | null {
  if (token.length > 2048) return null
  const parts = token.split('.')
  if (parts.length !== 2 || !equal(createHmac('sha256', secret).update(parts[0]).digest('base64url'), parts[1])) return null
  try {
    const value = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
    const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
    if (value.version !== 1 || !uuid.test(value.adminId) || !uuid.test(value.churchId) || typeof value.credential !== 'string' || !Number.isFinite(value.expiresAt) || !Number.isFinite(value.issuedAt) || value.expiresAt <= now || value.issuedAt > now + 60000 || value.expiresAt - value.issuedAt !== 60 * 60_000) return null
    return value
  } catch { return null }
}
const churchFields = 'id,slug,name,logo_url,primary_color,secondary_color,welcome_message,leadership_contact_name,leadership_contact_email,leadership_contact_phone,leadership_contact_url'
const adminFields = 'id,church_id,email,name,role,password_hash'
let storagePromise: Promise<ChurchManagementStorage> | undefined
async function defaultStorage(env: Environment): Promise<ChurchManagementStorage> {
  if (typeof window !== 'undefined') throw new Error('Church management is server-only')
  if (!storagePromise) storagePromise = import('@supabase/supabase-js').then(({ createClient }) => {
    const db = createClient(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
    const requireData = (result: { data: unknown; error: unknown }) => { if (result.error) throw new Error('Storage unavailable'); return result.data }
    return {
      automation: getSermonAutomationForChurch,
      saveSource: saveSermonSourceForChurch,
      async consumeAttempt(key) { return requireData(await db.rpc('consume_church_management_attempt', { p_key: key })) === true },
      async loginRecord(slug, email) {
        const church = requireData(await db.from('churches').select(churchFields).eq('slug', slug).maybeSingle()) as ManagedChurch | null
        if (!church) return null
        const admin = requireData(await db.from('church_admins').select(adminFields).eq('church_id', church.id).eq('email', email).maybeSingle()) as ManagedAdmin | null
        return admin ? { church, admin } : null
      },
      async adminById(id, churchId) { return requireData(await db.from('church_admins').select(adminFields).eq('id', id).eq('church_id', churchId).maybeSingle()) as ManagedAdmin | null },
      async churchById(id) { return requireData(await db.from('churches').select(churchFields).eq('id', id).maybeSingle()) as ManagedChurch | null },
      async sermons(churchId, limit) { return requireData(await db.from('church_published_sermons').select('*').eq('church_id', churchId).order('sermon_date', { ascending: false }).order('published_at', { ascending: false }).limit(Math.max(1, Math.min(limit, 100)))) as PublishedSermon[] },
      async updateChurch(churchId, updates) { requireData(await db.from('churches').update(updates).eq('id', churchId).select('id').single()) },
      async publish(churchId, adminId, sermon) {
        return requireData(await db.rpc('publish_church_sermon', { p_church_id: churchId, p_admin_id: adminId, p_sermon: { ...sermon, id: randomUUID() } })) as PublishedSermon | null
      },
      async acceptInvite(input) {
        const result = await db.rpc('accept_church_management_invite', { p_token_hash: input.tokenHash, p_email: input.email, p_password_hash: input.passwordHash, p_admin_name: input.name, p_slug: input.slug, p_church_name: input.churchName })
        const ids = requireData(result) as { church_id: string; admin_id: string } | null
        if (!ids) return null
        const church = requireData(await db.from('churches').select(churchFields).eq('id', ids.church_id).single()) as ManagedChurch
        const admin = requireData(await db.from('church_admins').select(adminFields).eq('id', ids.admin_id).single()) as ManagedAdmin
        return { church, admin }
      },
    }
  })
  return storagePromise
}
/** Server-side public API adapter; callers choose which safe published fields to expose. */
export async function getPublishedSermonsForChurch(churchId: string, limit = 20): Promise<PublishedSermon[]> {
  if (!dbConfigured(process.env)) return []
  return (await defaultStorage(process.env)).sermons(churchId, limit)
}
function originAllowed(request: Request, env: Environment) {
  const origin = request.headers.get('origin')
  if (!origin) return request.method === 'GET' || request.headers.get('sec-fetch-site') === 'same-origin'
  return origin === new URL(request.url).origin || (origin !== 'null' && (env.CHURCH_MANAGEMENT_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).includes(origin))
}
function response(request: Request, body: unknown, status = 200) {
  const headers = new Headers({ 'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' })
  const origin = request.headers.get('origin'); if (origin) headers.set('Access-Control-Allow-Origin', origin)
  return Response.json(body, { status, headers })
}
async function body(request: Request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new Error('Invalid JSON content type')
  if (Number(request.headers.get('content-length')) > 512000 || !request.body) throw new Error('Request too large or empty')
  const reader = request.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true })
  let size = 0, value = ''
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break
      size += part.value.byteLength
      if (size > 512000) { await reader.cancel(); throw new Error('Request too large') }
      value += decoder.decode(part.value, { stream: true })
    }
    return JSON.parse(value + decoder.decode())
  } finally { reader.releaseLock() }
}
async function dashboard(store: ChurchManagementStorage, admin: ManagedAdmin, church?: ManagedChurch) {
  return { church: church || await store.churchById(admin.church_id), admin: { name: admin.name, email: admin.email, role: admin.role }, sermons: await store.sermons(admin.church_id, 20), automation: store.automation ? await store.automation(admin.church_id) : { source: null, counts: { discovered: 0, transcript_pending: 0, analysis_pending: 0 }, capabilities: { discovery_enabled: false, youtube_configured: false, processor_configured: false } } }
}
export async function handleChurchManagement(request: Request, deps: ChurchManagementDependencies = {}) {
  const env = deps.env || process.env, now = deps.now?.() ?? Date.now()
  if (!originAllowed(request, env)) return Response.json({ error: 'Origin not allowed' }, { status: 403 })
  if (request.method === 'OPTIONS') {
    const headers = new Headers({ 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization,Content-Type' })
    const origin = request.headers.get('origin'); if (origin) headers.set('Access-Control-Allow-Origin', origin)
    return new Response(null, { status: 204, headers })
  }
  if (!churchManagementEnabled(env)) return response(request, { error: 'Church management is not enabled on this server yet' }, 503)
  if (!['GET', 'POST', 'PATCH'].includes(request.method)) return response(request, { error: 'Method not allowed' }, 405)
  let input: ReturnType<typeof validateChurchManagementRequest> | undefined
  if (request.method !== 'GET') {
    try { input = validateChurchManagementRequest(await body(request)) } catch { return response(request, { error: 'Invalid or oversized JSON request' }, 400) }
    if (!input.ok) return response(request, { error: input.error }, 400)
  }
  try {
    const store = deps.storage || await defaultStorage(env)
    const data = input?.ok ? input.value : undefined
    if (data?.action === 'login' || data?.action === 'accept_invite') {
      if (request.method !== 'POST') return response(request, { error: 'Use POST for authentication' }, 405)
      const attemptKey = createHmac('sha256', env.CHURCH_ADMIN_SESSION_SECRET!).update(`auth:${data.email}`).digest('hex')
      if (!await store.consumeAttempt(attemptKey)) return response(request, { error: 'Too many attempts. Please try again later.' }, 429)
      let found: { church: ManagedChurch; admin: ManagedAdmin } | null
      if (data.action === 'login') {
        found = await store.loginRecord(data.slug, data.email)
        const valid = await verifyManagementPassword(data.password, found?.admin.password_hash || `scrypt-v1$${'0'.repeat(32)}$${'0'.repeat(128)}`)
        if (!found || !valid) return response(request, { error: 'Invalid church code, email or password' }, 401)
      } else {
        found = await store.acceptInvite({ tokenHash: createHash('sha256').update(data.inviteToken).digest('hex'), email: data.email, passwordHash: await hashManagementPassword(data.password), name: data.name, slug: data.slug, churchName: data.churchName })
        if (!found) return response(request, { error: 'The invitation is invalid, expired, already used, or does not match this email/church code' }, 400)
      }
      return response(request, { ...issueChurchSession(found.admin, env.CHURCH_ADMIN_SESSION_SECRET!, now), ...await dashboard(store, found.admin, found.church) })
    }
    const auth = request.headers.get('authorization')
    const session = auth?.startsWith('Bearer ') ? verifyChurchSession(auth.slice(7), env.CHURCH_ADMIN_SESSION_SECRET!, now) : null
    if (!session) return response(request, { error: 'Please sign in again' }, 401)
    const admin = await store.adminById(session.adminId, session.churchId)
    if (!admin || !equal(session.credential, credentialTag(admin, env.CHURCH_ADMIN_SESSION_SECRET!))) return response(request, { error: 'Please sign in again' }, 401)
    if (request.method === 'GET') return response(request, await dashboard(store, admin))
    if (!['owner', 'pastor', 'admin'].includes(admin.role)) return response(request, { error: 'Your church role can view settings but cannot publish changes' }, 403)
    if (data?.action === 'save_sermon_source') {
      if (!store.saveSource) return response(request, { error: 'Source setup is unavailable' }, 503)
      await store.saveSource(admin.church_id, admin.id, data.source)
      return response(request, await dashboard(store, admin))
    }
    if (data?.action === 'update_church') {
      await store.updateChurch(admin.church_id, data.updates)
      return response(request, await dashboard(store, admin))
    }
    if (data?.action === 'publish_sermon') {
      const sermon = await store.publish(admin.church_id, admin.id, data.sermon)
      if (!sermon) return response(request, { error: 'The source sermon does not belong to this church' }, 400)
      return response(request, { ...await dashboard(store, admin), sermon }, 201)
    }
    return response(request, { error: 'Unsupported action' }, 400)
  } catch {
    // Do not log passwords, bearer tokens, invitation tokens, provider errors or sermon text.
    return response(request, { error: 'Church management is temporarily unavailable' }, 503)
  }
}
