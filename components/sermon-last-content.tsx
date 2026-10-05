"use client"


import { useRouter } from "next/navigation"
import { useChurch } from "@/context/church-context"
import { useSubscription } from "@/context/subscription-context"
import { HeaderDropdown } from "@/components/header-dropdown"
import { useEffect, useRef } from "react"
import { optionalUuid } from "@/lib/content-context"
import { track } from "@/lib/analytics/client"

// Extract YouTube video ID from URL
function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]{11})/)
  return match ? match[1] : null
}

export default function LastSermonContent() {
  const router = useRouter()
  const { church, lastSermon, logo, hasChurch, isLoading } = useChurch()
  const { canAccessCore } = useSubscription()
  const sermonId = optionalUuid(lastSermon?.id)
  const displayed = useRef(new Set<string>())
  useEffect(() => {
    if (!church?.id || !lastSermon) return
    const context = JSON.stringify([church.id, sermonId || lastSermon.url, lastSermon.title])
    if (displayed.current.has(context)) return
    displayed.current.add(context)
    track('content_displayed', { contentType: 'sermon', viewId: crypto.randomUUID(), sermonId })
  }, [church?.id, sermonId, lastSermon?.title, lastSermon?.url])


  if (isLoading) return <div className="min-h-screen grid place-items-center text-white" role="status">Loading your church’s sermon…</div>

  // If no church or sermon, redirect back
  if (!hasChurch || !lastSermon) {
    return (
      <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-[#0c1929] shadow-2xl items-center justify-center p-6">
        <span className="material-symbols-outlined text-4xl text-amber-400 mb-4">error</span>
        <p className="text-white text-center mb-4">No sermon data available</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold"
        >
          Go Home
        </button>
      </div>
    )
  }

  const videoId = lastSermon.url ? getYouTubeId(lastSermon.url) : null
  const companionReady = !!lastSermon.summary && lastSermon.source !== 'imported_recording'

  const features = [
    { id: "context", label: "Context", sub: "Themes & scripture", icon: "history_edu", iconBg: "bg-orange-500", textColor: "text-orange-600" },
    { id: "stories", label: "Stories", sub: "Real-life moments", icon: "auto_stories", iconBg: "bg-emerald-500", textColor: "text-emerald-600" },
    { id: "poetry", label: "Poetry", sub: "Beautiful verses", icon: "edit_note", iconBg: "bg-fuchsia-500", textColor: "text-fuchsia-600" },
    { id: "imagery", label: "Imagery", sub: "Visual symbols", icon: "image", iconBg: "bg-cyan-500", textColor: "text-cyan-600" },
    { id: "songs", label: "Songs", sub: "Worship music", icon: "music_note", iconBg: "bg-rose-500", textColor: "text-rose-600" },
    { id: "lifelines", label: "Lifelines", sub: "Apply to your life", icon: "explore", iconBg: "bg-violet-500", textColor: "text-violet-600" },
  ]

  const sermonParams = new URLSearchParams({ source: 'sermon', title: lastSermon.title, summary: lastSermon.summary || '' })
  if (sermonId) sermonParams.set('sermonId', sermonId)
  if (church?.id) sermonParams.set('churchId', church.id)
  const talkParams = new URLSearchParams(sermonParams)
  talkParams.set('context', 'sermon')

  const handleFeatureClick = (featureId: string) => {
    if (!canAccessCore) {
      router.push("/subscription")
      return
    }
    // Route to existing pages with sermon context
    
    switch (featureId) {
      case 'context':
        router.push(`/context?${sermonParams}`)
        break
      case 'stories':
        router.push(`/stories?${sermonParams}`)
        break
      case 'poetry':
        router.push(`/poetry?${sermonParams}`)
        break
      case 'imagery':
        router.push(`/imagery?${sermonParams}`)
        break
      case 'songs':
        router.push(`/songs?${sermonParams}`)
        break
      case 'lifelines':
        router.push(`/deep-dive?${sermonParams}`)
        break
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-[#0c1929] shadow-2xl">
      
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0c1929]/95 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => router.push("/")}
            className="size-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <span className="material-symbols-outlined text-white">arrow_back</span>
          </button>
          <div className="flex-1">
            <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">{lastSermon.date || "Latest sermon"}</p>
            <h1 className="text-white font-bold truncate">{lastSermon.title}</h1>
          </div>
          {logo && (
            <img src={logo} alt={church?.name} className="h-10 w-auto" />
          )}
          <HeaderDropdown verseReference={lastSermon.title} />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        {lastSermon.source === 'imported_recording' && <div className="p-4 text-sm text-blue-100/80 space-y-2"><p>Imported from your church’s publishing source. You can watch the recording now; the sermon companion is not ready yet.</p>{lastSermon.sourceDescription && <details><summary className="cursor-pointer text-white">Description from the video publisher</summary><p className="mt-2 whitespace-pre-line">{lastSermon.sourceDescription}</p></details>}</div>}
        {lastSermon.scripture && <div className="p-4"><button className="rounded-xl bg-white/10 px-4 py-3 text-white text-left w-full" onClick={() => router.push(`/bible?${new URLSearchParams({ verse: lastSermon.scripture!, ...(sermonId ? { sermonId } : {}), churchId: church!.id })}`)}><span className="block text-xs text-amber-300">Open Scripture in the Bible</span>{lastSermon.scripture}</button></div>}
        {lastSermon.url && !videoId && /^https:\/\//i.test(lastSermon.url) && <div className="px-4 py-2"><a className="text-amber-200 underline" href={lastSermon.url} target="_blank" rel="noopener noreferrer">Watch this sermon</a></div>}
        
        {/* Video Hero */}
        {videoId ? (
          <div className="w-full aspect-video bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={lastSermon.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-amber-900/50 to-orange-900/50 flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl text-amber-400 mb-2">podium</span>
              <p className="text-white font-bold">{lastSermon.title}</p>
            </div>
          </div>
        )}

        {/* Summary */}
        {lastSermon.summary && (
          <div className="px-4 py-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-amber-400/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-amber-400">summarize</span>
                <h2 className="text-white font-bold">Summary</h2>
              </div>
              <p className="text-blue-100/80 text-sm leading-relaxed">{lastSermon.summary}</p>
            </div>
          </div>
        )}

        {/* Dive Deeper - Sermon Features */}
        {companionReady && <>
        <div className="px-4 pb-4">
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Dive Deeper</h2>
            <p className="text-sm text-gray-500 mb-4">Explore this sermon through different lenses</p>
            
            <div className="grid grid-cols-2 gap-3">
              {features.map((item) => {
                const isLocked = !canAccessCore
                return (
                  <button
                    key={item.id}
                    onClick={() => handleFeatureClick(item.id)}
                    className="flex flex-col items-start p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all active:scale-[0.98] hover:shadow-md text-left"
                  >
                    <div className={`size-10 rounded-full ${item.iconBg} text-white flex items-center justify-center mb-3`}>
                      <span className="material-symbols-outlined">{isLocked ? "lock" : item.icon}</span>
                    </div>
                    <span className="font-bold text-gray-900">{item.label}</span>
                    <span className={`text-xs ${item.textColor} mt-0.5 font-medium`}>{item.sub}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>


        {/* Let's Talk About This Sermon */}
        <div className="px-4 pb-6">
          <button
            onClick={() => router.push(`/talk?${talkParams}`)}
            className="w-full flex items-center p-4 bg-gray-900/50 backdrop-blur rounded-xl border border-indigo-400/30 transition-all active:scale-[0.98]"
          >
            <div className="size-10 rounded-full bg-indigo-500 text-white flex items-center justify-center mr-3">
              <span className="material-symbols-outlined">forum</span>
            </div>
            <div className="flex-1 text-left">
              <span className="font-bold text-white block">Let's Talk</span>
              <span className="text-xs text-blue-200/70 font-medium">Chat about this sermon</span>
            </div>
            <span className="material-symbols-outlined text-indigo-400">arrow_forward</span>
          </button>
        </div>
        </>}

      </main>
    </div>
  )
}
