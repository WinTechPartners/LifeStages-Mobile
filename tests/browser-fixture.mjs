// Local-only fixture: no AI, email, payment, or database services are contacted.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { randomUUID } from 'node:crypto'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const modules = new Map()
function load(relative) {
  const filename = path.resolve(root, relative)
  if (modules.has(filename)) return modules.get(filename).exports
  const module = { exports: {} }; modules.set(filename, module)
  const require = createRequire(filename)
  const scoped = target => target.startsWith('.') && fs.existsSync(path.resolve(path.dirname(filename), target + '.ts'))
    ? load(path.relative(root, path.resolve(path.dirname(filename), target + '.ts'))) : require(target)
  new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(scoped, module, module.exports)
  return module.exports
}
const analytics = load('lib/analytics/server.ts')
const management = load('lib/church-management/server.ts')
const { publicChurchConfig } = load('lib/church-public.ts')
const churchId = '11111111-1111-4111-8111-111111111111'
const sermonId = '33333333-3333-4333-8333-333333333333'
const rows = new Map(), requests = []
const env = { CHURCH_ANALYTICS_ENABLED: 'true', CHURCH_ANALYTICS_HMAC_SECRET: 'local-fixture-not-a-real-secret-123456789', SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture', CHURCH_ANALYTICS_ALLOWED_ORIGINS: 'http://127.0.0.1:4187' }
Object.assign(env, { CHURCH_MANAGEMENT_ENABLED: 'true', CHURCH_ADMIN_SESSION_SECRET: 'local-fixture-management-secret-123456789', CHURCH_MANAGEMENT_ALLOWED_ORIGINS: 'http://127.0.0.1:4187' })
const church = { id:churchId,slug:'demo',name:'Fictional Mobile Test Church',logo_url:null,primary_color:'#f59e0b',secondary_color:'#0c1929',welcome_message:'A fictional church for local testing.',leadership_contact_name:'Test Pastor',leadership_contact_email:'leader@example.invalid',leadership_contact_phone:null,leadership_contact_url:null,sermon_review_enabled:true,sermon_prep_enabled:false }
const sermons = [{ id:sermonId,church_id:churchId,title:'Hope for Today',sermon_date:'2026-09-27',scripture:'John 3:16',summary:'A fictional sermon about hope and supporting one another.',video_url:null,transcript:null,published_at:'2026-09-27T12:00:00Z',published_by:null,analysis_status:'not_analyzed' }]
const admin = { id:'22222222-2222-4222-8222-222222222222',church_id:churchId,email:'leader@example.invalid',name:'Test Pastor',role:'owner',password_hash:await management.hashManagementPassword('fixture-password-only') }
const automation = {source:null, counts:{discovered:0,transcript_pending:0,analysis_pending:0}, capabilities:{discovery_enabled:false,youtube_configured:false,processor_configured:false}}
const managementStorage = {
  async automation() { return automation },
  async saveSource(id,adminId,source) { if(id!==church.id || adminId!==admin.id) throw Error('Wrong church'); automation.source={...source,id:'44444444-4444-4444-8444-444444444444',church_id:id,last_checked_at:null,next_check_at:null,backfill_complete:false,backfill_count:0,sync_status:'waiting_configuration',last_error_code:null} },
  async consumeAttempt() { return true },
  async loginRecord(slug,email) { return slug===church.slug && email===admin.email ? {church,admin} : null },
  async adminById(id,churchId) { return id===admin.id && churchId===church.id ? admin : null },
  async churchById(id) { return id===church.id ? church : null },
  async sermons() { return [...sermons].sort((a,b)=>b.sermon_date.localeCompare(a.sermon_date) || b.published_at.localeCompare(a.published_at)) },
  async updateChurch(id,updates) { if(id!==church.id) throw Error('Wrong church'); Object.assign(church,updates) },
  async publish(id,adminId,sermon) { if(id!==church.id) return null; const row={...sermon,id:randomUUID(),church_id:id,published_at:new Date().toISOString(),published_by:adminId,analysis_status:'not_analyzed'}; sermons.push(row);return row },
  async acceptInvite() { return null },
}
const storage = {
  async churchExists(id) { return id === churchId },
  async sermonsBelongToChurch(id, ids) { return id === churchId && ids.every(value => sermons.some(sermon=>sermon.id===value)) },
  async ingest(id, device, events) {
    let inserted = 0
    for (const row of events) { const key = `${id}:${device}:${row.event_id}`; if (!rows.has(key)) { rows.set(key, row); inserted++ } }
    return { inserted, duplicate: events.length - inserted, limited: false }
  },
  async erase(id, device) { for (const [key, row] of rows) if (row.church_id === id && row.device_key === device) rows.delete(key) },
}
const verse = { reference: 'John 3:16', text: 'For God so loved the world.', version: 'KJV' }
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4188')
  let body = ''; for await (const part of req) body += part
  requests.push({ path: url.pathname, method: req.method })
  const send = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://127.0.0.1:4187', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS' }); res.end(JSON.stringify(data)) }
  try {
    if (url.pathname === '/api/church/manage') {
      const request = new Request(url, { method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method) && body ? {body} : {}) })
      const result = await management.handleChurchManagement(request,{env,storage:managementStorage}); res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());return
    }
    if (url.pathname.startsWith('/api/analytics/')) {
      const request = new Request(url, { method: req.method, headers: req.headers, ...(!['GET','HEAD'].includes(req.method) && body ? { body } : {}) })
      const handler = req.method === 'OPTIONS' ? analytics.handleAnalyticsOptions : url.pathname.endsWith('config') ? analytics.handleAnalyticsConfig : analytics.handleAnalyticsEvents
      const result = await handler(request, { env, storage }); res.writeHead(result.status, Object.fromEntries(result.headers)); res.end(await result.text()); return
    }
    if (req.method === 'OPTIONS') return send({}, 204)
    if (url.pathname === '/__test/events') return send({ events: [...rows.values()], requests })
    if (url.pathname === '/api/church') return url.searchParams.get('slug')==='demo' ? send(publicChurchConfig(church,(await managementStorage.sermons())[0])) : send({error:'Church not found'},404)
    if (url.pathname === '/api/bible' && url.searchParams.get('action') === 'books') return send({ oldTestament: [{ name:'Genesis',id:'genesis',chapters:50,bookNumber:1 }], newTestament:[{ name:'John',id:'john',chapters:21,bookNumber:43 }], translations:[{id:'KJV',name:'King James Version',abbr:'KJV'},{id:'WEB',name:'World English Bible',abbr:'WEB'}] })
    if (url.pathname === '/api/bible') return send({ verses:[{number:1,text:'In the beginning God created the heaven and the earth.'},{number:2,text:'And the earth was without form, and void.'}] })
    if (url.pathname === '/api/bible/explain') return send({explanation:'This is a fictional explanation used to verify the interface. No AI provider was called.'})
    if (url.pathname === '/api/voice-chat') return send({response:'This is a local test reply. We can explore that question together.'})
    if (url.pathname === '/api/today-verse') return send({verse_reference:verse.reference,verse_text:verse.text,verse})
    if (url.pathname === '/api/devotional') return send({verse,verse_reference:verse.reference,verse_text:verse.text,reflection:'A local fictional reflection to exercise the display.',application:'Make time for someone today.',prayer:'Help us show kindness.',image_url:null})
    if (url.pathname === '/api/generate-verse') return send({verse})
    if (url.pathname === '/api/generate-deep-dive') return send({reflection:'A fictional reflection about financial pressure and practical support. This text is a local fixture, not a generated response.'})
    return send({error:'No live service is available in the local test fixture.'}, 404)
  } catch { send({error:'Fixture request failed'},500) }
}).listen(4188,'127.0.0.1',()=>console.log('Local test fixture on 127.0.0.1:4188; all content fictional.'))
