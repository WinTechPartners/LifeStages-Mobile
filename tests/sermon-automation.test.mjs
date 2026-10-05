import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), loaded = new Map()
function load(relative) {
  const filename = path.resolve(root, relative)
  if (loaded.has(filename)) return loaded.get(filename).exports
  const module = { exports: {} }; loaded.set(filename, module)
  const require = createRequire(filename)
  const scoped = target => target.startsWith('.') && fs.existsSync(path.resolve(path.dirname(filename), target + '.ts')) ? load(path.relative(root, path.resolve(path.dirname(filename), target + '.ts'))) : require(target)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(scoped, module, module.exports)
  return module.exports
}
const server = load('lib/sermon-automation/server.ts'), contract = load('lib/sermon-automation/contract.ts')
const churchId = '11111111-1111-4111-8111-111111111111', sourceId = '22222222-2222-4222-8222-222222222222', leaseId = '33333333-3333-4333-8333-333333333333'
const env = { SERMON_DISCOVERY_ENABLED: 'true', CRON_SECRET: 'test-cron-secret-not-real-1234567890', YOUTUBE_DATA_API_KEY: 'fixture-key', SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service' }
const source = { id: sourceId, church_id: churchId, kind: 'youtube_playlist', source_url: 'https://www.youtube.com/playlist?list=PL12345678901', source_key: 'PL12345678901', resolved_playlist_id: null, enabled: true, last_checked_at: null, next_check_at: null, backfill_complete: false, backfill_count: 0, sync_status: 'pending', last_error_code: null, lease_id: leaseId, scan_cursor: null }
const rawItem = n => ({ contentDetails: { videoId: `vid${String(n).padStart(8, '0')}`, videoPublishedAt: '2026-09-27T10:00:00Z' }, snippet: { title: `Source video ${n}`, description: `Original uploader description ${n}` } })
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }) }
function request(secret = env.CRON_SECRET) { return new Request('https://app.example/api/cron/sync-sermons', { headers: { Authorization: `Bearer ${secret}` } }) }
function fixture() {
  const rows = new Map(), saves = [], failures = [], calls = []
  const store = {
    async state() { return { source: { ...source }, counts: { discovered: rows.size, transcript_pending: rows.size, analysis_pending: rows.size } } },
    async save(...args) { saves.push(args) },
    async latest() { return [...rows.values()][0] || null },
    async claim(limit) { calls.push(limit); return [{ ...source }] },
    async complete(s, scan) {
      let inserted = 0
      for (const item of scan.items) if (!rows.has(item.external_id)) { rows.set(item.external_id, { ...item, id: `44444444-4444-4444-8444-${String(rows.size).padStart(12, '0')}`, church_id: s.church_id, transcript_status: 'pending', analysis_status: 'pending' }); inserted++ }
      return { inserted, stale: false }
    },
    async fail(s, code) { failures.push(code) },
  }
  return { store, rows, saves, failures, calls }
}

test('only canonical YouTube channel/playlist sources are accepted; arbitrary hosts cannot be fetched', () => {
  for (const url of ['https://127.0.0.1/admin', 'https://youtube.com.evil.test/@church', 'http://youtube.com/@church', 'https://user:secret@youtube.com/@church', 'https://youtube.com:8443/@church', 'https://example.test/sermons.xml']) {
    assert.equal(contract.validateSermonSource({ kind: 'youtube_channel', source_url: url, enabled: true }).ok, false)
  }
  const result = contract.validateSermonSource({ kind: 'youtube_channel', source_url: 'https://youtube.com/@sample-church/videos?tracking=discard', enabled: true })
  assert.equal(result.ok, true)
  assert.equal(result.value.source_url, 'https://www.youtube.com/@sample-church')
  assert.equal(result.sourceKey, '@sample-church')
  assert.equal(contract.validateSermonSource({ ...source, church_id: churchId }).ok, false)
})

test('saving source settings records a job without a live provider request', async () => {
  const f = fixture()
  await server.saveSermonSourceForChurch(churchId, leaseId, { kind: 'youtube_playlist', source_url: source.source_url, enabled: true }, { env, storage: f.store, fetch: () => { throw new Error('must not fetch') } })
  assert.equal(f.saves.length, 1)
  assert.equal(f.saves[0][0], churchId)
  assert.equal(f.saves[0][3], 'PL12345678901')
})

test('first scan is bounded to two pages/100 records and preserves continuation for larger archives', async () => {
  const requests = []
  const fetch = async url => {
    requests.push(new URL(url))
    return requests.length === 1
      ? json({ items: Array.from({ length: 50 }, (_, n) => rawItem(n)), nextPageToken: 'second-page' })
      : json({ items: Array.from({ length: 50 }, (_, n) => rawItem(n + 50)), nextPageToken: 'third-page+/opaque' })
  }
  const scan = await server.discoverYouTubeUploads(source, 'fixture-key', fetch)
  assert.equal(requests.length, 2)
  assert.equal(requests[0].origin, 'https://www.googleapis.com')
  assert.equal(requests[0].searchParams.get('maxResults'), '50')
  assert.equal(requests[1].searchParams.get('pageToken'), 'second-page')
  assert.equal(scan.items.length, 100)
  assert.equal(scan.nextCursor, 'third-page+/opaque')
  assert.equal(scan.items[0].source_description, 'Original uploader description 0')
  assert.equal(Object.hasOwn(scan.items[0], 'summary'), false)
  assert.equal(Object.hasOwn(scan.items[0], 'transcript'), false)
})

test('channel handle resolves its uploads playlist and resumed jobs use the persisted cursor', async () => {
  const calls = []
  const fetch = async url => {
    const parsed = new URL(url); calls.push(parsed)
    return parsed.pathname.endsWith('/channels') ? json({ items: [{ contentDetails: { relatedPlaylists: { uploads: 'UU12345678901' } } }] }) : json({ items: [rawItem(1)] })
  }
  const scan = await server.discoverYouTubeUploads({ ...source, kind: 'youtube_channel', source_key: '@sample-church', scan_cursor: 'saved-cursor' }, 'key', fetch)
  assert.equal(calls[0].searchParams.get('forHandle'), '@sample-church')
  assert.equal(calls[1].searchParams.get('playlistId'), 'UU12345678901')
  assert.equal(calls[1].searchParams.get('pageToken'), 'saved-cursor')
  assert.equal(scan.items.length, 1)
})

test('malformed, undated or duplicated source entries do not create invented sermon records', async () => {
  const scan = await server.discoverYouTubeUploads(source, 'key', async () => json({ items: [rawItem(1), rawItem(1), { snippet: { title: 'Private video' }, contentDetails: { videoId: 'vid00000002' } }, { ...rawItem(3), contentDetails: { videoId: 'bad-id', videoPublishedAt: 'invalid' } }] }))
  assert.equal(scan.items.length, 1)
  assert.equal(scan.items[0].published_at, '2026-09-27T10:00:00.000Z')
})

test('cron requires the actual configured bearer secret and does not trust a scheduler header', async () => {
  const f = fixture(), deps = { env, storage: f.store, fetch: () => { throw new Error('must not fetch') } }
  assert.equal((await server.handleSermonDiscoveryCron(request('wrong'), deps)).status, 401)
  assert.equal((await server.handleSermonDiscoveryCron(new Request('https://app.example/api/cron/sync-sermons', { headers: { 'x-vercel-cron': '1' } }), deps)).status, 401)
  assert.equal((await server.handleSermonDiscoveryCron(request(), { ...deps, env: { ...env, YOUTUBE_DATA_API_KEY: '' } })).status, 503)
  assert.equal(f.calls.length, 0)
})

test('discovery retries preserve stable publication IDs and pending transcript/analysis states', async () => {
  const f = fixture(), deps = { env, storage: f.store, fetch: async () => json({ items: [rawItem(1)] }) }
  assert.equal((await server.handleSermonDiscoveryCron(request(), deps)).status, 200)
  const firstId = f.rows.get('vid00000001').id
  const second = await (await server.handleSermonDiscoveryCron(request(), deps)).json()
  assert.equal(f.rows.size, 1)
  assert.equal(second.results[0].inserted, 0)
  assert.equal(f.rows.get('vid00000001').id, firstId)
  assert.equal(f.rows.get('vid00000001').transcript_status, 'pending')
  assert.equal(f.rows.get('vid00000001').analysis_status, 'pending')
  assert.equal(second.analysisProcessing, 'not_configured')
  assert.ok(f.calls.every(limit => limit === 2))
})

test('failed polling preserves the last good archive and only emits a bounded failure code', async () => {
  const f = fixture()
  await server.handleSermonDiscoveryCron(request(), { env, storage: f.store, fetch: async () => json({ items: [rawItem(1)] }) })
  const response = await server.handleSermonDiscoveryCron(request(), { env, storage: f.store, fetch: async () => { throw new Error('secret provider message') } })
  const result = await response.json()
  assert.equal(f.rows.size, 1)
  assert.equal(result.results[0].state, 'youtube_request_failed')
  assert.equal(JSON.stringify(result).includes('secret provider'), false)
  assert.deepEqual(f.failures, ['youtube_request_failed'])
})

test('source status exposes missing configuration without suggesting a transcript processor exists', async () => {
  const f = fixture()
  const state = await server.getSermonAutomationForChurch(churchId, { env: {}, storage: f.store })
  assert.equal(state.source.sync_status, 'waiting_configuration')
  assert.equal(state.capabilities.discovery_enabled, false)
  assert.equal(state.capabilities.processor_configured, false)
})

test('expired continuation is classified for cursor-only recovery and the next attempt restarts safely', async () => {
  const f = fixture()
  let savedCursor = 'expired-token'
  const requests = []
  const storedPlaylist = 'PL12345678901'
  f.store.claim = async () => [{ ...source, scan_cursor: savedCursor, resolved_playlist_id: storedPlaylist }]
  f.store.fail = async (s, code) => { f.failures.push(code); if (code === 'youtube_cursor_expired') savedCursor = null }
  const fetch = async url => {
    const request = new URL(url); requests.push(request)
    return request.searchParams.has('pageToken') ? json({ error: { message: 'invalid page token' } }, 400) : json({ items: [rawItem(1)] })
  }
  const failed = await (await server.handleSermonDiscoveryCron(request(), { env, storage: f.store, fetch })).json()
  assert.equal(failed.results[0].state, 'youtube_cursor_expired')
  assert.equal(savedCursor, null)
  await server.handleSermonDiscoveryCron(request(), { env, storage: f.store, fetch })
  assert.equal(requests[0].searchParams.get('pageToken'), 'expired-token')
  assert.equal(requests[1].searchParams.has('pageToken'), false)
  assert.equal(requests[1].searchParams.get('playlistId'), storedPlaylist)
  assert.equal(f.rows.size, 1)
  // A source-level 400 without a cursor must remain a source error, not cursor recovery.
  await assert.rejects(server.discoverYouTubeUploads(source, 'key', async () => json({ error: {} }, 400)), /youtube_source_unavailable/)
})
