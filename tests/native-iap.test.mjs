import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const source=fs.readFileSync(new URL('../lib/native-iap.ts',import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const monthly='001'
const active={status:'active',productId:monthly,expiresAt:Date.parse('2099-01-01'),isTrialing:false,willRenew:true,signedTransaction:'verified-by-native-storekit'}
function fixture({native=true,available=true,outcome='purchased',subscription=active,configured=true}={}) {
  const calls=[],module={exports:{}}
  const bridge={
    async getProducts(){return {products:[{id:monthly,price:'129.000 ₫',priceAmount:129000,currency:'VND',period:'monthly'}]}},
    async getSubscription(){calls.push('read');return subscription},
    async restore(){calls.push('restore');return subscription},
    async purchase(input){calls.push(input);return {outcome,subscription}},
    async addListener(){return {remove:async()=>{}}}
  }
  const require=name=>name==='@capacitor/core'?{registerPlugin:()=>bridge,Capacitor:{isPluginAvailable:()=>available}}:name==='./native-features'?{isNative:()=>native,getPlatform:()=>native?'ios':'web'}:null
  const fetch=async()=>({ok:true,json:async()=>({configured})})
  new Function('require','module','exports','process','fetch',compiled)(require,module,module.exports,{env:{}},fetch)
  return {adapter:module.exports,calls}
}
test('direct StoreKit preserves Apple localized pricing',async()=>{
  const f=fixture();const [product]=await f.adapter.getProducts();assert.equal(product.price,'129.000 ₫');assert.equal(product.currency,'VND')
})
test('only known, unexpired native verified transactions grant access',()=>{
  const f=fixture();assert.equal(f.adapter.normalizeAppleSubscription(active).status,'active')
  for(const value of [{...active,expiresAt:0},{...active,productId:'other-app'},{...active,signedTransaction:undefined},{...active,status:'none'}]) assert.equal(f.adapter.normalizeAppleSubscription(value).status,'none')
})
test('cancellation and Ask to Buy pending never unlock access',async()=>{
  const cancelled=fixture({outcome:'cancelled'})
  assert.equal(await cancelled.adapter.purchaseProduct(monthly),false)
  assert.equal(cancelled.adapter.getAppleTransaction(),null)
  const pending=fixture({outcome:'pending'})
  await assert.rejects(pending.adapter.purchaseProduct(monthly),/awaiting approval/)
  assert.equal(pending.adapter.getAppleTransaction(),null)
})
test('missing Apple bridge produces an actionable error without starting a charge',async()=>{
  const f=fixture({available:false})
  await assert.rejects(f.adapter.purchaseProduct(monthly),/Update LifeStages in TestFlight/)
  assert.equal(f.calls.length,0)
})
test('backend not configured prevents invoking Apple purchase and charging',async()=>{
  const f=fixture({configured:false});await assert.rejects(f.adapter.purchaseProduct(monthly),/being set up/);assert.equal(f.calls.length,0)
})
test('verified purchase, explicit restore, and ordinary lookup use separate StoreKit operations',async()=>{
  const f=fixture();assert.equal(await f.adapter.purchaseProduct(monthly),true);assert.equal(f.adapter.getAppleTransaction(),active.signedTransaction)
  await f.adapter.getSubscriptionInfo();assert.equal(f.calls.includes('restore'),false)
  await f.adapter.restorePurchases();assert.equal(f.calls.includes('restore'),true)
})
test('web, absent plugin and expired access fail closed and clear receipt',async()=>{
  for(const f of [fixture({native:false}),fixture({available:false}),fixture({subscription:{...active,expiresAt:0}})]) {
    assert.equal((await f.adapter.getSubscriptionInfo()).status,'none');assert.equal(f.adapter.getAppleTransaction(),null)
  }
})
