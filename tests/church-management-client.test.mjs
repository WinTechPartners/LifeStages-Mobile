import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
function load(file, mocks = {}) {
  const { outputText, diagnostics } = ts.transpileModule(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true })
  assert.equal(diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0)
  const exports = {}
  vm.runInNewContext(outputText, { exports, require: key => { if (key in mocks) return mocks[key]; throw Error('Unexpected dependency: ' + key) }, URL, URLSearchParams, console })
  return exports
}
const church = { id: '6544d37d-7e4a-45b6-9886-b3e2ab40aed1', slug: 'demo-church', name: 'Demonstration Church' }

test('new-sermon form payload is accepted without an empty edition ID', () => {
  const client = load('lib/church-management-client.ts', { './api-base': {} })
  const { validateChurchManagementRequest } = load('lib/church-management/contract.ts', { '../sermon-automation/contract': load('lib/sermon-automation/contract.ts') })
  const request = client.sermonPublishRequest({ title: ' Hope ', sermon_date: '2026-10-04', scripture: 'John 15:1-8', summary: 'A sermon summary', video_url: '', transcript: '', source_sermon_id: '' })
  assert.equal(validateChurchManagementRequest(request).ok, true)
  assert.equal('source_sermon_id' in request.sermon, false)
  assert.equal(request.sermon.title, 'Hope')
  const revision = client.sermonPublishRequest({ ...request.sermon, source_sermon_id: church.id })
  assert.equal(validateChurchManagementRequest(revision).ok, true)
  assert.equal(revision.sermon.source_sermon_id, church.id)
})

test('management reads and saves use the agreed endpoint with in-memory bearer authorization', async () => {
  const calls = []
  const client = load('lib/church-management-client.ts', { './api-base': { apiFetch: async (path, options) => { calls.push({ path, options }); return { ok: true, status: 200, json: async () => ({ church, sermons: [] }) } } } })
  await client.requestChurchManagement({ action: 'read' }, 'memory-token')
  await client.requestChurchManagement({ action: 'update_church', updates: { name: church.name } }, 'memory-token')
  assert.equal(calls[0].path, '/api/church/manage')
  assert.equal(calls[0].options.method, 'GET')
  assert.equal(calls[0].options.body, undefined)
  assert.equal(calls[0].options.headers.Authorization, 'Bearer memory-token')
  assert.equal(calls[0].options.cache, 'no-store')
  assert.equal(calls[1].options.method, 'POST')
  assert.equal(JSON.parse(calls[1].options.body).action, 'update_church')
})

test('disabled service, expired session, and malformed success cannot masquerade as saved changes', async () => {
  for (const [status, data, expected] of [[503, { error: 'Church management is not enabled' }, /not enabled/], [401, { error: 'Session expired' }, /expired/], [200, { success: true }, /could not be confirmed/]]) {
    const client = load('lib/church-management-client.ts', { './api-base': { apiFetch: async () => ({ ok: status === 200, status, json: async () => data }) } })
    await assert.rejects(client.requestChurchManagement({ action: 'read' }, 'memory-token'), expected)
  }
})

test('member connection link uses the configured app origin and safely encodes the church code', () => {
  const { memberConnectionUrl } = load('lib/church-management-client.ts', { './api-base': {} })
  assert.equal(memberConnectionUrl('demo-church', 'http://localhost:3000', 'https://app.example.test'), 'https://app.example.test/connect?church=demo-church')
  assert.equal(memberConnectionUrl('other-church', 'https://current.example.test'), 'https://current.example.test/connect?church=other-church')
  assert.equal(memberConnectionUrl('unsafe & code', 'https://current.example.test'), 'https://current.example.test/connect?church=unsafe+%26+code')
  assert.equal(memberConnectionUrl('demo', 'capacitor://localhost'), '')
  assert.equal(memberConnectionUrl('demo', 'https://current.example.test', 'not a URL'), '')
})

test('invitation secrets are consumed from fragments and removed from every URL location', () => {
  const { consumeManagementInvitation } = load('lib/church-management-client.ts', { './api-base': {} })
  const token = 'a'.repeat(43)
  const fragment = consumeManagementInvitation(`https://app.example.test/church/manage?church=demo#invite=${token}`)
  assert.equal(fragment.token, token)
  assert.equal(fragment.cleanUrl, '/church/manage?church=demo')
  assert.equal(fragment.hadToken, true)
  const legacy = consumeManagementInvitation(`https://app.example.test/church/manage?invite=${token}&church=demo#help`)
  assert.equal(legacy.token, token)
  assert.equal(legacy.cleanUrl, '/church/manage?church=demo#help')
  const both = consumeManagementInvitation(`https://app.example.test/church/manage?invite=old#invite=${token}&section=welcome`)
  assert.equal(both.token, token)
  assert.equal(both.cleanUrl, '/church/manage#section=welcome')
  const none = consumeManagementInvitation('https://app.example.test/church/manage#help')
  assert.equal(none.hadToken, false)
  assert.equal(none.token, '')
})

test('source settings use the exact supported automation contract', () => {
  const { validateChurchManagementRequest } = load('lib/church-management/contract.ts', { '../sermon-automation/contract': load('lib/sermon-automation/contract.ts') })
  for (const source of [
    { kind: 'youtube_channel', source_url: 'https://www.youtube.com/@examplechurch', enabled: true },
    { kind: 'youtube_playlist', source_url: 'https://www.youtube.com/playlist?list=PL1234567890abcdefgh', enabled: false },
  ]) assert.equal(validateChurchManagementRequest({ action: 'save_sermon_source', source }).ok, true)
  assert.equal(validateChurchManagementRequest({ action: 'save_sermon_source', source: { kind: 'rss', source_url: 'https://example.test/feed.xml', enabled: true } }).ok, false)
})
