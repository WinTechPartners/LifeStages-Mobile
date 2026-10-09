"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AppImage } from "@/components/app-image"
import { HeaderDropdown } from "@/components/header-dropdown"
import { ContentContextBoundary } from "@/components/content-context-boundary"
import { useDevotional, type StoryData } from "@/context/devotional-context"
import { useChurch } from "@/context/church-context"
import { useLanguage } from "@/context/language-context"
import { apiFetch } from "@/lib/api-base"
import { loadContentExtras } from "@/lib/content-loader"
import { contentCacheKey, optionalUuid } from "@/lib/content-context"
import { useContentDisplay } from "@/lib/use-content-display"

function StoriesContent() {
  const router = useRouter(), params = useSearchParams()
  const { devotional, loadingStates, retryContent } = useDevotional()
  const { church } = useChurch(), { language } = useLanguage()
  const [activeTab, setActiveTab] = useState(0)
  const [sermonStories, setSermonStories] = useState<StoryData[]>([])
  const [sermonError, setSermonError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const mainRef = useRef<HTMLDivElement>(null)
  const sermonMode = params.get("source") === "sermon"
  const sermonTitle = params.get("title") || "", sermonSummary = params.get("summary") || ""
  const sermonId = optionalUuid(params.get("sermonId"))
  const reference = sermonMode ? sermonTitle : devotional.verse?.reference
  const stories = sermonMode ? sermonStories : devotional.stories || []
  const story = stories[activeTab]
  const contentId = sermonMode ? sermonId || sermonTitle : reference || ""
  useContentDisplay(!!story?.text, contentCacheKey("stories-modern-v1", contentId + ':' + activeTab, church?.id, language), "stories", sermonId)

  useEffect(() => { mainRef.current?.scrollTo(0, 0); window.scrollTo(0, 0) }, [activeTab])
  useEffect(() => {
    if (!sermonMode || !sermonTitle || !sermonSummary) return
    let active = true
    setSermonStories([]); setSermonError(false)
    const profile = (() => { try { return JSON.parse(localStorage.getItem("userProfile") || "{}") } catch { return {} } })()
    const fetcher: typeof fetch = (url, init) => apiFetch(String(url), init)
    void loadContentExtras(x => x, { profile, language, source: "sermon", verseReference: sermonTitle, verseText: sermonSummary, churchId: church?.id, sermonId }, {
      loading: () => {}, result: (kind, data) => { if (active && kind === 'stories') setSermonStories(data.stories) }, error: kind => { if (active && kind === 'stories') setSermonError(true) },
    }, fetcher, ['stories'])
    return () => { active = false }
  }, [sermonMode, sermonTitle, sermonSummary, sermonId, church?.id, language, attempt])

  const retryImages = async () => {
    // Retry the story section through its normal loader so both image positions update.
    if (sermonMode) setAttempt(x => x + 1)
    else retryContent()
  }
  const first = story?.firstHalf || story?.text?.split(/\n\s*\n/).slice(0, Math.ceil(story.text.split(/\n\s*\n/).length / 2)).join('\n\n') || ''
  const second = story?.secondHalf || story?.text?.split(/\n\s*\n/).slice(Math.ceil(story.text.split(/\n\s*\n/).length / 2)).join('\n\n') || ''
  return <div ref={mainRef} className="min-h-screen w-full bg-[#0c1929] max-w-md mx-auto text-white pb-16">
    <header className="sticky top-0 z-50 flex items-center justify-between bg-[#0c1929]/95 backdrop-blur-md p-4 border-b border-white/10">
      <button aria-label="Go back" onClick={() => router.back()} className="size-10"><span className="material-symbols-outlined">arrow_back_ios_new</span></button>
      <h1 className="font-bold text-emerald-400">Stories</h1><HeaderDropdown verseReference={reference} />
    </header>
    <main className="px-4 py-6">
      <p className="text-sm text-emerald-400 mb-2">{reference}</p>
      <p className="text-blue-100/70 mb-5">Two short stories. Two ways to understand the message.</p>
      <div role="tablist" aria-label="Choose a story" className="flex gap-2 mb-6">
        {[0, 1].map(index => <button key={index} role="tab" aria-selected={activeTab === index} aria-controls="story-panel" onClick={() => setActiveTab(index)} className={`flex-1 rounded-xl py-3 font-semibold ${activeTab === index ? 'bg-emerald-600 text-white' : 'bg-white/5 text-blue-100/70'}`}>Story {index + 1}</button>)}
      </div>
      {sermonError && <div role="alert">Unable to load these stories. <button onClick={() => setAttempt(x => x + 1)} className="underline">Retry</button></div>}
      {!story ? <p role="status" className="py-12 text-center text-blue-100/70">{loadingStates.stories ? 'Creating your stories…' : 'Loading your stories…'}</p> :
        <article id="story-panel" role="tabpanel" className="bg-white/5 rounded-2xl overflow-hidden border border-white/10">
          {story.img ? <AppImage src={story.img} alt={`Opening scene of ${story.title}`} className="w-full aspect-video object-cover" /> : <div data-image-position="opening" className="aspect-video bg-emerald-950/30" />}
          <div className="p-6"><h2 className="font-serif text-2xl font-bold mb-5">{story.title}</h2><p className="whitespace-pre-wrap leading-relaxed text-blue-100/90">{first}</p></div>
          {story.midImg ? <AppImage src={story.midImg} alt={`Turning point in ${story.title}`} className="w-full aspect-video object-cover" /> : <div data-image-position="middle" className="aspect-video bg-emerald-950/30" />}
          <div className="p-6"><p className="whitespace-pre-wrap leading-relaxed text-blue-100/90">{second}</p>
            {story.imageErrors?.length ? <button onClick={retryImages} className="mt-5 text-sm underline text-emerald-300">Retry story illustrations</button> : null}
          </div>
        </article>}
    </main>
  </div>
}
export default function StoriesPage() { return <ContentContextBoundary><StoriesContent /></ContentContextBoundary> }
