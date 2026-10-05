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

function StoriesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { devotional } = useDevotional()
  const { church } = useChurch()
  const { language } = useLanguage()
  const mainRef = useRef<HTMLDivElement>(null)
  const [storyType, setStoryType] = useState<"true" | "illustrated">("true")
  const [activeTab, setActiveTab] = useState(0)
  const [sermonStories, setSermonStories] = useState<any[]>([])
  const [trueStories, setTrueStories] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Check if we're in sermon mode
  const isSermonMode = searchParams.get('source') === 'sermon'
  const sermonTitle = searchParams.get('title') || ''
  const sermonSummary = searchParams.get('summary') || ''
  const sermonId = isSermonMode ? optionalUuid(searchParams.get('sermonId')) : undefined
  const contentId = isSermonMode ? sermonId || JSON.stringify([sermonTitle, sermonSummary]) : devotional.verse?.reference || ''
  const scopedCache = (kind: string) => contentCacheKey(kind, contentId, church?.id, language)

  // Use appropriate stories based on type and mode
  const illustratedStories = isSermonMode ? sermonStories : (devotional.stories || [])
  const stories = storyType === "true" ? trueStories : illustratedStories
  const sourceReference = isSermonMode ? sermonTitle : devotional.verse?.reference

  useEffect(() => {
    window.scrollTo(0, 0)
    mainRef.current?.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [activeTab, storyType])

  // Generate illustrated stories when in sermon mode
  useEffect(() => {
    if (isSermonMode && sermonTitle && sermonStories.length === 0 && !isGenerating && storyType === "illustrated") {
      generateSermonStories()
    }
  }, [isSermonMode, sermonTitle, storyType])

  // Search for true stories
  useEffect(() => {
    if (storyType === "true" && trueStories.length === 0 && !isSearching) {
      searchTrueStories()
    }
  }, [storyType])

  const searchTrueStories = async () => {
    setIsSearching(true)
    try {
      // Check cache first
      const searchTerm = isSermonMode ? sermonTitle : (devotional.verse?.reference || "faith")
      const cacheKey = scopedCache('true_stories')
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const data = JSON.parse(cached)
          if (data.stories?.length > 0) {
            setTrueStories(data.stories)
            setIsSearching(false)
            return
          }
        } catch (e) {
          localStorage.removeItem(cacheKey)
        }
      }

      const response = await apiFetch("/api/search-true-stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: isSermonMode ? sermonTitle : devotional.verse?.reference,
          context: isSermonMode ? sermonSummary : devotional.verse?.text,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setTrueStories(data.stories || [])
        localStorage.setItem(cacheKey, JSON.stringify({ stories: data.stories }))
      }
    } catch (error) {
      console.error("Error searching true stories:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const generateSermonStories = async () => {
    setIsGenerating(true)
    try {
      const cacheKey = scopedCache('sermon_stories')
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const data = JSON.parse(cached)
          if (data.stories?.length > 0) {
            setSermonStories(data.stories)
            setIsGenerating(false)
            return
          }
        } catch (e) {
          localStorage.removeItem(cacheKey)
        }
      }

      const savedProfile = localStorage.getItem("userProfile")
      const profile = savedProfile ? JSON.parse(savedProfile) : {}

      const response = await apiFetch("/api/generate-stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "sermon",
          sermonTitle,
          sermonSummary,
          sermonId,
          churchId: church?.id,
          language,
          ageRange: profile.ageRange || profile.age || "adult",
          stageSituation: profile.stageSituation || profile.lifeStage || "navigating daily life",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSermonStories(data.stories || [])
        localStorage.setItem(cacheKey, JSON.stringify({ stories: data.stories }))
      }
    } catch (error) {
      console.error("Error generating sermon stories:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const activeStory = stories[activeTab]
  useContentDisplay(storyType === 'true' ? !isSearching && trueStories.some(story => !!story?.title) : !!activeStory?.text, scopedCache('stories_' + storyType), 'stories', sermonId)
  const illustratedTabLabels = ["Today's World", "Different Time"]

  return (
    <div
      ref={mainRef}
      className="relative flex min-h-screen w-full flex-col bg-[#0c1929] max-w-md mx-auto shadow-2xl"
    >
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-[#0c1929]/95 backdrop-blur-md p-4 border-b border-white/10">
        <button
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-base font-bold text-emerald-400">Stories</h2>
        <HeaderDropdown verseReference={sourceReference} />
      </div>

      <main className="flex-1 pb-10">
        {/* Title Section */}
        <div className="px-6 py-6 mb-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
            <span className="material-symbols-outlined text-sm">{isSermonMode ? "podium" : "menu_book"}</span>
            <span className="text-xs font-semibold uppercase tracking-wide">
              {isSermonMode ? "From the Sermon" : "Real Life Moments"}
            </span>
          </div>
          <p className="text-emerald-400 font-bold text-sm tracking-widest uppercase mb-2">{sourceReference}</p>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight text-white">Stories That Hit Home</h1>
          <p className="mt-2 text-blue-200/70">
            {storyType === "true" 
              ? "Real testimonies and accounts from people who lived it."
              : "AI-illustrated parables showing how this applies to life."}
          </p>
        </div>

        {/* Story Type Toggle - True vs Illustrated */}
        <div className="px-4 mb-4">
          <div className="flex bg-white/10 rounded-xl p-1">
            <button
              onClick={() => { setStoryType("true"); setActiveTab(0) }}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                storyType === "true" ? "bg-emerald-500 text-white shadow-md" : "text-white/70 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-base">verified</span>
              True Stories
            </button>
            <button
              onClick={() => { setStoryType("illustrated"); setActiveTab(0) }}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                storyType === "illustrated" ? "bg-emerald-500 text-white shadow-md" : "text-white/70 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              Illustrated
            </button>
          </div>
        </div>

        {/* Sub-tabs for Illustrated stories */}
        {storyType === "illustrated" && (
          <div className="px-4 mb-6">
            <div className="flex bg-white/5 rounded-xl p-1">
              {illustratedTabLabels.map((label, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeTab === i ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Story Content */}
        <div className="px-4 mb-10">
          {storyType === "true" ? (
            // True Stories View
            isSearching ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-2xl border border-white/10">
                <div className="size-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 animate-pulse">
                  <span className="material-symbols-outlined text-emerald-400">search</span>
                </div>
                <p className="text-blue-200/70">Searching for real stories...</p>
              </div>
            ) : trueStories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-2xl border border-white/10">
                <div className="size-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-amber-400">info</span>
                </div>
                <p className="text-blue-200/70 text-center px-6">No true stories found. Try the illustrated stories instead.</p>
                <button
                  onClick={() => setStoryType("illustrated")}
                  className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-semibold"
                >
                  View Illustrated
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {trueStories.map((story, idx) => (
                  <div key={idx} className="bg-white/5 rounded-2xl overflow-hidden shadow-lg border border-white/10">
                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="size-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shrink-0">
                          <span className="material-symbols-outlined">verified</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-white text-lg">{story.title}</h3>
                          {story.source && (
                            <p className="text-xs text-emerald-400/70 mt-0.5">{story.source}</p>
                          )}
                        </div>
                      </div>
                      <p className="text-blue-100/80 leading-relaxed text-[15px]">{story.summary}</p>
                      {story.url && (
                        <a
                          href={story.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-3 text-sm text-emerald-400 hover:text-emerald-300"
                        >
                          <span>Read full story</span>
                          <span className="material-symbols-outlined text-base">open_in_new</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Illustrated Stories View
            !activeStory ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-2xl border border-white/10">
                <div className="size-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 animate-pulse">
                  <span className="material-symbols-outlined text-emerald-400">menu_book</span>
                </div>
                <p className="text-blue-200/70">
                  {isGenerating ? "Crafting story from sermon..." : "Crafting story..."}
                </p>
              </div>
            ) : (
              <div className="bg-white/5 rounded-2xl overflow-hidden shadow-lg border border-white/10">
                {activeStory.img ? (
                  <img
                    alt={activeStory.title}
                    className="w-full aspect-video object-cover"
                    src={activeStory.img || "/placeholder.svg"}
                  />
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-emerald-900/30 to-teal-900/30 animate-pulse flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-500/50 text-4xl">image</span>
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">
                      <span className="material-symbols-outlined">auto_stories</span>
                    </div>
                    <h3 className="font-serif text-xl font-bold text-white">{activeStory.title}</h3>
                  </div>
                  <div className="prose max-w-none text-blue-100/80 leading-relaxed text-[16px]">
                    <p className="mb-4 whitespace-pre-wrap">{activeStory.text}</p>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  )
}

export default function StoriesPage() {
  return <ContentContextBoundary><StoriesContent /></ContentContextBoundary>
}
