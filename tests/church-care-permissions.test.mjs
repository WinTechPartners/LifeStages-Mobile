import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = fs.readFileSync(new URL('../lib/church-care-permissions.ts', import.meta.url), 'utf8')
const { outputText, diagnostics } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true })
assert.equal(diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0)
const exports = {}
vm.runInNewContext(outputText, { exports })
const { readChurchCarePermission, updateChurchCarePermission } = exports
const firstChurch = '6544d37d-7e4a-45b6-9886-b3e2ab40aed1'
const secondChurch = '12be2140-935b-47de-8e76-00d300c399ce'
const timestamp = '2026-10-03T10:00:00.000Z'

test('permission is off by default, including malformed or unknown-version entries', () => {
  for (const profile of [null, '{}', '{', '[]', JSON.stringify({ churchCarePermissions: { [firstChurch]: { version: 2, updatedAt: timestamp, allowLeadershipConnection: true } } }), JSON.stringify({ churchCarePermissions: { [firstChurch]: { version: 1, updatedAt: 'invalid', allowLeadershipConnection: true } } })]) {
    assert.equal(readChurchCarePermission(profile, firstChurch).allowLeadershipConnection, false)
    assert.equal(readChurchCarePermission(profile, firstChurch).updatedAt, null)
  }
})

test('saving a permission preserves profile fields and isolates churches by canonical UUID', () => {
  const initial = JSON.stringify({ name: 'Local Profile', churchId: 'church-code', ageRange: '35-44', unrelatedSetting: { enabled: true } })
  const saved = updateChurchCarePermission(initial, firstChurch.toUpperCase(), true, timestamp)
  const parsed = JSON.parse(saved)
  assert.equal(parsed.name, 'Local Profile')
  assert.equal(parsed.churchId, 'church-code')
  assert.equal(parsed.unrelatedSetting.enabled, true)
  assert.deepEqual(parsed.churchCarePermissions[firstChurch], { version: 1, updatedAt: timestamp, allowLeadershipConnection: true })
  assert.equal(readChurchCarePermission(saved, firstChurch).allowLeadershipConnection, true)
  assert.equal(readChurchCarePermission(saved, secondChurch).allowLeadershipConnection, false)
  assert.equal(readChurchCarePermission(saved, 'church-code').allowLeadershipConnection, false)
  assert.throws(() => updateChurchCarePermission(saved, 'church-code', true, timestamp), /resolved church ID/)
})

test('revocation saves false while retaining another church permission', () => {
  let saved = updateChurchCarePermission(null, firstChurch, true, timestamp)
  saved = updateChurchCarePermission(saved, secondChurch, true, timestamp)
  saved = updateChurchCarePermission(saved, firstChurch, false, '2026-10-03T11:00:00.000Z')
  assert.equal(readChurchCarePermission(saved, firstChurch).allowLeadershipConnection, false)
  assert.equal(readChurchCarePermission(saved, firstChurch).updatedAt, '2026-10-03T11:00:00.000Z')
  assert.equal(readChurchCarePermission(saved, secondChurch).allowLeadershipConnection, true)
})

test('a corrupt saved profile is never silently replaced during a permission save', () => {
  for (const raw of ['{', '[]', 'null', JSON.stringify({ name: 'Keep me', churchCarePermissions: [] })]) {
    assert.throws(() => updateChurchCarePermission(raw, firstChurch, true, timestamp))
  }
  assert.throws(() => updateChurchCarePermission('{}', firstChurch, 'yes', timestamp), /Invalid care permission/)
})
