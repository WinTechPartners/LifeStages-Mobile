import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url), ts=require('typescript')
function load(file,mocks={},extra={}) {
  const exports={}
  const code=ts.transpileModule(fs.readFileSync(new URL('../lib/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  vm.runInNewContext(code,{exports,require:id=>mocks[id]||(id.startsWith('./')?load(id.slice(2)+'.ts',mocks,extra):require(id)),Date,AbortSignal,process:{env:{}},...extra})
  return exports
}
test('free profiles cannot opt themselves into personalization',async()=>{
  const api=load('entitlements.ts',{'@/lib/supabase':{getSubscriptionByEmail:async()=>null}})
  const result=await api.entitlementProfile({email:'free@example.com',__personalizationAuthorized:true,profile:{ageRange:'65+',gender:'female',stageSituation:'Transitions',fullName:'Private Name'}})
  assert.equal(result.__personalizationAuthorized,false);assert.equal(result.ageRange,'40-54');assert.equal(result.stageSituation,'General');assert.equal(result.profile.fullName,undefined)
})
test('only an active subscription or the explicit owner email enables premium',async()=>{
  let status='canceled'
  const api=load('entitlements.ts',{'@/lib/supabase':{getSubscriptionByEmail:async()=>({subscription_status:status,current_period_end:'2099-01-01'})}})
  assert.equal(await api.hasPremium('free@example.com'),false)
  assert.equal(await api.hasPremium(' STEVEWINFIELDTX@GMAIL.COM '),true)
  status='active';assert.equal(await api.hasPremium('paid@example.com'),true)
  const result=await api.entitlementProfile({email:'paid@example.com',profile:{ageRange:'65+',gender:'female',stageSituation:'Transitions'}})
  assert.equal(result.ageRange,'65+');assert.equal(result.__personalizationAuthorized,true)
})
test('generic content has neutral instructions and a separate cache from paid profiles',()=>{
  const api=load('content-policy.ts',{'@/lib/cultural-context':{getCountryForLanguage:()=> 'United States'}})
  const free=api.normalizeProfile({ageRange:'65+',gender:'female',stageSituation:'Transitions'})
  const paid=api.normalizeProfile({__personalizationAuthorized:true,ageRange:'65+',gender:'female',stageSituation:'Transitions'})
  assert.match(api.readerInstruction(free),/Do not tailor to age, gender/)
  assert.equal(free.ageRange,'40-54');assert.equal(paid.ageRange,'65+')
  assert.notDeepEqual(api.policyKey(free),api.policyKey(paid))
})
test('text detection rejects lettering and accepts a verified clear image',async()=>{
  let containsText=true
  const api=load('image-text-check.ts',{}, {process:{env:{GOOGLE_CLOUD_API_KEY:'fixture'}},fetch:async()=>({ok:true,json:async()=>({responses:[{textAnnotations:containsText?[{description:'WORDS'}]:[]}]})})})
  assert.equal(await api.isTextFree('data:image/jpeg;base64,YQ=='),false)
  containsText=false;assert.equal(await api.isTextFree('data:image/jpeg;base64,YQ=='),true)
})
test('images fail closed when text detection is unavailable',async()=>{
  const api=load('image-text-check.ts')
  assert.equal(await api.isTextFree('data:image/jpeg;base64,YQ=='),false)
})

test('English-only requests ignore old language preferences while retaining paid country context',()=>{
  const api=load('content-policy.ts',{'@/lib/cultural-context':{getCountryForLanguage:()=> 'United States'}})
  const p=api.normalizeProfile({__personalizationAuthorized:true,language:'vi',profile:{language:'es',country:'Vietnam'}})
  assert.equal(p.language,'en');assert.equal(p.country,'Vietnam');assert.match(api.readerInstruction(p),/content in English/)
  assert.equal(api.normalizeProfile({language:'es'}).language,'en')
})
