// Source discovery only. No transcript, summary, Scripture or TDE atoms are invented.
import { timingSafeEqual } from 'node:crypto'
import { validateSermonSource, type SermonSource, type SermonSourceInput, type SermonAutomationState, type ImportedSermon } from './contract'
type Environment = Record<string, string | undefined>
export interface DiscoveredUpload { external_id: string; title: string; published_at: string; video_url: string; source_description: string }
export interface SourceScan { items: DiscoveredUpload[]; playlistId: string; nextCursor: string | null }
export interface AutomationStorage {
  state(churchId: string): Promise<{ source: SermonSource | null; counts: SermonAutomationState['counts'] }>
  save(churchId: string, adminId: string, source: SermonSourceInput, sourceKey: string): Promise<void>
  latest(churchId: string): Promise<ImportedSermon | null>
  claim(limit: number): Promise<(SermonSource & { scan_cursor: string | null; lease_id: string })[]>
  complete(source: SermonSource, scan: SourceScan): Promise<{ inserted: number; stale: boolean }>
  fail(source: SermonSource, code: string): Promise<void>
}
export interface AutomationDependencies { env?: Environment; storage?: AutomationStorage; fetch?: typeof fetch }
const configured = (env: Environment) => !!((env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL) && env.SUPABASE_SERVICE_ROLE_KEY)
export function automationCapabilities(env: Environment = process.env): SermonAutomationState['capabilities'] {
  return { discovery_enabled: env.SERMON_DISCOVERY_ENABLED === 'true' && configured(env) && (env.CRON_SECRET?.length || 0) >= 32, youtube_configured: !!env.YOUTUBE_DATA_API_KEY, processor_configured: false }
}
let storePromise: Promise<AutomationStorage> | undefined
async function defaultStorage(env: Environment): Promise<AutomationStorage> {
  if (typeof window !== 'undefined') throw new Error('Sermon discovery is server-only')
  if (!storePromise) storePromise = import('@supabase/supabase-js').then(({ createClient }) => {
    const db = createClient(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
    const check = (result: { data: unknown; error: unknown }) => { if (result.error) throw new Error('Storage unavailable'); return result.data }
    return {
      async state(churchId) {
        const source = check(await db.from('church_sermon_sources').select('id,church_id,kind,source_url,source_key,resolved_playlist_id,enabled,last_checked_at,next_check_at,backfill_complete,backfill_count,sync_status,last_error_code').eq('church_id', churchId).maybeSingle()) as SermonSource | null
        const results = await Promise.all([
          db.from('church_imported_sermons').select('id', { head: true, count: 'exact' }).eq('church_id', churchId),
          db.from('church_imported_sermons').select('id', { head: true, count: 'exact' }).eq('church_id', churchId).eq('transcript_status', 'pending'),
          db.from('church_imported_sermons').select('id', { head: true, count: 'exact' }).eq('church_id', churchId).eq('analysis_status', 'pending'),
        ])
        if (results.some(result => result.error)) throw new Error('Counts unavailable')
        return { source, counts: { discovered: results[0].count || 0, transcript_pending: results[1].count || 0, analysis_pending: results[2].count || 0 } }
      },
      async save(churchId, adminId, source, sourceKey) {
        const saved = check(await db.rpc('save_church_sermon_source', { p_church_id: churchId, p_admin_id: adminId, p_kind: source.kind, p_source_url: source.source_url, p_source_key: sourceKey, p_enabled: source.enabled }))
        if (saved !== true) throw new Error('Source not saved')
      },
      async latest(churchId) { return check(await db.from('church_imported_sermons').select('*').eq('church_id', churchId).order('published_at', { ascending: false }).limit(1).maybeSingle()) as ImportedSermon | null },
      async claim(limit) { return check(await db.rpc('claim_church_sermon_sources', { p_limit: limit })) as (SermonSource & { scan_cursor: string | null; lease_id: string })[] },
      async complete(source, scan) {
        return check(await db.rpc('complete_church_sermon_scan', { p_source_id: source.id, p_lease_id: source.lease_id, p_items: scan.items, p_playlist_id: scan.playlistId, p_next_cursor: scan.nextCursor })) as { inserted: number; stale: boolean }
      },
      async fail(source, code) { check(await db.rpc('fail_church_sermon_scan', { p_source_id: source.id, p_lease_id: source.lease_id, p_error_code: code })) },
    }
  })
  return storePromise
}
export async function getSermonAutomationForChurch(churchId: string, deps: AutomationDependencies = {}): Promise<SermonAutomationState> {
  const env = deps.env || process.env, capabilities = automationCapabilities(env)
  const state = await (deps.storage || await defaultStorage(env)).state(churchId)
  if (state.source?.enabled && (!capabilities.discovery_enabled || !capabilities.youtube_configured)) state.source.sync_status = 'waiting_configuration'
  return { ...state, capabilities }
}
export async function saveSermonSourceForChurch(churchId: string, adminId: string, input: SermonSourceInput, deps: AutomationDependencies = {}) {
  const validated = validateSermonSource(input)
  if (!validated.ok) throw new Error(validated.error)
  await (deps.storage || await defaultStorage(deps.env || process.env)).save(churchId, adminId, validated.value, validated.sourceKey)
}
export async function getLatestImportedSermonForChurch(churchId: string): Promise<(ImportedSermon & { publishedAt: string }) | null> {
  if (!configured(process.env)) return null
  const value = await (await defaultStorage(process.env)).latest(churchId)
  return value ? { ...value, publishedAt: value.published_at } : null
}
async function youtubeJson(endpoint: string, params: Record<string, string>, key: string, fetcher: typeof fetch): Promise<Record<string, any>> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`)
  for (const [name, value] of Object.entries({ ...params, key })) url.searchParams.set(name, value)
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetcher(url, { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' } })
    if (response.status === 400 && params.pageToken) throw new Error('youtube_cursor_expired')
    if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? 'youtube_quota_or_access' : 'youtube_source_unavailable')
    if (Number(response.headers.get('content-length')) > 2_000_000 || !response.body) throw new Error('youtube_invalid_response')
    const reader = response.body.getReader(), decoder = new TextDecoder(); let total = 0, text = ''
    try {
      while (true) { const part = await reader.read(); if (part.done) break; total += part.value.byteLength; if (total > 2_000_000) { await reader.cancel(); throw new Error('youtube_invalid_response') } text += decoder.decode(part.value, { stream: true }) }
      const data = JSON.parse(text + decoder.decode())
      if (!data || typeof data !== 'object' || !Array.isArray(data.items)) throw new Error('youtube_invalid_response')
      return data
    } finally { reader.releaseLock() }
  } finally { clearTimeout(timer) }
}
/** At most two 50-item pages per lease; playlist order may differ from publication order. */
export async function discoverYouTubeUploads(source: SermonSource & { scan_cursor?: string | null }, key: string, fetcher: typeof fetch = fetch): Promise<SourceScan> {
  if (!key) throw new Error('youtube_configuration_missing')
  let playlistId = source.resolved_playlist_id || (source.kind === 'youtube_playlist' ? source.source_key : '')
  if (!playlistId) {
    const channels = await youtubeJson('channels', { part: 'contentDetails', ...(source.source_key.startsWith('@') ? { forHandle: source.source_key } : { id: source.source_key }), maxResults: '1' }, key, fetcher)
    playlistId = channels.items[0]?.contentDetails?.relatedPlaylists?.uploads
    if (typeof playlistId !== 'string' || !/^[A-Za-z0-9_-]{10,100}$/.test(playlistId)) throw new Error('youtube_source_unavailable')
  }
  let cursor = source.scan_cursor || null
  const items: DiscoveredUpload[] = [], ids = new Set<string>()
  for (let page = 0; page < 2; page++) {
    const data = await youtubeJson('playlistItems', { part: 'snippet,contentDetails', playlistId, maxResults: '50', ...(cursor ? { pageToken: cursor } : {}) }, key, fetcher)
    for (const raw of data.items.slice(0, 50)) {
      const id = raw?.contentDetails?.videoId, publishedAt = raw?.contentDetails?.videoPublishedAt, title = raw?.snippet?.title
      if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(id) || ids.has(id) || typeof title !== 'string' || !title.trim() || typeof publishedAt !== 'string' || !Number.isFinite(Date.parse(publishedAt))) continue
      ids.add(id)
      items.push({ external_id: id, title: title.slice(0, 500), published_at: new Date(publishedAt).toISOString(), video_url: `https://www.youtube.com/watch?v=${id}`, source_description: typeof raw.snippet.description === 'string' ? raw.snippet.description.slice(0, 5000) : '' })
    }
    cursor = typeof data.nextPageToken === 'string' && data.nextPageToken.length > 0 && data.nextPageToken.length <= 2048 && !/[\u0000-\u001f]/.test(data.nextPageToken) ? data.nextPageToken : null
    if (!cursor) break
  }
  return { items, playlistId, nextCursor: cursor }
}
export async function handleSermonDiscoveryCron(request: Request, deps: AutomationDependencies = {}) {
  const env = deps.env || process.env, secret = env.CRON_SECRET || '', auth = request.headers.get('authorization') || ''
  const expected = Buffer.from(`Bearer ${secret}`), supplied = Buffer.from(auth)
  if (secret.length < 32 || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const caps = automationCapabilities(env)
  if (!caps.discovery_enabled || !caps.youtube_configured) return Response.json({ enabled: false, error: 'Sermon discovery is waiting for configuration' }, { status: 503 })
  try {
    const storage = deps.storage || await defaultStorage(env), sources = await storage.claim(2)
    const results: { sourceId: string; inserted?: number; state: string }[] = []
    for (const source of sources) {
      try {
        const scan = await discoverYouTubeUploads(source, env.YOUTUBE_DATA_API_KEY!, deps.fetch || fetch)
        const result = await storage.complete(source, scan)
        results.push({ sourceId: source.id, inserted: result.inserted, state: result.stale ? 'source_changed' : scan.nextCursor ? 'continuing_archive' : 'checked' })
      } catch (error) {
        const known = ['youtube_quota_or_access', 'youtube_source_unavailable', 'youtube_invalid_response', 'youtube_configuration_missing', 'youtube_cursor_expired']
        const code = error instanceof Error && known.includes(error.message) ? error.message : 'youtube_request_failed'
        await storage.fail(source, code)
        results.push({ sourceId: source.id, state: code })
      }
    }
    return Response.json({ sourcesChecked: sources.length, results, transcriptProcessing: 'not_configured', analysisProcessing: 'not_configured' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return Response.json({ error: 'Sermon discovery storage is unavailable' }, { status: 503 }) }
}
