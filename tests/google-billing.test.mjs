import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const file=fs.readFileSync(new URL('../lib/google-iap-server.ts',import.meta.url),'utf8')
const js=ts.transpileModule(file,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const server=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
test('Google entitlements reject pending, paused, revoked, expired and foreign products',()=>{
  const now=Date.now()
  const lineItems=[{productId:'premium_monthly',expiryTime:new Date(now+60000).toISOString()}]
  for(const subscriptionState of ['SUBSCRIPTION_STATE_PENDING','SUBSCRIPTION_STATE_PAUSED','SUBSCRIPTION_STATE_ON_HOLD','SUBSCRIPTION_STATE_EXPIRED']) assert.equal(server.normalizeGooglePurchase({subscriptionState,lineItems},now).status,'none')
  assert.equal(server.normalizeGooglePurchase({subscriptionState:'SUBSCRIPTION_STATE_ACTIVE',lineItems:[{productId:'other_app',expiryTime:new Date(now+60000).toISOString()}]},now).status,'none')
  assert.equal(server.normalizeGooglePurchase({subscriptionState:'SUBSCRIPTION_STATE_ACTIVE',lineItems},now+120000).status,'none')
})
test('Google active, grace period and cancelled-but-unexpired subscriptions are usable',()=>{
  const now=Date.now()
  for(const subscriptionState of ['SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_IN_GRACE_PERIOD','SUBSCRIPTION_STATE_CANCELED']) assert.equal(server.normalizeGooglePurchase({subscriptionState,lineItems:[{productId:'premium_yearly',expiryTime:new Date(now+60000).toISOString(),autoRenewingPlan:{autoRenewEnabled:false}}]},now).status,'active')
})
test('Google verification is closed when credentials or token are absent',async()=>{
  delete process.env.GOOGLE_PLAY_CLIENT_EMAIL;delete process.env.GOOGLE_PLAY_PRIVATE_KEY
  assert.equal(await server.hasGooglePremium('fake-token-even-when-client-claims-paid'),false)
})
test('Google purchase tokens are stripped before personalization output',()=>{
  const policy=fs.readFileSync(new URL('../lib/entitlements.ts',import.meta.url),'utf8')
  assert.match(policy,/googlePurchaseToken: _googleReceipt/)
  assert.match(policy,/hasGooglePremium\(input.googlePurchaseToken\)/)
})
