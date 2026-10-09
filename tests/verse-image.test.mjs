import test from 'node:test'
import assert from 'node:assert/strict'
import {verseImagePrompt,requestVerseImage} from '../lib/verse-image.ts'
const verse={reference:'Psalm 23:1',text:'The Lord is my shepherd, I lack nothing.'}
test('artwork requests carry the exact verse even for unpersonalized users',async()=>{
 let captured
 const image=await requestVerseImage('/api/generate-image',verse,new AbortController().signal,async(url,init)=>{captured=JSON.parse(init.body);return Response.json({imageUrl:'/api/images/valid'})})
 assert.equal(image,'/api/images/valid');assert.equal(captured.verse_reference,verse.reference);assert.equal(captured.verse_text,verse.text);assert.ok(captured.prompt.includes(verse.text));assert.equal(captured.ageRange,undefined)
})
test('provider failures and placeholders never appear as successful verse artwork',async()=>{
 for(const response of [Response.json({error:'Unavailable'},{status:503}),Response.json({imageUrl:'/placeholder.svg'})]) assert.equal(await requestVerseImage('/image',verse,new AbortController().signal,async()=>response),null)
})
test('cancelled artwork requests are aborted when the displayed verse changes',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(requestVerseImage('/image',verse,controller.signal,async(url,init)=>{init.signal.throwIfAborted()}),{name:'AbortError'})
})
test('missing Scripture cannot produce generic scenery',()=>{assert.throws(()=>verseImagePrompt({reference:'',text:''}))})
