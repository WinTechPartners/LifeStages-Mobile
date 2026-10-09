import {NextRequest,NextResponse} from 'next/server'
import {query,queryOne} from '@/lib/db'
import {cacheSet} from '@/lib/content-cache'
import {scheduledFallback} from '@/lib/daily-verse'
import {warmupTasks} from '@/lib/warmup-tasks'
import {authorizedWarmup} from '@/lib/warmup-auth'
export async function POST(request:NextRequest){
 try{
  const body=await request.json(),expected=process.env.WARMUP_SECRET||process.env.CRON_SECRET||'',supplied=typeof body.secret==='string'?body.secret:''
  if(!authorizedWarmup(supplied))return NextResponse.json({error:'Unauthorized'},{status:401})
  const date=body.date||new Date(Date.now()+86400000).toISOString().slice(0,10)
  const fallback=scheduledFallback(date)
  let row=await queryOne<{verse_reference:string;verse_text:string}>('SELECT verse_reference,verse_text FROM verses WHERE date=$1 AND church_id IS NULL LIMIT 1',[date])
  if(!row){await query('INSERT INTO verses(date,verse_reference,verse_text,church_id) VALUES($1,$2,$3,NULL)',[date,fallback.reference,fallback.text]);row={verse_reference:fallback.reference,verse_text:fallback.text}}
  const verse={reference:row.verse_reference,text:row.verse_text}
  await cacheSet('warmup-status',{date},{date,status:'running',startedAt:new Date().toISOString()})
  const profiles=await query<{payload:{profile:Record<string,unknown>}}>("SELECT payload FROM cached_content WHERE content_type='warmup-profile' AND last_accessed>NOW()-INTERVAL '30 days' ORDER BY last_accessed DESC")
  const generic={personalized:false,language:'en',ageRange:'40-54',gender:'male',stageSituation:'General',lifeCircumstances:[],contentStyle:'casual',country:'United States'}
  const cohorts=[generic,...profiles.map(row=>row.payload.profile)].filter(Boolean)
  const seen=new Set<string>(),unique=cohorts.filter(p=>{const key=JSON.stringify(p);if(seen.has(key))return false;seen.add(key);return true})
  const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin,results:any[]=[]
  for(const profile of unique){
   const tasks=warmupTasks(verse,profile)
   await Promise.all(tasks.map(async task=>{try{const response=await fetch(origin+'/api/'+task.route,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(60000),body:JSON.stringify({...task.body,__warmupSecret:expected})});const data=await response.json();const ok=response.ok&&!data.error&&data.title!=='Story Unavailable';results.push({route:task.route,language:profile.language,ok,status:response.status});
     if(ok){const prompts=[data.contextImagePrompt,...(data.imagery||[]).map((x:any)=>x.imagePrompt),data.imagePrompt,data.midImagePrompt,data.poem?.imagePrompt].filter((p:any)=>typeof p==='string'&&p.trim());await Promise.all(prompts.map(async(prompt:string)=>{try{const image=await fetch(origin+'/api/generate-image',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(120000),body:JSON.stringify({prompt,width:768,height:512,language:profile.language})});const value=await image.json();results.push({route:task.route+'/image',language:profile.language,ok:image.ok&&!!value.imageUrl,status:image.status})}catch{results.push({route:task.route+'/image',language:profile.language,ok:false,status:504})}}))}}catch{results.push({route:task.route,language:profile.language,ok:false,status:504})}}))
  }
  const failed=results.filter(r=>!r.ok).length,summary={date,verse:verse.reference,cohorts:unique.length,prepared:results.length-failed,failed,results,completedAt:new Date().toISOString()}
  await cacheSet('warmup-status',{date},summary)
  return NextResponse.json({success:failed===0,...summary},{status:failed?502:200})
 }catch{console.error('[Warmup] Job failed');return NextResponse.json({error:'Content preparation failed'},{status:500})}
}
