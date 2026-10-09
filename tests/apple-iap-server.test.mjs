import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const code=ts.transpileModule(fs.readFileSync(new URL('../lib/apple-iap-server.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const module={exports:{}}
new Function('require','module','exports','process','Buffer',code)(require,module,module.exports,{env:{},cwd:()=>process.cwd()},Buffer)
const api=module.exports
test('backend rejects other-app, unknown-product, expired, upgraded and refunded entitlements',()=>{
  const active={bundleId:'com.bibleforlifestages',productId:'001',expiresDate:Date.now()+10000}
  assert.equal(api.activeAppleTransaction(active),true)
  for(const change of [{bundleId:'another.app'},{productId:'unknown'},{expiresDate:0},{isUpgraded:true},{revocationDate:Date.now()}]) assert.equal(api.activeAppleTransaction({...active,...change}),false)
})
test('unconfigured server and arbitrary receipt claims fail closed',async()=>{
  assert.equal(api.appleVerificationConfigured(),false)
  for(const token of [null,'active','forged.signed.receipt','a'.repeat(25000)]) assert.equal(await api.hasApplePremium(token),false)
})
test('a forged receipt with matching app and product cannot bypass Apple signature verification',async()=>{
  const fresh={exports:{}}
  new Function('require','module','exports','process','Buffer',code)(require,fresh,fresh.exports,{env:{APPLE_IAP_PRIVATE_KEY:'fixture',APPLE_IAP_KEY_ID:'fixture',APPLE_IAP_ISSUER_ID:'fixture'},cwd:()=>process.cwd()},Buffer)
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url')
  const token=encode({alg:'ES256',x5c:[]})+'.'+encode({bundleId:'com.bibleforlifestages',productId:'001',expiresDate:Date.now()+999999,originalTransactionId:'fake'})+'.AA'
  assert.equal(await fresh.exports.hasApplePremium(token),false)
})
