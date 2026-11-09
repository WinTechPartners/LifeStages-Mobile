"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Check, BookOpen, Feather, Layers, Columns2, X } from "lucide-react"

type Story = { title: string; firstHalf: string; secondHalf: string; openingImage: string; midImage: string }
type Poem = { title: string; type: string; text: string }
type Example = { id: string; gender: string; country: string; age: string; situation: string; friendly: string; stories: Story[]; poetry: Poem[]; notes: string[] }
type Collection = { reference: string; verse: string; translation: string; profiles: Example[] }
type Section = "friendly" | "stories" | "poetry"
const situations: Record<string,string> = { none: "No circumstances selected", baby: "Baby", work: "Work issues", both: "Baby + work issues" }
const title = (p: Example) => `${p.gender === "female" ? "Female" : "Male"} · ${p.age.replace("-","–")} · ${p.country === "VN" ? "Vietnam" : "United States"}`

function Reading({ example, section, option, label }: { example: Example; section: Section; option: number; label: string }) {
 const story = example.stories[option], poem = example.poetry[option]
 const paragraphs = section === "friendly" ? example.friendly : section === "stories" ? story.firstHalf + "\n\n" + story.secondHalf : poem.text
 return <article className="showcase-reading rounded-3xl border border-[#e2d9cb] bg-[#fbf8f2] p-6 text-[#263443] md:p-9" aria-label={label}>
   <p className="text-xs font-bold uppercase tracking-widest text-[#846637]">{label}</p>
   <h2 className="mt-2 text-lg font-semibold">{title(example)}</h2>
   <p className="mb-6 mt-1 text-sm text-[#697683]">{situations[example.situation]} · English</p>
   {section !== "friendly" && <><h3 className="font-serif text-3xl leading-tight">{section === "stories" ? story.title : poem.title}</h3><p className="mb-6 mt-2 text-xs uppercase tracking-widest text-[#846637]">{section === "stories" ? "Modern-day fiction" : poem.type}</p></>}
   <div data-testid="content-text" className={`font-serif text-[18px] leading-[1.9] ${section === "poetry" ? "whitespace-pre-wrap" : "space-y-5"}`}>
     {section === "poetry" ? paragraphs : section === "stories" ? <>
       <StoryImage key={story.openingImage} source={story.openingImage} description={`Opening scene of ${story.title}`} />
       {story.firstHalf.split(/\n\s*\n/).filter(Boolean).map((p,i)=><p key={'opening'+i}>{p}</p>)}
       <StoryImage key={story.midImage} source={story.midImage} description={`Midpoint scene of ${story.title}`} />
       {story.secondHalf.split(/\n\s*\n/).filter(Boolean).map((p,i)=><p key={'ending'+i}>{p}</p>)}
     </> : paragraphs.split(/\n\s*\n/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}
   </div>
   <div className="mt-8 border-t border-[#e2d9cb] pt-5"><h4 className="text-xs font-bold uppercase tracking-widest text-[#846637]">Inside this example</h4><ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#576574]">{example.notes.map((note,i)=><li key={i}>{note}</li>)}</ul></div>
 </article>
}

function StoryImage({source,description}:{source:string;description:string}) {
 const [failed,setFailed]=useState(false),[retry,setRetry]=useState(0)
 if(failed)return <div className="py-4 text-sm font-sans"><p>The illustration couldn’t load.</p><button className="mt-2 underline" onClick={()=>{setFailed(false);setRetry(v=>v+1)}}>Try again</button></div>
 return <img src={source+(retry?'?retry='+retry:'')} alt={description} width={768} height={512} className="my-6 aspect-[3/2] w-full rounded-2xl object-cover" onError={()=>setFailed(true)}/>
}

export default function PersonalizationShowcase() {
 const [data,setData]=useState<Collection|null>(null),[error,setError]=useState(false)
 const [gender,setGender]=useState("female"),[country,setCountry]=useState("US"),[age,setAge]=useState("18-24"),[baby,setBaby]=useState(false),[work,setWork]=useState(false)
 const [section,setSection]=useState<Section>("friendly"),[option,setOption]=useState(0),[pinned,setPinned]=useState<Example|null>(null)
 useEffect(()=>{const controller=new AbortController();fetch('/personalization-examples.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(setData).catch(e=>{if(e.name!=="AbortError")setError(true)});return()=>controller.abort()},[])
 const situation=baby&&work?"both":baby?"baby":work?"work":"none"
 const current=data?.profiles.find(p=>p.id===[gender,country,age,situation].join('_'))
 const tabs: {id:Section;name:string;icon:typeof BookOpen}[]=[{id:'friendly',name:'Friendly Breakdown',icon:BookOpen},{id:'stories',name:'Stories',icon:Layers},{id:'poetry',name:'Poetry',icon:Feather}]
 const switchButton=(selected:boolean)=>`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 ${selected?'border-amber-400 bg-amber-400 text-[#0c1929]':'border-white/15 bg-white/5 text-blue-100 hover:bg-white/10'}`
 return <main className="min-h-screen bg-[#0c1929] px-4 pb-16 pt-6 text-white sm:px-8">
  <div className="mx-auto max-w-[1240px]">
   <header className="flex items-center justify-between gap-3 border-b border-white/10 pb-5"><Link href="/verse" className="inline-flex items-center gap-2 text-sm text-blue-100 hover:text-amber-300"><ArrowLeft size={16}/>Back to LifeStages</Link><span className="text-xs font-semibold uppercase tracking-[.16em] text-amber-300">Personalization preview</span></header>
   <div className="mb-7 mt-7 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-amber-300">One verse. Different everyday lives.</p><h1 className="text-3xl font-bold tracking-tight md:text-4xl">See how personal it gets.</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100/75">Explore John 3:16 through different ages, places and circumstances. The meaning stays the same. The way it connects changes.</p></div><span className="rounded-full border border-white/15 px-4 py-2 text-xs text-blue-100">32 example profiles · All in English</span></div>
   <blockquote className="mb-7 rounded-2xl border border-amber-300/20 bg-amber-300/[.06] px-5 py-4"><p className="font-serif text-lg leading-relaxed text-[#f5e5c8]">“{data?.verse || 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.'}”</p><footer className="mt-2 text-xs font-semibold text-amber-300">John 3:16 · NIV</footer></blockquote>
   <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
    <aside className="rounded-3xl border border-white/10 bg-[#142435] p-5 lg:sticky lg:top-5" aria-label="Example profile controls">
     <h2 className="text-lg font-semibold">Choose an example</h2><p className="mb-5 mt-1 text-xs leading-relaxed text-blue-100/60">These toggles change the preview only.</p>
     <fieldset className="mb-5"><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-100/70">Gender</legend><div className="grid grid-cols-2 gap-2">{['female','male'].map(v=><button key={v} aria-pressed={gender===v} onClick={()=>setGender(v)} className={switchButton(gender===v)}>{v==='female'?'Female':'Male'}</button>)}</div></fieldset>
     <fieldset className="mb-5"><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-100/70">Country · English output</legend><div className="grid grid-cols-2 gap-2">{['US','VN'].map(v=><button key={v} aria-pressed={country===v} onClick={()=>setCountry(v)} className={switchButton(country===v)}>{v==='VN'?'Vietnam':'United States'}</button>)}</div></fieldset>
     <fieldset className="mb-5"><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-100/70">Age</legend><div className="grid grid-cols-2 gap-2">{['18-24','55-65'].map(v=><button key={v} aria-pressed={age===v} onClick={()=>setAge(v)} className={switchButton(age===v)}>{v.replace('-','–')}</button>)}</div></fieldset>
     <fieldset><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-100/70">Circumstances · Select either or both</legend><div className="space-y-2">{[{name:'Baby',value:baby,set:setBaby},{name:'Work issues',value:work,set:setWork}].map(item=><button key={item.name} role="checkbox" aria-checked={item.value} onClick={()=>item.set(!item.value)} className={`${switchButton(item.value)} flex w-full items-center justify-between`}><span>{item.name}</span>{item.value?<Check size={17}/>:<span className="h-4 w-4 rounded border border-white/40"/>}</button>)}</div><button onClick={()=>{setBaby(false);setWork(false)}} className="mt-3 text-xs text-blue-100/70 underline underline-offset-4">Clear circumstances</button></fieldset>
     <p className="mt-4 text-xs leading-relaxed text-blue-100/60">Unselected means unspecified. It doesn’t mean someone has no children or no job.</p>
     <button disabled={!current} onClick={()=>setPinned(pinned?null:current!)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/40 px-3 py-3 text-sm font-semibold text-amber-300 hover:bg-amber-300/10">{pinned?<X size={16}/>:<Columns2 size={16}/>} {pinned?'Close comparison':'Compare with this example'}</button>
     {pinned&&<p className="mt-3 text-xs leading-relaxed text-blue-100/75">Saved on the left. Change any toggle to compare with it.</p>}
    </aside>
    <section aria-label="Personalized content" className="min-w-0">
     <div role="tablist" aria-label="Content type" className="mb-4 flex gap-1 rounded-2xl border border-white/10 bg-[#142435] p-1.5">{tabs.map(({id,name,icon:Icon})=><button key={id} id={`tab-${id}`} aria-controls="showcase-results" role="tab" aria-selected={section===id} onClick={()=>{setSection(id);setOption(0)}} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-semibold sm:text-sm ${section===id?'bg-[#f4e4c9] text-[#0c1929]':'text-blue-100 hover:bg-white/5'}`}><Icon className="hidden sm:block" size={17}/>{name}</button>)}</div>
     {section!=='friendly'&&<div className="mb-4 flex gap-2">{[0,1].map(i=><button key={i} aria-pressed={option===i} onClick={()=>setOption(i)} className={switchButton(option===i)}>{section==='stories'?`Story ${i+1}`:i===0?'Classic Verse':'Free Verse'}</button>)}</div>}
     <div id="showcase-results" role="tabpanel" aria-labelledby={`tab-${section}`} aria-live="polite" aria-busy={!current&&!error}>
      {error?<div className="rounded-2xl border border-white/10 p-8"><p>Unable to load the examples.</p><button onClick={()=>window.location.reload()} className="mt-4 rounded-xl bg-amber-400 px-5 py-3 text-[#0c1929]">Try again</button></div>:!current?<p className="p-8 text-blue-100">Loading examples…</p>:<div className={`grid items-start gap-4 ${pinned?'xl:grid-cols-2':''}`}>{pinned&&<Reading example={pinned} section={section} option={option} label="Saved example"/>}<Reading example={current} section={section} option={option} label={pinned?'Current example':'Your selected example'}/></div>}
     </div>
    </section>
   </div>
   <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs leading-relaxed text-blue-100/60"><p className="max-w-2xl">Saved AI-generated examples for fictional profiles. Stories are fiction. Your personal profile stays unchanged. The 55–65 range is a showcase example, separate from the app’s age bands.</p><Link href="/subscription" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-300">Explore Premium <ArrowRight size={16}/></Link></footer>
  </div>
 </main>
}
