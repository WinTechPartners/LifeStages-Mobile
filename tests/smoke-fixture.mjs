// Run only against tests/browser-fixture.mjs. No production host is accepted.
import assert from 'node:assert/strict'
const base='http://127.0.0.1:4188'
async function post(body,token) {
  const response=await fetch(`${base}/api/church/manage`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:4187',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)})
  const value=await response.json();assert.ok(response.ok,value.error);return value
}
const login=await post({action:'login',slug:'demo',email:'leader@example.invalid',password:'fixture-password-only'})
assert.ok(login.token)
await post({action:'update_church',updates:{name:'Fictional Harbor Church',primary_color:'#14b8a6',secondary_color:'#12304a',welcome_message:'A fictional local test of your church connection.',leadership_contact_name:'Pastor Demo',leadership_contact_email:'care@example.invalid'}},login.token)
const published=await post({action:'publish_sermon',sermon:{title:'Hope through Change',sermon_date:'2026-10-03',scripture:'John 3:16',summary:'A fictional message about hope, community, and facing change together.',video_url:null}},login.token)
assert.ok(published.sermon.id)
const member=await (await fetch(`${base}/api/church?slug=demo&action=info`)).json()
assert.equal(member.name,'Fictional Harbor Church');assert.equal(member.primary_color,'#14b8a6');assert.equal(member.leadership_contact_email,'care@example.invalid')
assert.equal(member.last_sermon_title,'Hope through Change');assert.equal(member.last_sermon_id,published.sermon.id);assert.equal(member.last_sermon_scripture,'John 3:16')
const source=await post({action:'save_sermon_source',source:{kind:'youtube_playlist',source_url:'https://www.youtube.com/playlist?list=PLFICTIONALTEST123456',enabled:true}},login.token)
assert.equal(source.automation.source.sync_status,'waiting_configuration')
assert.equal(source.automation.counts.discovered,0)
console.log('PASS: fixture leader login → branding/contact save → sermon publication → matching member response; source saved with honest setup-pending state. No external services called.')
