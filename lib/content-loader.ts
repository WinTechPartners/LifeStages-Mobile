type Kind='context'|'stories'|'poetry'|'imagery'|'songs'
type Hooks={loading:(kind:Kind,value:boolean)=>void;result:(kind:Kind,data:Record<string,any>)=>void;error:(kind:Kind)=>void}
export const EXTRA_TASKS=[{kind:'context',route:'generate-context'},{kind:'stories',route:'generate-story',storyType:'modern-1'},{kind:'stories',route:'generate-story',storyType:'modern-2'},{kind:'poetry',route:'generate-poem',poemType:'classic'},{kind:'poetry',route:'generate-poem',poemType:'free'},{kind:'imagery',route:'generate-imagery'},{kind:'songs',route:'generate-songs'}] as const
export async function loadContentExtras(url:(path:string)=>string,payload:Record<string,unknown>,hooks:Hooks,fetcher:typeof fetch=fetch,kinds:Kind[]=['context','stories','poetry','imagery','songs']){
 const request=async(task:any)=>{const response=await fetcher(url('/api/'+task.route),{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),body:JSON.stringify({...payload,...task})});if(!response.ok)throw Error('Content unavailable');const data=await response.json();if(data.error||data.title==='Story Unavailable')throw Error('Content unavailable');return data}
 await Promise.all(kinds.map(async kind=>{
  hooks.loading(kind,true)
  try{
   const tasks=EXTRA_TASKS.filter(task=>task.kind===kind),results:any[]=[]
   if(kind==='stories'){for(const task of tasks)results.push(await request(task))}else results.push(...await Promise.all(tasks.map(request)))
   const data=kind==='stories'?{stories:results}:kind==='poetry'?{poetry:results.map(r=>r.poem)}:results[0]
   const items=kind==='stories'?data.stories:kind==='poetry'?data.poetry:kind==='imagery'?data.imagery:null
   if(kind==='context' && (!data.context || !Object.values(data.context).some(value=>typeof value==='string' && value.trim())))throw Error('Invalid context')
   if(kind==='songs' && !data.songs?.lyrics?.trim())throw Error('Invalid song')
   if(items && !items.length)throw Error('Empty content')
   if(items?.some((item:any)=>!item||!(item.text||item.title)))throw Error('Invalid content')
   hooks.result(kind,data)
   hooks.loading(kind,false)
   if(kind==='context' && data.contextImagePrompt){try{const response=await fetcher(url('/api/generate-image'),{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),body:JSON.stringify({prompt:data.contextImagePrompt,width:768,height:512,language:payload.language})});if(response.ok){const image=await response.json();if(image.imageUrl)hooks.result(kind,{contextHeroImage:image.imageUrl})}}catch{}}
   if(items) await Promise.all(items.map(async(item:any,index:number)=>{
    const scenes=kind==='stories'?[{prompt:item.imagePrompt,field:'img'},{prompt:item.midImagePrompt,field:'midImg'}]:[{prompt:item.imagePrompt,field:'img'}]
    await Promise.all(scenes.filter(scene=>scene.prompt).map(async scene=>{
      try{const response=await fetcher(url('/api/generate-image'),{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(120000),body:JSON.stringify({prompt:scene.prompt,width:768,height:512,language:payload.language})});if(!response.ok)throw Error('Image unavailable');const image=await response.json();if(!image.imageUrl)throw Error('Image unavailable');items[index]={...items[index],[scene.field]:image.imageUrl}}
      catch{items[index]={...items[index],imageErrors:[...(items[index].imageErrors||[]),scene.field]}}
      hooks.result(kind,{[kind]:[...items]})
    }))
   }))
  }catch{hooks.error(kind)}finally{hooks.loading(kind,false)}
 }))
}
