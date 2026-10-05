import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PREFS = 'lifestages_analytics_consent_v1', QUEUE = 'lifestages_analytics_queue_v1'
const churchA = '11111111-1111-4111-8111-111111111111', churchB = '22222222-2222-4222-8222-222222222222'
function browserFixture(initial = {}) {
  const data = new Map(Object.entries(initial).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]))
  const calls = [], timers = new Map(), intervalTimers = new Map(), modules = new Map()
  let timerId = 0, uuidId = 100, clock = Date.parse('2026-10-03T12:00:00.000Z'), elapsed = 0
  let fetchImpl = async () => new Response(JSON.stringify({ accepted: 1, duplicate: 0 }), { status: 202 })
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])) } static now() { return clock } }
  const window = new EventTarget(), document = new EventTarget(), navigator = { onLine: true }
  document.visibilityState = 'visible'; document.hasFocus = () => true
  const context = vm.createContext({
    console, Date: ClockDate, window, document, navigator, Event, AbortController, Response, URL,
    performance: { now: () => elapsed }, crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(uuidId++).padStart(12, '0')}` },
    localStorage: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) },
    setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id }, clearTimeout: id => timers.delete(id),
    setInterval: (fn, ms) => { const id = ++timerId; intervalTimers.set(id, { fn, ms }); return id }, clearInterval: id => intervalTimers.delete(id),
  })
  const apiFetch = async (url, init) => {
    const call = { url, method: init?.method || 'GET', body: init?.body ? JSON.parse(init.body) : null, signal: init?.signal }
    calls.push(call)
    return fetchImpl(call)
  }
  function load(relative) {
    const filename = path.resolve(root, relative)
    if (modules.has(filename)) return modules.get(filename).exports
    const module = { exports: {} }; modules.set(filename, module)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const require = target => target === '../api-base' ? { apiFetch } : load(path.relative(root, path.resolve(path.dirname(filename), target + '.ts')))
    vm.runInContext(`(function(require,module,exports){${code}\n})`, context, { filename })(require, module, module.exports)
    return module.exports
  }
  const client = load('lib/analytics/client.ts')
  return {
    client, data, calls, window, document, navigator, timers, intervalTimers,
    json: key => JSON.parse(data.get(key) || 'null'),
    setFetch: fn => { fetchImpl = fn },
    advance: ms => { clock += ms; elapsed += ms },
    async idle() { await client.flushAnalytics(); await client.flushAnalytics(); await Promise.resolve() },
  }
}
const eventBodies = fixture => fixture.calls.filter(call => call.method === 'POST').map(call => call.body)

test('a successful HTTP response without explicit erasure confirmation retains the deletion capability', async () => {
  for (const body of ['<html>Sign in</html>', '{}', '{"erased":false}']) {
    const f = browserFixture()
    f.client.configureAnalytics(churchA, true); f.client.setAnalyticsConsent(true); await f.idle()
    const original = f.json(PREFS)[churchA].deviceId
    f.setFetch(async () => new Response(body, {status:200}))
    await assert.rejects(f.client.eraseAnalytics(), /Sharing is off/)
    assert.equal(f.json(PREFS)[churchA].deviceId, original)
    assert.equal(f.json(PREFS)[churchA].enabled, false)
  }
})

test('no consent means no identifiers, queued activity, or network event requests', async () => {
  const f = browserFixture()
  f.client.configureAnalytics(churchA, true)
  f.client.track('app_open')
  f.client.track('question_sent', { channel: 'chat' })
  await f.idle()
  assert.equal(f.client.analyticsStatus().enabled, false)
  assert.equal(f.json(PREFS), null)
  assert.deepEqual(f.json(QUEUE), [])
  assert.deepEqual(eventBodies(f), [])
  f.client.configureAnalytics('CHURCH-CODE', true)
  f.client.setAnalyticsConsent(true)
  assert.equal(f.client.analyticsStatus().churchId, null)
  assert.equal(f.json(PREFS), null)
})

test('explicit opt-in sends only permitted age/situation metadata and no profile identity or free text', async () => {
  const f = browserFixture({ userProfile: { firstName: 'Private', email: 'private@example.test', ageRange: 'adult', ageBand: '45-54', stageSituation: 'Struggling', notes: 'private notes' } })
  f.client.configureAnalytics(churchA, true)
  f.client.setAnalyticsConsent(true)
  f.client.track('question_sent', { channel: 'chat' })
  f.client.track('question_sent', { channel: 'chat', question: 'free text must be rejected' })
  await f.idle()
  const bodies = eventBodies(f)
  assert.equal(bodies.length, 2)
  for (const body of bodies) {
    assert.equal(body.ageBand, '45-54')
    assert.equal(body.situation, 'struggling')
    assert.equal(body.churchId, churchA)
    assert.equal(body.consentVersion, 1)
    assert.equal(/private|email|notes|free text|firstName/i.test(JSON.stringify(body)), false)
  }
})

test('legacy age resolution is retained and missing demographics remain missing', async () => {
  for (const [profile, expected] of [[{ ageRange: 'adult' }, 'legacy-24-64'], [{ ageRange: 'university' }, 'legacy-18-23'], [{}, undefined]]) {
    const f = browserFixture({ userProfile: profile })
    f.client.configureAnalytics(churchA, true); f.client.setAnalyticsConsent(true); await f.idle()
    assert.equal(eventBodies(f)[0].ageBand, expected)
    assert.equal(Object.hasOwn(eventBodies(f)[0], 'situation'), false)
    if (!expected) assert.equal(Object.hasOwn(eventBodies(f)[0], 'ageBand'), false)
  }
})

test('network retries reuse identical event/device/session IDs and survive unresolved provider setup', async () => {
  const f = browserFixture()
  f.client.configureAnalytics(churchA, true); f.client.setAnalyticsConsent(true)
  f.setFetch(async () => { throw new Error('offline') })
  await f.idle()
  const queued = f.json(QUEUE)
  assert.equal(queued.length, 1)
  const first = eventBodies(f)[0]
  f.client.configureAnalytics(null, false)
  assert.deepEqual(f.json(QUEUE), queued)
  // Simulate a fresh page with persisted local storage and the provider's initial disabled state.
  const reload = browserFixture(Object.fromEntries(f.data))
  reload.client.configureAnalytics(null, false)
  assert.deepEqual(reload.json(QUEUE), queued)
  reload.client.configureAnalytics(churchA, true)
  await reload.idle()
  assert.deepEqual(eventBodies(reload)[0], first)
  assert.deepEqual(reload.json(QUEUE), [])
})

test('selected church cannot send a previous church queue or inherit its device identity', async () => {
  const f = browserFixture()
  f.client.configureAnalytics(churchA, true); f.client.setAnalyticsConsent(true)
  const a = f.json(QUEUE)[0]
  f.client.configureAnalytics(null, false)
  f.client.configureAnalytics(churchB, true)
  f.client.track('app_open')
  await f.idle()
  assert.deepEqual(eventBodies(f), [])
  assert.deepEqual(f.json(QUEUE), [])
  f.client.setAnalyticsConsent(true); await f.idle()
  assert.ok(eventBodies(f).every(body => body.churchId === churchB))
  assert.notEqual(eventBodies(f)[0].deviceId, a.deviceId)
  assert.notEqual(eventBodies(f)[0].events[0].sessionId, a.events[0].sessionId)
})

test('opting out clears pending activity immediately and prevents future events', async () => {
  const f = browserFixture()
  f.client.configureAnalytics(churchA, true); f.client.setAnalyticsConsent(true)
  assert.equal(f.json(QUEUE).length, 1)
  f.client.setAnalyticsConsent(false)
  f.client.track('app_open'); await f.idle()
  assert.equal(f.client.analyticsStatus().enabled, false)
  assert.equal(f.client.analyticsStatus().hasData, true)
  assert.deepEqual(f.json(QUEUE), [])
  assert.deepEqual(eventBodies(f), [])
})

test('erasure waits for aborted ingestion then deletes using only the correct church/device capability', async () => {
  const f = browserFixture()
  f.client.configureAnalytics(churchA, true); await f.idle(); f.client.setAnalyticsConsent(true)
  const device = f.json(PREFS)[churchA].deviceId
  const order = []
  f.setFetch(call => {
    if (call.method === 'POST') return new Promise((resolve, reject) => {
      call.signal.addEventListener('abort', () => { order.push('post-aborted'); reject(new Error('aborted')) }, { once: true })
    })
    order.push('delete')
    return Promise.resolve(new Response(JSON.stringify({ erased: true }), { status: 200 }))
  })
  const sending = f.client.flushAnalytics()
  await Promise.resolve()
  await f.client.eraseAnalytics()
  await sending
  assert.deepEqual(order, ['post-aborted', 'delete'])
  assert.deepEqual(f.calls.at(-1).body, { version: 1, churchId: churchA, deviceId: device })
  assert.deepEqual(f.json(QUEUE), [])
  assert.equal(f.json(PREFS)[churchA], undefined)
  assert.equal(f.client.analyticsStatus().enabled, false)
})

test('offline erasure retains the deletion capability and disables sharing at every church', async () => {
  const f = browserFixture()
  f.client.configureAnalytics(churchA, true); f.client.setAnalyticsConsent(true)
  f.client.configureAnalytics(churchB, true); f.client.setAnalyticsConsent(true)
  await f.idle()
  f.setFetch(async () => { throw new Error('offline') })
  await assert.rejects(f.client.eraseAllAnalytics(), /Sharing is off/)
  const prefs = f.json(PREFS)
  assert.equal(prefs[churchA].enabled, false)
  assert.equal(prefs[churchB].enabled, false)
  assert.ok(prefs[churchA].deviceId && prefs[churchB].deviceId)
  assert.equal(f.calls.filter(call => call.method === 'DELETE').length, 2)
  assert.deepEqual(f.json(QUEUE), [])
})

test('malformed preferences cannot imply consent or crash opt-in', async () => {
  for (const value of ['"malformed"', '[]', '{"bad-key":{"enabled":true}}']) {
    const f = browserFixture({ [PREFS]: value })
    f.client.configureAnalytics(churchA, true); f.client.track('app_open'); await f.idle()
    assert.equal(eventBodies(f).length, 0)
    f.client.setAnalyticsConsent(true); await f.idle()
    assert.equal(eventBodies(f).length, 1)
  }
})

test('foreground intervals discard pre-consent time and stop after the interaction idle cap', async () => {
  const f = browserFixture()
  f.client.configureAnalytics(churchA, true)
  const stop = f.client.observeForeground({ viewId: '33333333-3333-4333-8333-333333333333', contentType: 'bible' })
  f.advance(10000)
  f.client.setAnalyticsConsent(true)
  f.advance(45000)
  stop(); await f.idle()
  const intervals = eventBodies(f).flatMap(body => body.events).filter(event => event.kind === 'foreground_interval')
  assert.equal(intervals.length, 1)
  assert.equal(intervals[0].activeMs, 30000)
  assert.equal(f.intervalTimers.size, 0)
})
