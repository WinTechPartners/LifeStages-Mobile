import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const code=ts.transpileModule(fs.readFileSync(new URL('../context/subscription-context.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
async function fixture(ownerAccess){
 const state=[],effects=[],deps=[];let cursor=0,effectCursor=0
 const storage=new Map([['userProfile',JSON.stringify({email:'test@example.invalid'})]])
 const react={createContext:()=>({Provider:'provider'}),useState:init=>{const id=cursor++;if(!(id in state))state[id]=typeof init==='function'?init():init;return [state[id],value=>{state[id]=typeof value==='function'?value(state[id]):value}]},useEffect:(fn,next)=>{const id=effectCursor++;const key=JSON.stringify(next);if(deps[id]!==key){deps[id]=key;effects.push(fn)}},useCallback:fn=>fn,useMemo:fn=>fn()}
 const empty={status:'none',productId:null,expiresAt:null,isTrialing:false,willRenew:false}
 const requests=[],native={getPlatform:()=> 'ios',isNative:()=>true}
 const iap={initializeIAP:async()=>true,getProducts:async()=>[],getSubscriptionInfo:async()=>empty,listenForSubscriptionChanges:async()=>()=>{},PRODUCT_IDS:{MONTHLY:'001',YEARLY:'annual'}}
 const require=name=>name==='react'?react:name==='react/jsx-runtime'?{jsx:(type,props)=>({type,props})}:name==='@/lib/native-features'?native:name==='@/lib/native-iap'?iap:{apiFetch:async url=>{requests.push(url);return {ok:true,json:async()=>({ownerAccess,isActive:true})}}}
 const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}
 const window={addEventListener(){},removeEventListener(){},location:{assign(){}}},document={addEventListener(){},removeEventListener(){},visibilityState:'visible'}
 const module={exports:{}}
 new Function('require','module','exports','localStorage','window','document',code)(require,module,module.exports,localStorage,window,document)
 const render=()=>{cursor=0;effectCursor=0;return module.exports.SubscriptionProvider({children:null}).props.value}
 render();for(const fn of effects.splice(0))fn();await new Promise(resolve=>setTimeout(resolve,5))
 render();for(const fn of effects.splice(0))fn();await new Promise(resolve=>setTimeout(resolve,5))
 return {value:render(),requests}
}
test('native owner access unlocks personalization even when Apple has no subscription',async()=>{
 const {value,requests}=await fixture(true)
 assert.ok(requests.includes('/api/stripe/status'))
 assert.equal(value.canAccessPremium,true)
 assert.equal(value.tier,'premium')
 assert.equal(value.subscriptionStatus,'active')
})
test('ordinary native users still require Apple access, not an active web subscription response',async()=>{
 const {value}=await fixture(false)
 assert.equal(value.canAccessPremium,false)
 assert.equal(value.tier,'free')
})
