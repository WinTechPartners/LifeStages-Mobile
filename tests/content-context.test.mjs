import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')

function loadTs(path, mocks = {}, globals = {}) {
  const source = fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, reportDiagnostics: true,
  })
  assert.equal(diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0)
  const exports = {}
  vm.runInNewContext(outputText, { exports, require: name => name in mocks ? mocks[name] : require(name), URL, console, ...globals })
  return exports
}

const sermonId = '7ae3fda8-53c9-42b9-8650-ab53dd288a83'
const churchId = '82e63c85-7f5d-4123-bdac-21b994738f09'

test('local content and chat caches isolate church, stable source, age, and language', () => {
  let saved = { churchId: 'profile-code', ageRange: '25-34', stageSituation: 'general' }
  const { contentCacheKey } = loadTs('lib/content-context.ts', {}, { localStorage: { getItem: () => JSON.stringify(saved) } })
  const key = contentCacheKey('reflection', sermonId, churchId, 'en')
  assert.equal(key, contentCacheKey('reflection', sermonId, churchId, 'en'))
  assert.notEqual(key, contentCacheKey('reflection', sermonId, 'another-church', 'en'))
  assert.notEqual(key, contentCacheKey('reflection', 'another-sermon', churchId, 'en'))
  assert.notEqual(key, contentCacheKey('reflection', sermonId, churchId, 'vi'))
  saved = { ...saved, ageRange: '65-74' }
  assert.notEqual(key, contentCacheKey('reflection', sermonId, churchId, 'en'))
  saved = null
  assert.doesNotThrow(() => contentCacheKey('chat', sermonId, churchId, 'en'))
})

test('analytics sermon identity accepts UUIDs only', () => {
  const { optionalUuid } = loadTs('lib/content-context.ts')
  assert.equal(optionalUuid(sermonId.toUpperCase()), sermonId)
  for (const value of ['My Sunday Sermon', 'church-code', 'abcdefghijk', null, '', { id: sermonId }]) assert.equal(optionalUuid(value), undefined)
})

function archive(result) {
  const calls = []
  const query = {
    select(value) { calls.push(['select', value]); return this },
    eq(field, value) { calls.push(['eq', field, value]); return this },
    async limit(value) { calls.push(['limit', value]); return result },
  }
  const { getLastSermonId } = loadTs('lib/church.ts', { './supabase': { supabaseAdmin: {
    from(table) { calls.push(['from', table]); return query },
  } } })
  return { getLastSermonId, calls }
}

test('configured YouTube sermon resolves within its church and never selects latest', async () => {
  const { getLastSermonId, calls } = archive({ data: [{ id: sermonId }], error: null })
  assert.equal(await getLastSermonId({ id: churchId, last_sermon_youtube_url: 'https://youtu.be/aB12cd34EFg' }), sermonId)
  assert.deepEqual(calls, [['from', 'trueteachings_sermons'], ['select', 'id'], ['eq', 'church_id', churchId], ['eq', 'youtube_id', 'aB12cd34EFg'], ['limit', 2]])
})

test('unmatched, ambiguous, unavailable, or unidentified sermons omit attribution', async () => {
  for (const result of [{ data: [], error: null }, { data: [{ id: sermonId }, { id: sermonId }], error: null }, { data: null, error: { message: 'unavailable' } }, { data: [{ id: 'not-a-uuid' }], error: null }]) {
    assert.equal(await archive(result).getLastSermonId({ id: churchId, last_sermon_youtube_id: 'aB12cd34EFg' }), undefined)
  }
  const { getLastSermonId, calls } = archive({ data: [{ id: sermonId }], error: null })
  assert.equal(await getLastSermonId({ id: churchId, last_sermon_title: 'A sermon title' }), undefined)
  assert.equal(calls.some(c => c[0] === 'limit'), false)
})

test('date fallback requires both exact date and title with no contradictory source', async () => {
  const { getLastSermonId, calls } = archive({ data: [{ id: sermonId }], error: null })
  assert.equal(await getLastSermonId({ id: churchId, last_sermon_date: '2026-09-27', last_sermon_title: 'Hope' }), sermonId)
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'sermon_date' && c[2] === '2026-09-27'))
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'title' && c[2] === 'Hope'))
  assert.equal(await getLastSermonId({ id: churchId, last_sermon_date: '2026-09-27', last_sermon_title: 'Hope', last_sermon_youtube_url: 'https://example.invalid/not-youtube' }), undefined)
})

test('display telemetry waits for actual content, counts cache hits once, and contains no text', () => {
  let effect, retainedRef
  const events = []
  const { useContentDisplay } = loadTs('lib/use-content-display.ts', {
    react: { useRef: value => retainedRef ||= { current: value }, useEffect: callback => { effect = callback } },
    '@/lib/analytics/client': { track: (kind, fields) => events.push({ kind, ...fields }) },
  }, { crypto: { randomUUID: () => 'f76069bc-e416-40ec-97ba-152a40c14d01' } })
  useContentDisplay(false, 'cache-a', 'reflection', sermonId); effect()
  assert.equal(events.length, 0)
  useContentDisplay(true, 'cache-a', 'reflection', sermonId); effect()
  useContentDisplay(true, 'cache-a', 'reflection', sermonId); effect()
  assert.equal(events.length, 1)
  useContentDisplay(true, 'cache-b', 'reflection', sermonId); effect()
  assert.equal(events.length, 2)
  assert.deepEqual(Object.keys(events[0]).sort(), ['kind', 'contentType', 'viewId', 'sermonId'].sort())
})
