"use client"


import { apiFetch } from "@/lib/api-base"
import { useRouter, useSearchParams } from "next/navigation"
import { useDevotional } from "@/context/devotional-context"
import { useEffect, useRef, useState } from "react"
import { HeaderDropdown } from "@/components/header-dropdown"
import { useChurch } from "@/context/church-context"
import { useLanguage } from "@/context/language-context"
import { contentCacheKey, optionalUuid } from "@/lib/content-context"
import { useContentDisplay } from "@/lib/use-content-display"
import { ContentContextBoundary } from "@/components/content-context-boundary"

function ContextContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { devotional } = useDevotional()
  const { church } = useChurch()
  const { language } = useLanguage()
  const mainRef = useRef<HTMLDivElement>(null)
  const [openSection, setOpenSection] = useState<number | null>(0)
  const [sermonContext, setSermonContext] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Check if we're in sermon mode
  const isSermonMode = searchParams.get('source') === 'sermon'
  const sermonTitle = searchParams.get('title') || ''
  const sermonSummary = searchParams.get('summary') || ''
  const sermonId = isSermonMode ? optionalUuid(searchParams.get('sermonId')) : undefined
  const contentId = isSermonMode ? sermonId || JSON.stringify([sermonTitle, sermonSummary]) : devotional.verse?.reference || ''
  const scopedCache = (kind: string) => contentCacheKey(kind, contentId, church?.id, language)

  const context = isSermonMode ? sermonContext : (devotional.context || {})
  const sourceReference = isSermonMode ? sermonTitle : devotional.verse?.reference

  useEffect(() => {
    window.scrollTo(0, 0)
    mainRef.current?.scrollTo(0, 0)
  }, [])

  // Generate sermon context when in sermon mode
  useEffect(() => {
    if (isSermonMode && sermonTitle && !sermonContext && !isGenerating) {
      generateSermonContext()
    }
  }, [isSermonMode, sermonTitle])

  const generateSermonContext = async () => {
    setIsGenerating(true)
    try {
      // Check cache first
      const cacheKey = scopedCache('sermon_context')
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const data = JSON.parse(cached)
          if (data.context && Object.keys(data.context).length > 0) {
            setSermonContext(data.context)
            setIsGenerating(false)
            return
          }
        } catch (e) {
          localStorage.removeItem(cacheKey)
        }
      }

      const response = await apiFetch("/api/generate-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "sermon",
          sermonTitle,
          sermonSummary,
          sermonId,
          churchId: church?.id,
          language,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSermonContext(data.context || {})
        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify({ context: data.context }))
      }
    } catch (error) {
      console.error("Error generating sermon context:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSectionClick = (index: number) => {
    setOpenSection(openSection === index ? null : index)
  }

  // Different context items for sermon vs verse
  const contextItems = isSermonMode ? [
    { title: "Main Themes", content: context.themes, icon: "category", color: "from-amber-500 to-orange-500" },
    { title: "Key Scripture", content: context.scriptures, icon: "menu_book", color: "from-emerald-500 to-teal-500" },
    { title: "Core Message", content: context.coreMessage, icon: "lightbulb", color: "from-blue-500 to-cyan-500" },
    { title: "Practical Application", content: context.application, icon: "build", color: "from-purple-500 to-pink-500" },
    { title: "Reflection Questions", content: context.questions, icon: "help", color: "from-rose-500 to-red-500" },
    { title: "Action Steps", content: context.actionSteps, icon: "checklist", color: "from-indigo-500 to-violet-500" },
  ] : [
    { title: "Who's Talking?", content: context.whoIsSpeaking, icon: "record_voice_over", color: "from-amber-500 to-orange-500" },
    { title: "Who Heard This First?", content: context.originalListeners, icon: "groups", color: "from-emerald-500 to-teal-500" },
    { title: "What Sparked This?", content: context.whyTheConversation, icon: "help_outline", color: "from-blue-500 to-cyan-500" },
    { title: "Picture the Scene", content: context.setting, icon: "calendar_month", color: "from-purple-500 to-pink-500" },
    { title: "What Was Going On?", content: context.historicalBackdrop, icon: "public", color: "from-rose-500 to-red-500" },
    { title: "Immediate Reactions", content: context.immediateImpact, icon: "fast_forward", color: "from-indigo-500 to-violet-500" },
    { title: "The Lasting Impact", content: context.longTermImpact, icon: "hourglass_bottom", color: "from-teal-500 to-green-500" },
  ]

  const hasContent = isSermonMode ? !!sermonContext : !!context.whoIsSpeaking
  useContentDisplay(isSermonMode ? !!sermonContext && Object.keys(sermonContext).length > 0 : !!context.whoIsSpeaking, scopedCache('context'), 'context', sermonId)

  return (
    <div
      ref={mainRef}
      className="relative flex min-h-screen w-full flex-col bg-[#0c1929] max-w-md mx-auto shadow-2xl"
    >
      {/* Header with Hero */}
      <header className="absolute top-0 z-50 flex h-16 w-full items-center justify-between p-4">
        <button
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm hover:bg-black/40 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <HeaderDropdown verseReference={sourceReference} />
      </header>

      <main className="flex-1 pb-10">
        {/* Hero Image */}
        <div className="relative w-full aspect-square bg-[#0c1929]">
          <div
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundImage: `url('${devotional.contextHeroImage || ""}')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c1929] via-[#0c1929]/70 to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-5 w-full">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500 text-white mb-3">
              <span className="material-symbols-outlined text-sm">{isSermonMode ? "podium" : "history_edu"}</span>
              <span className="text-xs font-semibold uppercase tracking-wide">
                {isSermonMode ? "Sermon Insights" : "The Backstory"}
              </span>
            </div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">{sourceReference}</h1>
          </div>
        </div>

        {/* Context Items - Accordion Style */}
        <div className="px-5 py-6 space-y-3">
          {contextItems.map(
            (item, i) =>
              item.content && (
                <div key={i} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden transition-all duration-300">
                  <button
                    onClick={() => handleSectionClick(i)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-10 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center text-white`}
                      >
                        <span className="material-symbols-outlined">{item.icon}</span>
                      </div>
                      <h2 className="text-base font-bold text-white">{item.title}</h2>
                    </div>
                    <span 
                      className={`material-symbols-outlined text-white/50 transition-transform duration-300 ${
                        openSection === i ? "rotate-180" : ""
                      }`}
                    >
                      expand_more
                    </span>
                  </button>
                  
                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      openSection === i ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="px-4 pb-5 pt-0">
                      <p className="text-blue-100/80 text-[15px] leading-relaxed whitespace-pre-wrap">{item.content}</p>
                    </div>
                  </div>
                </div>
              ),
          )}

          {/* Loading state */}
          {!hasContent && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="size-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 animate-pulse">
                <span className="material-symbols-outlined text-amber-400">{isSermonMode ? "podium" : "history_edu"}</span>
              </div>
              <p className="text-blue-200/70">
                {isGenerating 
                  ? "Analyzing sermon insights..." 
                  : isSermonMode 
                    ? "Preparing sermon context..." 
                    : "Digging into the backstory..."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function ContextPage() {
  return <ContentContextBoundary><ContextContent /></ContentContextBoundary>
}
