import {NextRequest,NextResponse} from 'next/server'
import {query,queryOne} from '@/lib/db'
import {cacheGet,cacheSet} from '@/lib/content-cache'
import {scheduledFallback} from '@/lib/daily-verse'
import {warmupTasks} from '@/lib/warmup-tasks'
import {authorizedWarmup} from '@/lib/warmup-auth'
const CONCURRENCY=3,STALE_MS=60*60*1000
const logErr=(label:string,err:any)=>console.error(label,err?.message||String(err),err?.stack||'',err?.cause??'')
function limiter(max:number){let active=0;const waiting:Array<()=>void>=[]
 return async<T>(fn:()=>Promise<T>):Promise<T>=>{
  if(active<max)active++;else await new Promise<void>(r=>waiting.push(r))
  try{return await fn()}finally{const next=waiting.shift();if(next)next();else active--}}}
async function runWarmup(date:string,origin:string,expected:string){
 try{
  const fallback=scheduledFallback(date)
  let row=await queryOne<{verse_reference:string;verse_text:string}>('SELECT verse_reference,verse_text FROM verses WHERE date=$1 AND church_id IS NULL LIMIT 1',[date])
  if(!row){await query('INSERT INTO verses(date,verse_reference,verse_text,church_id) VALUES($1,$2,$3,NULL)',[date,fallback.reference,fallback.text]);row={verse_reference:fallback.reference,verse_text:fallback.text}}
  const verse={reference:row.verse_reference,text:row.verse_text}
  const profiles=await query<{payload:{profile:Record<string,unknown>}}>("SELECT payload FROM cached_content WHERE content_type='warmup-profile' AND last_accessed>NOW()-INTERVAL '30 days' ORDER BY last_accessed DESC")
  const generic={personalized:false,language:'en',ageRange:'40-54',gender:'male',stageSituation:'General',lifeCircumstances:[],contentStyle:'casual',country:'United States'}
  const cohorts=[generic,...profiles.map(row=>row.payload.profile)].filter(Boolean)
  const seen=new Set<string>(),unique=cohorts.filter(p=>{const key=JSON.stringify(p);if(seen.has(key))return false;seen.add(key);return true})
  const results:any[]=[],run=limiter(CONCURRENCY)
  for(const profile of unique){
   const tasks=warmupTasks(verse,profile)
   await Promise.all(tasks.map(async task=>{try{const {response,data}=await run(async()=>{const response=await fetch(origin+'/api/'+task.route,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(60000),body:JSON.stringify({...task.body,__warmupSecret:expected})});return {response,data:await response.json()}});const ok=response.ok&&!data.error&&data.title!=='Story Unavailable';results.push({route:task.route,language:profile.language,ok,status:response.status});
     if(ok){const prompts=[data.contextImagePrompt,...(data.imagery||[]).map((x:any)=>x.imagePrompt),data.imagePrompt,data.midImagePrompt,data.poem?.imagePrompt].filter((p:any)=>typeof p==='string'&&p.trim());await Promise.all(prompts.map(async(prompt:string)=>{try{const {image,value}=await run(async()=>{const image=await fetch(origin+'/api/generate-image',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(120000),body:JSON.stringify({prompt,width:768,height:512,language:profile.language})});return {image,value:await image.json()}});results.push({route:task.route+'/image',language:profile.language,ok:image.ok&&!!value.imageUrl,status:image.status})}catch(err){logErr('[Warmup] Image failed '+task.route,err);results.push({route:task.route+'/image',language:profile.language,ok:false,status:504})}}))}}catch(err){logErr('[Warmup] Task failed '+task.route,err);results.push({route:task.route,language:profile.language,ok:false,status:504})}}))
  }
  const failed=results.filter(r=>!r.ok).length,summary={date,verse:verse.reference,cohorts:unique.length,prepared:results.length-failed,failed,results,completedAt:new Date().toISOString()}
  await cacheSet('warmup-status',{date},summary)
  console.log('[Warmup] Done',JSON.stringify({date,cohorts:summary.cohorts,prepared:summary.prepared,failed}))
 }catch(err){
  logErr('[Warmup] Job failed',err)
  try{await cacheSet('warmup-status',{date},{date,status:'failed',error:String((err as any)?.message||err),completedAt:new Date().toISOString()})}catch(inner){logErr('[Warmup] Could not record failure',inner)}
 }
}
export async function POST(request:NextRequest){
 try{
  const body=await request.json(),expected=process.env.WARMUP_SECRET||process.env.CRON_SECRET||'',supplied=typeof body.secret==='string'?body.secret:''
  if(!authorizedWarmup(supplied))return NextResponse.json({error:'Unauthorized'},{status:401})
  const date=body.date||new Date(Date.now()+86400000).toISOString().slice(0,10)
  const prior=await cacheGet<{status?:string;startedAt?:string;completedAt?:string;failed?:number}>('warmup-status',{date})
  if(prior){
   const running=prior.status==='running'&&Date.now()-Date.parse(prior.startedAt||'')<STALE_MS,done=!!prior.completedAt&&prior.failed===0
   if(running||done)return NextResponse.json({skipped:true,date,status:running?'running':'done'},{status:200})
  }
  await cacheSet('warmup-status',{date},{date,status:'running',startedAt:new Date().toISOString()})
  const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin
  void runWarmup(date,origin,expected).catch(err=>logErr('[Warmup] Unhandled job error',err))
  return NextResponse.json({started:true,date},{status:202})
 }catch(err){logErr('[Warmup] Request failed',err);return NextResponse.json({error:'Content preparation failed'},{status:500})}
}
