import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const source = fs.readFileSync(new URL('../lib/native-iap.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const monthly = 'com.lifestagesai.bible.premium.monthly'
const entitlement = overrides => ({ isActive: true, productIdentifier: monthly, expirationDate: '2099-01-01T00:00:00Z', periodType: 'TRIAL', willRenew: true, ...overrides })
const info = value => ({ entitlements: { active: value ? { premium: value } : {} } })
const offering = { current: { availablePackages: [{ identifier: '$rc_monthly', offeringIdentifier: 'default', product: { identifier: monthly, title: 'Monthly', description: 'Access', price: 129000, priceString: '129.000 ₫', currencyCode: 'VND' } }] } }
function fixture({ native = true, env = { NODE_ENV: 'test', NEXT_PUBLIC_REVENUECAT_IOS_API_KEY: 'appl_fixture' }, active = entitlement(), fail = false } = {}) {
  const calls = [], stored = new Map(), module = { exports: {} }
  const sdk = {
    async setup(options) { calls.push(['setup', options]) },
    async getOfferings() { calls.push(['offerings']); return { offerings: offering } },
    async getCustomerInfo() { calls.push(['customer']); return { customerInfo: info(active) } },
    async restorePurchases() { calls.push(['restore']); return { customerInfo: info(active) } },
    async purchasePackage(options) { calls.push(['purchase', options]); if (fail) throw new Error('unconfirmed'); return { customerInfo: info(active) } },
  }
  const require = name => name === './native-features' ? { isNative: () => native, getPlatform: () => native ? 'ios' : 'web' } : name === '@capgo/capacitor-purchases' ? { CapacitorPurchases: sdk } : (() => { throw new Error('unexpected import') })()
  const localStorage = { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) }
  new Function('require', 'module', 'exports', 'process', 'localStorage', compiled)(require, module, module.exports, { env }, localStorage)
  return { adapter: module.exports, calls, stored }
}

test('matches the installed setup/offerings SDK and preserves native localized prices exactly', async () => {
  const f = fixture()
  const products = await f.adapter.getProducts()
  assert.equal(products[0].price, '129.000 ₫')
  assert.equal(products[0].priceAmount, 129000)
  assert.equal(products[0].currency, 'VND')
  assert.deepEqual(f.calls[0], ['setup', { apiKey: 'appl_fixture', collectDeviceIdentifiers: false, enableAdServicesAttribution: false }])
})

test('subscription lookup reads customer info without a restore prompt and preserves trial/renewal state', async () => {
  const f = fixture({ active: entitlement({ willRenew: false }) })
  const result = await f.adapter.getSubscriptionInfo()
  assert.equal(result.status, 'trialing')
  assert.equal(result.willRenew, false)
  assert.equal(f.calls.some(call => call[0] === 'restore'), false)
  assert.equal(f.calls.some(call => call[0] === 'customer'), true)
})

test('expired, unknown-product and inactive entitlements do not grant access', () => {
  const f = fixture()
  for (const invalid of [entitlement({ expirationDate: '2000-01-01T00:00:00Z' }), entitlement({ expirationDate: 'invalid' }), entitlement({ productIdentifier: 'another-app-product' }), entitlement({ isActive: false })]) {
    assert.equal(f.adapter.subscriptionFromCustomerInfo(info(invalid)).status, 'none')
  }
})

test('purchase uses an actual offering package and requires an active returned entitlement', async () => {
  const f = fixture()
  assert.equal(await f.adapter.purchaseProduct(monthly), true)
  assert.deepEqual(f.calls.find(call => call[0] === 'purchase'), ['purchase', { identifier: '$rc_monthly', offeringIdentifier: 'default' }])
  const unconfirmed = fixture({ active: null })
  assert.equal(await unconfirmed.adapter.purchaseProduct(monthly), false)
  const failed = fixture({ fail: true })
  await assert.rejects(failed.adapter.purchaseProduct(monthly), /could not confirm/)
})

test('missing native configuration and production web mocks cannot silently grant subscriptions', async () => {
  const unconfigured = fixture({ env: {} })
  assert.equal(await unconfigured.adapter.initializeIAP(), false)
  assert.deepEqual(await unconfigured.adapter.getProducts(), [])
  assert.equal(unconfigured.calls.length, 0)
  const web = fixture({ native: false, env: { NODE_ENV: 'production', NEXT_PUBLIC_IAP_DEMO_MODE: 'true' } })
  web.stored.set('iap_mock_status', JSON.stringify({ status: 'active', productId: monthly, expiresAt: Date.parse('2099-01-01') }))
  assert.equal(await web.adapter.purchaseProduct(monthly), false)
  assert.equal((await web.adapter.getSubscriptionInfo()).status, 'none')
  assert.deepEqual(await web.adapter.getProducts(), [])
})
