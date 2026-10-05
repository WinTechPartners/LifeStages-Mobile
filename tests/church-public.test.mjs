import test from 'node:test'
import assert from 'node:assert/strict'
import { publicChurchConfig } from '../lib/church-public.ts'
const church = {id:'church',slug:'demo',name:'Fictional Church',leadership_contact_email:'leader@example.invalid',last_sermon_title:'Old title',last_sermon_summary:'Old summary',last_sermon_youtube_url:'https://example.invalid/old',password_hash:'private',total_members:900}
test('published sermons replace stale legacy content without leaking private columns', () => {
  const publicData = publicChurchConfig(church, {id:'edition',title:'New title',sermon_date:'2026-10-03',scripture:'John 3:16',summary:'Published summary',video_url:null,transcript:'Not in public response',published_by:'private-admin'})
  assert.equal(publicData.last_sermon_id,'edition')
  assert.equal(publicData.last_sermon_title,'New title')
  assert.equal(publicData.last_sermon_youtube_url,null)
  assert.equal(publicData.last_sermon_scripture,'John 3:16')
  assert.equal(publicData.leadership_contact_email,'leader@example.invalid')
  assert.equal(publicData.sermon_review_enabled,true)
  for (const key of ['transcript','last_sermon_transcript','password_hash','published_by','total_members']) assert.equal(key in publicData,false)
})
test('existing configured sermons still work before publication migration', () => {
  const publicData = publicChurchConfig(church, undefined,'archive-id')
  assert.equal(publicData.last_sermon_id,'archive-id')
  assert.equal(publicData.last_sermon_title,'Old title')
})
test('newly discovered recording never masquerades as an analyzed sermon', () => {
  const imported={id:'source-video',title:'Sunday recording',published_at:'2026-10-04T12:00:00Z',video_url:'https://www.youtube.com/watch?v=abcdefghijk',source_description:'Publisher description',analysis_status:'pending'}
  const data=publicChurchConfig(church,undefined,undefined,imported)
  assert.equal(data.last_sermon_id,'source-video')
  assert.equal(data.last_sermon_source,'imported_recording')
  assert.equal(data.last_sermon_summary,null)
  assert.equal(data.last_sermon_scripture,null)
  assert.equal(data.last_sermon_source_description,'Publisher description')
  const manual={id:'edition',title:'Prepared message',sermon_date:'2026-10-04',summary:'Church supplied summary',video_url:imported.video_url,analysis_status:'not_analyzed'}
  assert.equal(publicChurchConfig(church,manual,undefined,imported).last_sermon_id,'edition')
})
test('historical manual import cannot demote a newer configured sermon', () => {
  const configured={...church,last_sermon_date:'2026-10-03'}
  const manual={id:'older-manual',title:'History',sermon_date:'2026-09-01',summary:'Historical summary'}
  const imported={id:'older-upload',title:'Upload',published_at:'2026-09-20T12:00:00Z'}
  const result=publicChurchConfig(configured,manual,'current-archive',imported)
  assert.equal(result.last_sermon_id,'current-archive')
  assert.equal(result.last_sermon_title,'Old title')
  assert.equal(result.last_sermon_source,'configured')
})
