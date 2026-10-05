import test from 'node:test'
import assert from 'node:assert/strict'
import { pbkdf2Sync, createHash } from 'node:crypto'
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
const server = load('lib/church-management/server.ts'), contract = load('lib/church-management/contract.ts')
const churchId = '11111111-1111-4111-8111-111111111111', otherChurch = '22222222-2222-4222-8222-222222222222', adminId = '33333333-3333-4333-8333-333333333333'
const now = Date.parse('2026-10-03T12:00:00Z'), password = 'fixture-password-123!'
const salt = '0123456789abcdef0123456789abcdef', legacyHash = `${salt}:${pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')}`
const env = { CHURCH_MANAGEMENT_ENABLED: 'true', CHURCH_ADMIN_SESSION_SECRET: 'fixture-only-not-a-real-secret-1234567890', SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fake' }
const baseChurch = { id: churchId, slug: 'sample-church', name: 'Sample Church', logo_url: null, primary_color: '#123456', secondary_color: '#abcdef', welcome_message: null, leadership_contact_name: null, leadership_contact_email: null, leadership_contact_phone: null, leadership_contact_url: null }
function fixture(role = 'owner') {
  const church = { ...baseChurch }, admin = { id: adminId, church_id: churchId, email: 'leader@example.test', name: 'Leader', role, password_hash: legacyHash }
  const sermons = [], writes = [], invites = []
  let attempts = true, invitationUsed = false
  const storage = {
    async consumeAttempt() { return attempts },
    async loginRecord(slug, email) { return slug === church.slug && email === admin.email ? { church, admin } : null },
    async adminById(id, cid) { return id === admin.id && cid === admin.church_id ? admin : null },
    async churchById(id) { return id === churchId ? church : null },
    async sermons(id) { assert.equal(id, churchId); return [...sermons] },
    async updateChurch(id, updates) { writes.push({ id, updates }); Object.assign(church, updates) },
    async publish(id, aid, draft) {
      assert.equal(id, churchId); assert.equal(aid, adminId)
      if (draft.source_sermon_id && !sermons.some(item => item.id === draft.source_sermon_id)) return null
      const edition = { ...draft, id: `44444444-4444-4444-8444-${String(sermons.length).padStart(12, '0')}`, church_id: id, published_at: new Date(now).toISOString(), published_by: aid, analysis_status: 'not_analyzed' }
      sermons.unshift(edition); return edition
    },
    async acceptInvite(input) {
      invites.push(input)
      if (invitationUsed || input.email !== admin.email || input.tokenHash !== createHash('sha256').update('A'.repeat(43)).digest('hex')) return null
      invitationUsed = true; admin.password_hash = input.passwordHash; return { church, admin }
    },
  }
  return { church, admin, sermons, writes, invites, storage, deps: { env, storage, now: () => now }, limit() { attempts = false } }
}
function request(body, token, method = 'POST') {
  return new Request('https://app.example/api/church/manage', { method, headers: { Origin: 'https://app.example', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
}
const login = { action: 'login', slug: 'sample-church', email: 'leader@example.test', password }
const draft = { title: 'Hope in ordinary life', sermon_date: '2026-10-03', scripture: 'Psalm 23', summary: 'A pastoral reflection.', video_url: 'https://example.test/sermon' }

test('supports existing password hashes and stronger new hashes without plaintext storage', async () => {
  assert.equal(await server.verifyManagementPassword(password, legacyHash), true)
  assert.equal(await server.verifyManagementPassword('wrong', legacyHash), false)
  const hash = await server.hashManagementPassword(password)
  assert.match(hash, /^scrypt-v1\$/)
  assert.equal(hash.includes(password), false)
  assert.equal(await server.verifyManagementPassword(password, hash), true)
  assert.equal(await server.verifyManagementPassword('wrong', hash), false)
})

test('login returns a one-hour signed session and safe dashboard fields only', async () => {
  const f = fixture(), result = await server.handleChurchManagement(request(login), f.deps)
  assert.equal(result.status, 200)
  const body = await result.json()
  assert.equal(Date.parse(body.expiresAt) - now, 3600000)
  assert.equal(body.admin.role, 'owner')
  assert.equal(JSON.stringify(body).includes('password'), false)
  assert.equal(JSON.stringify(body).includes(legacyHash), false)
  const session = server.verifyChurchSession(body.token, env.CHURCH_ADMIN_SESSION_SECRET, now)
  assert.equal(session.churchId, churchId)
  assert.equal(server.verifyChurchSession(body.token + 'x', env.CHURCH_ADMIN_SESSION_SECRET, now), null)
  assert.equal(server.verifyChurchSession(body.token, env.CHURCH_ADMIN_SESSION_SECRET, now + 3600000), null)
})

test('bad credentials, unknown churches, unsigned reads and rate limits are rejected', async () => {
  const f = fixture()
  assert.equal((await server.handleChurchManagement(request({ ...login, password: 'wrong' }), f.deps)).status, 401)
  assert.equal((await server.handleChurchManagement(request({ ...login, slug: 'unknown-church' }), f.deps)).status, 401)
  assert.equal((await server.handleChurchManagement(request(null, null, 'GET'), f.deps)).status, 401)
  f.limit()
  assert.equal((await server.handleChurchManagement(request(login), f.deps)).status, 429)
})

test('sessions are tenant-bound, check current role, and expire on password change', async () => {
  const f = fixture(), token = server.issueChurchSession(f.admin, env.CHURCH_ADMIN_SESSION_SECRET, now).token
  const update = { action: 'update_church', updates: { name: 'New church name' } }
  assert.equal((await server.handleChurchManagement(request(update, token), f.deps)).status, 200)
  assert.equal(f.writes[0].id, churchId)
  assert.equal((await server.handleChurchManagement(request({ ...update, churchId: otherChurch }, token), f.deps)).status, 400)
  f.admin.role = 'viewer'
  assert.equal((await server.handleChurchManagement(request(update, token), f.deps)).status, 403)
  assert.equal((await server.handleChurchManagement(request(null, token, 'GET'), f.deps)).status, 200)
  f.admin.password_hash = await server.hashManagementPassword('a new secure password')
  assert.equal((await server.handleChurchManagement(request(null, token, 'GET'), f.deps)).status, 401)
})

test('branding accepts safe contact fields and rejects privilege/tenant injection or unsafe URLs/colors', () => {
  assert.equal(contract.validateChurchManagementRequest({ action: 'update_church', updates: { primary_color: '#AAbb00', leadership_contact_email: 'care@example.test', leadership_contact_phone: '+1 (800) 555-0123', welcome_message: 'Welcome.' } }).ok, true)
  for (const updates of [{ id: otherChurch }, { tier: 'paid' }, { role: 'owner' }, { primary_color: 'red' }, { primary_color: '#123' }, { logo_url: 'javascript:alert(1)' }, { leadership_contact_url: 'https://user:password@example.test' }, { leadership_contact_email: 'invalid' }]) {
    assert.equal(contract.validateChurchManagementRequest({ action: 'update_church', updates }).ok, false)
  }
})

test('sermon revisions append new canonical editions and retain the original text', async () => {
  const f = fixture(), token = server.issueChurchSession(f.admin, env.CHURCH_ADMIN_SESSION_SECRET, now).token
  const firstResponse = await server.handleChurchManagement(request({ action: 'publish_sermon', sermon: draft }, token), f.deps)
  assert.equal(firstResponse.status, 201)
  const first = (await firstResponse.json()).sermon
  const secondResponse = await server.handleChurchManagement(request({ action: 'publish_sermon', sermon: { ...draft, title: 'Revised title', source_sermon_id: first.id } }, token), f.deps)
  const second = (await secondResponse.json()).sermon
  assert.notEqual(second.id, first.id)
  assert.equal(second.source_sermon_id, first.id)
  assert.equal(f.sermons.length, 2)
  assert.equal(f.sermons[1].title, draft.title)
  assert.equal(second.analysis_status, 'not_analyzed')
  assert.equal((await server.handleChurchManagement(request({ action: 'publish_sermon', sermon: { ...draft, source_sermon_id: otherChurch } }, token), f.deps)).status, 400)
})

test('sermon validation rejects impossible dates, caller-chosen IDs and oversized transcripts', () => {
  for (const sermon of [{ ...draft, sermon_date: '2026-02-30' }, { ...draft, id: otherChurch }, { ...draft, transcript: 'x'.repeat(100001) }, { ...draft, video_url: 'http://example.test' }, { ...draft, summary: 'x'.repeat(10001) }]) {
    assert.equal(contract.validateChurchManagementRequest({ action: 'publish_sermon', sermon }).ok, false)
  }
})

test('invitation acceptance is email-bound and passes only hashes into atomic storage', async () => {
  const f = fixture(), accept = { action: 'accept_invite', inviteToken: 'A'.repeat(43), email: 'leader@example.test', password, name: 'Leader', slug: 'sample-church', churchName: 'Sample Church' }
  const result = await server.handleChurchManagement(request(accept), f.deps)
  assert.equal(result.status, 200)
  assert.equal(f.invites[0].tokenHash, createHash('sha256').update(accept.inviteToken).digest('hex'))
  assert.equal(f.invites[0].passwordHash.includes(password), false)
  assert.equal(Object.hasOwn(f.invites[0], 'inviteToken'), false)
  assert.equal(Object.hasOwn(f.invites[0], 'password'), false)
  assert.equal((await server.handleChurchManagement(request(accept), f.deps)).status, 400)
  const g = fixture()
  assert.equal((await server.handleChurchManagement(request({ ...accept, email: 'other@example.test' }), g.deps)).status, 400)
  assert.equal(contract.validateChurchManagementRequest({ ...accept, inviteToken: undefined }).ok, false)
})

test('disabled management performs no storage operation and wrong origins are rejected', async () => {
  const f = fixture()
  f.storage.consumeAttempt = () => { throw new Error('must never run') }
  assert.equal((await server.handleChurchManagement(request(login), { ...f.deps, env: {} })).status, 503)
  const external = new Request('https://app.example/api/church/manage', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: JSON.stringify(login) })
  assert.equal((await server.handleChurchManagement(external, f.deps)).status, 403)
})

test('source connection uses the authenticated church and never accepts a caller-provided tenant', async () => {
  const f = fixture(), token = server.issueChurchSession(f.admin, env.CHURCH_ADMIN_SESSION_SECRET, now).token
  const saves = []
  f.storage.saveSource = async (...args) => { saves.push(args) }
  const body = { action: 'save_sermon_source', source: { kind: 'youtube_playlist', source_url: 'https://youtube.com/playlist?list=PL12345678901', enabled: true } }
  assert.equal((await server.handleChurchManagement(request(body, token), f.deps)).status, 200)
  assert.equal(saves[0][0], churchId)
  assert.equal(saves[0][1], adminId)
  assert.equal((await server.handleChurchManagement(request({ ...body, churchId: otherChurch }, token), f.deps)).status, 400)
  f.admin.role = 'viewer'
  assert.equal((await server.handleChurchManagement(request(body, token), f.deps)).status, 403)
  assert.equal(saves.length, 1)
})
