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
test('Unavailable translations cannot escape through an existing chapter cache',async()=>{
  const route=loadRoute({verses:[{number:1,text:'Provider publisher dispute notice'}]})
  for(const version of ['NIV','niv','KJV','ESV','NLT','NKJV','NASB','AMP','CSB','YLT','VI1934']){
    const response=await route.get(new Request(`https://app.test/api/bible?action=read&book=John&chapter=3&version=${version}`))
    assert.equal(response.status,400)
    const body=await response.json()
    assert.equal(body.code,'TRANSLATION_UNAVAILABLE')
    assert.equal(body.verses,undefined)
    assert.match(body.error,/end of 2026/)
  }
  assert.deepEqual(route.reads(),{cacheReads:0,fetches:0})
})
test('WEB retains its chapter response',async()=>{
  const cached={book:'John',chapter:3,version:'WEB',verses:[{number:1,text:'There was a man of the Pharisees, named Nicodemus, a ruler of the Jews:'}]}
  const route=loadRoute(cached)
  const response=await route.get(new Request('https://app.test/api/bible?action=read&book=John&chapter=3&version=WEB'))
  assert.equal(response.status,200)
  assert.deepEqual(await response.json(),cached)
  assert.deepEqual(route.reads(),{cacheReads:1,fetches:0})
})

test('catalog offers WEB alone and omitted translation defaults to WEB',async()=>{const route=loadRoute({version:'WEB',verses:[{number:1,text:'WEB Scripture'}]});const books=await (await route.get(new Request('https://app.test/api/bible?action=books'))).json();assert.deepEqual(books.translations.map(t=>t.id),['WEB']);const response=await route.get(new Request('https://app.test/api/bible?action=read&book=John&chapter=3'));assert.equal(response.status,200);assert.equal((await response.json()).version,'WEB')});
