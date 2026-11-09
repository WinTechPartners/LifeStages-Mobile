// Server entry point only. Never import this module into a client component.
import { createHmac } from 'node:crypto'
import { ANALYTICS_MAX_BODY_BYTES, type AnalyticsEnvelope, type AnalyticsEvent, validateAnalyticsEnvelope, validateAnalyticsDeleteRequest } from './contract'

type AnalyticsEnvironment = Record<string, string | undefined>
export interface AnalyticsStoredEvent {
  event_id: string; church_id: string; device_key: string; session_key: string; view_key: string | null
  contract_version: number; consent_version: number; consented_at: string; occurred_at: string
  age_taxonomy_version: number | null; life_circumstances: string[] | null; circumstance_taxonomy_version: number | null; declarations_updated_at: string | null
  kind: AnalyticsEvent['kind']; age_band: string | null; situation: string | null; topic_id: string | null
  sermon_id: string | null; content_type: string | null; channel: string | null
  scripture: AnalyticsEvent['scripture'] | null; active_ms: number | null
}
export interface AnalyticsStorage {
  churchExists(churchId: string): Promise<boolean>
  sermonsBelongToChurch(churchId: string, sermonIds: string[]): Promise<boolean>
  ingest(churchId: string, deviceKey: string, events: AnalyticsStoredEvent[]): Promise<{ inserted: number; duplicate: number; limited: boolean; revoked?: boolean }>
  erase(churchId: string, deviceKey: string): Promise<void>
}
export interface AnalyticsServerDependencies { env?: AnalyticsEnvironment; storage?: AnalyticsStorage; now?: () => number }

function configured(env: AnalyticsEnvironment) {
  return Boolean((env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL) && env.SUPABASE_SERVICE_ROLE_KEY && (env.CHURCH_ANALYTICS_HMAC_SECRET?.length || 0) >= 32)
}
export function analyticsIsEnabled(env: AnalyticsEnvironment = process.env) { return env.CHURCH_ANALYTICS_ENABLED === 'true' && configured(env) }
export function analyticsDeviceKey(churchId: string, deviceId: string, secret: string) {
  return createHmac('sha256', secret).update(`v1:device:${churchId.toLowerCase()}:${deviceId.toLowerCase()}`).digest('hex')
}
export function mapAnalyticsEvents(envelope: AnalyticsEnvelope, secret: string): AnalyticsStoredEvent[] {
  const churchId = envelope.churchId.toLowerCase()
  const deviceKey = analyticsDeviceKey(churchId, envelope.deviceId, secret)
  const opaque = (kind: string, id: string) => createHmac('sha256', secret).update(`v1:${kind}:${churchId}:${deviceKey}:${id.toLowerCase()}`).digest('hex')
  return envelope.events.map(event => ({
    event_id: event.id.toLowerCase(), church_id: churchId, device_key: deviceKey,
    session_key: opaque('session', event.sessionId), view_key: event.viewId ? opaque('view', event.viewId) : null,
    contract_version: 1, consent_version: 1, consented_at: envelope.consentedAt, occurred_at: event.occurredAt,
    age_taxonomy_version: envelope.ageTaxonomyVersion ?? null, life_circumstances: envelope.lifeCircumstances ? [...envelope.lifeCircumstances] : null, circumstance_taxonomy_version: envelope.circumstanceTaxonomyVersion ?? null, declarations_updated_at: envelope.declarationsUpdatedAt ?? null,
    kind: event.kind, age_band: envelope.ageBand || null, situation: envelope.situation || null,
    topic_id: event.topicId || null, sermon_id: event.sermonId?.toLowerCase() || null,
    content_type: event.contentType || null, channel: event.channel || null,
    scripture: event.scripture ? { ...event.scripture, ...(event.scripture.verses ? { verses: [...event.scripture.verses] } : {}) } : null,
    active_ms: event.activeMs ?? null,
  }))
}

let clientPromise: Promise<AnalyticsStorage> | undefined
async function storageFor(env: AnalyticsEnvironment): Promise<AnalyticsStorage> {
  if (typeof window !== 'undefined') throw new Error('Analytics storage is server-only')
  if (!clientPromise) clientPromise = import('@supabase/supabase-js').then(({ createClient }) => {
    const db = createClient(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    return {
      async churchExists(churchId) {
        const result = await db.from('churches').select('id').eq('id', churchId).maybeSingle()
        if (result.error) throw new Error('Church lookup unavailable')
        return Boolean(result.data)
      },
      async sermonsBelongToChurch(churchId, sermonIds) {
        if (!sermonIds.length) return true
        const result = await db.from('trueteachings_sermons').select('id').eq('church_id', churchId).in('id', sermonIds)
        if (result.error) throw new Error('Sermon lookup unavailable')
        const known = new Set(result.data.map(row => row.id))
        const remaining = sermonIds.filter(id => !known.has(id))
        if (!remaining.length) return true
        const manual = await db.from('church_published_sermons').select('id').eq('church_id', churchId).in('id', remaining)
        if (manual.error) throw new Error('Published sermon lookup unavailable')
        const published = new Set(manual.data.map(row => row.id))
        const importedIds = remaining.filter(id => !published.has(id))
        if (!importedIds.length) return true
        const imported = await db.from('church_imported_sermons').select('id').eq('church_id', churchId).in('id', importedIds)
        if (imported.error) throw new Error('Imported source lookup unavailable')
        return imported.data.length === importedIds.length
      },
      async ingest(churchId, deviceKey, events) {
        const result = await db.rpc('ingest_church_analytics_events', { p_church_id: churchId, p_device_key: deviceKey, p_events: events })
        if (result.error) throw new Error('Analytics storage unavailable')
        const value = result.data as { inserted: number; duplicate: number; limited: boolean; revoked?: boolean }
        if (!value || !Number.isInteger(value.inserted) || !Number.isInteger(value.duplicate) || typeof value.limited !== 'boolean') throw new Error('Invalid storage result')
        return value
      },
      async erase(churchId, deviceKey) {
        const result = await db.rpc('erase_church_analytics_device', { p_church_id: churchId, p_device_key: deviceKey })
        if (result.error) throw new Error('Analytics deletion unavailable')
      },
    }
  })
  return clientPromise
}

function allowedOrigin(request: Request, env: AnalyticsEnvironment) {
  const origin = request.headers.get('origin')
  if (!origin) return request.method === 'GET' || request.headers.get('sec-fetch-site') === 'same-origin'
  if (origin === new URL(request.url).origin) return true
  const allowed = (env.CHURCH_ANALYTICS_ALLOWED_ORIGINS || '').split(',').map(item => item.trim()).filter(Boolean)
  return origin !== 'null' && allowed.includes(origin)
}
function headers(request: Request) {
  const result = new Headers({ 'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' })
  const origin = request.headers.get('origin')
  if (origin) result.set('Access-Control-Allow-Origin', origin)
  return result
}
function response(request: Request, body: unknown, status = 200) { return Response.json(body, { status, headers: headers(request) }) }
async function readJson(request: Request): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new Error('media')
  const length = Number(request.headers.get('content-length'))
  if (length > ANALYTICS_MAX_BODY_BYTES) throw new Error('size')
  if (!request.body) throw new Error('json')
  const reader = request.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let bytes = 0
  let text = ''
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value.byteLength
      if (bytes > ANALYTICS_MAX_BODY_BYTES) { await reader.cancel(); throw new Error('size') }
      text += decoder.decode(chunk.value, { stream: true })
    }
    text += decoder.decode()
    return JSON.parse(text)
  } finally { reader.releaseLock() }
}

export async function handleAnalyticsConfig(request: Request, deps: AnalyticsServerDependencies = {}) {
  const env = deps.env || process.env
  if (!allowedOrigin(request, env)) return Response.json({ error: 'Origin not allowed' }, { status: 403 })
  return response(request, { enabled: analyticsIsEnabled(env), version: 1, consentVersion: 1, population: 'consenting_devices', maxBatchSize: 25 })
}
export async function handleAnalyticsOptions(request: Request, deps: AnalyticsServerDependencies = {}) {
  if (!allowedOrigin(request, deps.env || process.env)) return new Response(null, { status: 403 })
  const result = headers(request)
  result.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  result.set('Access-Control-Allow-Headers', 'Content-Type')
  result.set('Access-Control-Max-Age', '600')
  return new Response(null, { status: 204, headers: result })
}
export async function handleAnalyticsEvents(request: Request, deps: AnalyticsServerDependencies = {}) {
  const env = deps.env || process.env
  if (!allowedOrigin(request, env)) return Response.json({ error: 'Origin not allowed' }, { status: 403 })
  const deleting = request.method === 'DELETE'
  if (request.method !== 'POST' && !deleting) return response(request, { error: 'Method not allowed' }, 405)
  // Deletion stays available after collection is disabled, while storage remains configured.
  if (deleting ? !configured(env) : !analyticsIsEnabled(env)) return response(request, { enabled: false, error: 'Analytics unavailable' }, 503)
  let input: unknown
  try { input = await readJson(request) } catch (error) {
    const kind = error instanceof Error ? error.message : ''
    return response(request, { error: kind === 'size' ? 'Request too large' : kind === 'media' ? 'JSON content type required' : 'Invalid JSON' }, kind === 'size' ? 413 : kind === 'media' ? 415 : 400)
  }
  const validated = deleting ? validateAnalyticsDeleteRequest(input) : validateAnalyticsEnvelope(input, deps.now?.() ?? Date.now())
  if (!validated.ok) return response(request, { error: validated.error }, 400)
  try {
    const store = deps.storage || await storageFor(env)
    const churchId = validated.value.churchId.toLowerCase()
    const deviceKey = analyticsDeviceKey(churchId, validated.value.deviceId, env.CHURCH_ANALYTICS_HMAC_SECRET!)
    if (deleting) {
      await store.erase(churchId, deviceKey)
      return response(request, { erased: true, population: 'this_device_at_this_church' })
    }
    if (!await store.churchExists(churchId)) return response(request, { error: 'Unknown church' }, 400)
    const envelope = validated.value as AnalyticsEnvelope
    const sermons = [...new Set(envelope.events.flatMap(event => event.sermonId ? [event.sermonId.toLowerCase()] : []))]
    if (!await store.sermonsBelongToChurch(churchId, sermons)) return response(request, { error: 'Sermon does not belong to this church' }, 400)
    const result = await store.ingest(churchId, deviceKey, mapAnalyticsEvents(envelope, env.CHURCH_ANALYTICS_HMAC_SECRET!))
    if (result.revoked) return response(request, { error: 'Consent was withdrawn; enable sharing again before sending new events' }, 409)
    if (result.limited) return response(request, { error: 'Daily device limit reached' }, 429)
    return response(request, { accepted: result.inserted, duplicate: result.duplicate }, 202)
  } catch {
    // Never log request bodies, device IDs, queries, or provider errors.
    return response(request, { error: 'Analytics temporarily unavailable' }, 503)
  }
}
