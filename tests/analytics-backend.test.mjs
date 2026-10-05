import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

// Exercise the real TS modules without Next, credentials, a live DB, or network calls.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const loaded = new Map()
function load(relative) {
  const filename = path.resolve(root, relative)
  if (loaded.has(filename)) return loaded.get(filename).exports
  const module = { exports: {} }
  loaded.set(filename, module)
  const require = createRequire(filename)
  const scopedRequire = target => target.startsWith('.') && fs.existsSync(path.resolve(path.dirname(filename), target + '.ts'))
    ? load(path.relative(root, path.resolve(path.dirname(filename), target + '.ts'))) : require(target)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(scopedRequire, module, module.exports)
  return module.exports
}
const contract = load('lib/analytics/contract.ts')
const server = load('lib/analytics/server.ts')
const churchId = '11111111-1111-4111-8111-111111111111'
const deviceId = '22222222-2222-4222-8222-222222222222'
const eventId = '33333333-3333-4333-8333-333333333333'
const sessionId = '44444444-4444-4444-8444-444444444444'
const now = Date.parse('2026-10-03T12:00:00Z')
const env = { CHURCH_ANALYTICS_ENABLED: 'true', CHURCH_ANALYTICS_HMAC_SECRET: 'test-only-secret-never-a-real-secret-12345', SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fake-service-key' }
function envelope(extra = {}) { return { version: 1, consentVersion: 1, consentedAt: '2026-10-03T11:00:00Z', churchId, deviceId, ageBand: 'legacy-24-64', events: [{ id: eventId, kind: 'app_open', occurredAt: '2026-10-03T11:01:00Z', sessionId }], ...extra } }
function request(body, method = 'POST', origin = 'https://app.example') { return new Request('https://app.example/api/analytics/events', { method, headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) }) }
function storeFixture() {
  const rows = new Map()
  let erased = false
  let revoked = false
  return {
    rows, get erased() { return erased },
    async churchExists(id) { return id === churchId },
    async sermonsBelongToChurch(id, ids) { return ids.length === 0 },
    async ingest(id, key, events) {
      if (revoked) return { inserted: 0, duplicate: 0, limited: false, revoked: true }
      let inserted = 0
      for (const row of events) if (!rows.has(row.event_id)) { rows.set(row.event_id, row); inserted++ }
      return { inserted, duplicate: events.length - inserted, limited: false }
    },
    async erase() { rows.clear(); erased = true; revoked = true },
  }
}

test('closed schema rejects free text, arbitrary metadata, voice and malformed Scripture', () => {
  const variants = [
    { ...envelope(), email: 'private@example.test' },
    envelope({ events: [{ ...envelope().events[0], question: 'private question' }] }),
    envelope({ events: [{ ...envelope().events[0], kind: 'question_sent', channel: 'voice' }] }),
    envelope({ events: [{ ...envelope().events[0], kind: 'verse_selected', scripture: { book: 43, chapter: 3, verses: [16], translation: 'KJV', text: 'not permitted' } }] }),
    envelope({ events: [{ ...envelope().events[0], kind: 'lifeline_selected', topicId: 'made-up' }] }),
  ]
  for (const value of variants) assert.equal(contract.validateAnalyticsEnvelope(value, now).ok, false)
})

test('structured Bible selections and legacy age bands retain actual resolution', () => {
  const value = envelope({ events: [{ ...envelope().events[0], kind: 'verse_selected', scripture: { book: 43, chapter: 3, verses: [16, 17], translation: 'KJV' } }] })
  assert.deepEqual(contract.validateAnalyticsEnvelope(value, now), { ok: true, value })
  assert.equal(contract.validateAnalyticsEnvelope(envelope({ ageBand: '24-64' }), now).ok, false)
  assert.equal(contract.validateAnalyticsEnvelope(envelope({ ageBand: '13-17' }), now).ok, true)
})

test('rejects events before consent, expired delivery, invalid dates and oversize batches', () => {
  for (const occurredAt of ['2026-10-03T10:59:59Z', '2026-09-01T12:00:00Z', '2026-10-04T12:00:00Z', '2026-02-30T11:00:00Z']) {
    assert.equal(contract.validateAnalyticsEnvelope(envelope({ events: [{ ...envelope().events[0], occurredAt }] }), now).ok, false)
  }
  assert.equal(contract.validateAnalyticsEnvelope(envelope({ events: Array(26).fill(envelope().events[0]) }), now).ok, false)
  assert.equal(contract.validateAnalyticsEnvelope(envelope({ events: [envelope().events[0], envelope().events[0]] }), now).ok, false)
})

test('requires bounded view duration and an actual view identity', () => {
  const event = { ...envelope().events[0], kind: 'foreground_interval', viewId: sessionId, activeMs: 300000 }
  assert.equal(contract.validateAnalyticsEnvelope(envelope({ events: [event] }), now).ok, true)
  for (const activeMs of [0, -1, 300001, Infinity]) assert.equal(contract.validateAnalyticsEnvelope(envelope({ events: [{ ...event, activeMs }] }), now).ok, false)
  assert.equal(contract.validateAnalyticsEnvelope(envelope({ events: [{ ...event, viewId: undefined }] }), now).ok, false)
})

test('HMAC scopes device/session/view keys by church and never stores the raw device identifier', () => {
  const event = { ...envelope().events[0], viewId: sessionId }
  const [row] = server.mapAnalyticsEvents(envelope({ events: [event] }), env.CHURCH_ANALYTICS_HMAC_SECRET)
  assert.match(row.device_key, /^[a-f0-9]{64}$/)
  assert.notEqual(row.device_key, server.analyticsDeviceKey('55555555-5555-4555-8555-555555555555', deviceId, env.CHURCH_ANALYTICS_HMAC_SECRET))
  assert.equal(JSON.stringify(row).includes(deviceId), false)
  assert.equal(JSON.stringify(row).includes(sessionId), false)
  assert.equal(row.age_band, 'legacy-24-64')
})

test('disabled or incomplete config cannot ingest or initialize storage', async () => {
  let called = false
  const storage = { churchExists() { called = true; throw new Error('must not run') } }
  for (const disabled of [{}, { ...env, CHURCH_ANALYTICS_ENABLED: 'false' }, { ...env, CHURCH_ANALYTICS_HMAC_SECRET: 'short' }]) {
    const response = await server.handleAnalyticsEvents(request(envelope()), { env: disabled, storage })
    assert.equal(response.status, 503)
    const config = await server.handleAnalyticsConfig(new Request('https://app.example/api/analytics/config'), { env: disabled })
    assert.equal((await config.json()).enabled, false)
  }
  assert.equal(called, false)
})

test('native origins require exact opt-in and wildcard origins do not authorize callers', async () => {
  const storage = storeFixture()
  const deps = { env, storage, now: () => now }
  assert.equal((await server.handleAnalyticsEvents(request(envelope(), 'POST', 'capacitor://localhost'), deps)).status, 403)
  assert.equal((await server.handleAnalyticsEvents(request(envelope(), 'POST', 'capacitor://localhost'), { ...deps, env: { ...env, CHURCH_ANALYTICS_ALLOWED_ORIGINS: 'capacitor://localhost' } })).status, 202)
  assert.equal((await server.handleAnalyticsEvents(request(envelope(), 'POST', 'https://evil.example'), { ...deps, env: { ...env, CHURCH_ANALYTICS_ALLOWED_ORIGINS: '*' } })).status, 403)
})

test('request byte limit is enforced even without Content-Length', async () => {
  const response = await server.handleAnalyticsEvents(request({ ...envelope(), huge: 'x'.repeat(33000) }), { env, storage: storeFixture(), now: () => now })
  assert.equal(response.status, 413)
})

test('canonical church and sermon ownership are checked before storage', async () => {
  const storage = storeFixture(), deps = { env, storage, now: () => now }
  assert.equal((await server.handleAnalyticsEvents(request(envelope({ churchId: deviceId })), deps)).status, 400)
  assert.equal((await server.handleAnalyticsEvents(request(envelope({ events: [{ ...envelope().events[0], sermonId: sessionId }] })), deps)).status, 400)
  assert.equal(storage.rows.size, 0)
})

test('retry reports duplicate without overwriting the originally stored payload', async () => {
  const storage = storeFixture(), deps = { env, storage, now: () => now }
  assert.deepEqual(await (await server.handleAnalyticsEvents(request(envelope()), deps)).json(), { accepted: 1, duplicate: 0 })
  assert.deepEqual(await (await server.handleAnalyticsEvents(request(envelope({ ageBand: '75+' })), deps)).json(), { accepted: 0, duplicate: 1 })
  assert.equal(storage.rows.get(eventId).age_band, 'legacy-24-64')
})

test('erasure works with collection disabled and delayed revoked requests are rejected', async () => {
  const storage = storeFixture(), deps = { env, storage, now: () => now }
  await server.handleAnalyticsEvents(request(envelope()), deps)
  const response = await server.handleAnalyticsEvents(request({ version: 1, churchId, deviceId }, 'DELETE'), { ...deps, env: { ...env, CHURCH_ANALYTICS_ENABLED: 'false' } })
  assert.equal(response.status, 200)
  assert.equal(storage.erased, true)
  assert.equal(storage.rows.size, 0)
  assert.equal((await server.handleAnalyticsEvents(request(envelope()), deps)).status, 409)
})

test('persistent rate-cap result is surfaced without a success claim or provider details', async () => {
  const storage = storeFixture()
  storage.ingest = async () => ({ inserted: 0, duplicate: 0, limited: true })
  assert.equal((await server.handleAnalyticsEvents(request(envelope()), { env, storage, now: () => now })).status, 429)
  storage.ingest = async () => { throw new Error('provider failure with private context') }
  const response = await server.handleAnalyticsEvents(request(envelope()), { env, storage, now: () => now })
  assert.equal(response.status, 503)
  assert.equal(JSON.stringify(await response.json()).includes('private'), false)
})
