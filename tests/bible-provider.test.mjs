import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
function loadRoute(cached) {
  let cacheReads=0,fetches=0
  const code=ts.transpileModule(fs.readFileSync(new URL('../app/api/bible/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const module={exports:{}}
  new Function('require','module','exports','fetch',code)(()=>({cacheGet:async()=>{cacheReads++;return cached},cacheSet:async()=>{}}),module,module.exports,async()=>{fetches++;throw Error('Unexpected provider request')})
  return {get:module.exports.GET,reads:()=>({cacheReads,fetches})}
}
test('NIV publisher notices cannot escape even from an existing chapter cache',async()=>{
  const route=loadRoute({verses:[{number:1,text:'Provider publisher dispute notice'}]})
  for(const version of ['NIV','niv']){
    const response=await route.get(new Request(`https://app.test/api/bible?action=read&book=John&chapter=3&version=${version}`))
    assert.equal(response.status,503)
    const body=await response.json()
    assert.equal(body.code,'NIV_UNAVAILABLE')
    assert.equal(body.verses,undefined)
    assert.equal(body.error,'NIV is unavailable from our Bible text provider. Please choose another translation.')
  }
  assert.deepEqual(route.reads(),{cacheReads:0,fetches:0})
})
test('other translations retain their existing chapter response',async()=>{
  const cached={book:'John',chapter:3,version:'KJV',verses:[{number:1,text:'There was a man of the Pharisees, named Nicodemus, a ruler of the Jews:'}]}
  const route=loadRoute(cached)
  const response=await route.get(new Request('https://app.test/api/bible?action=read&book=John&chapter=3&version=KJV'))
  assert.equal(response.status,200)
  assert.deepEqual(await response.json(),cached)
  assert.deepEqual(route.reads(),{cacheReads:1,fetches:0})
})
