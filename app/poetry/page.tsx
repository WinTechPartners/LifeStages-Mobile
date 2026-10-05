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

function PoetryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { devotional } = useDevotional()
  const { church } = useChurch()
  const { language } = useLanguage()
  const mainRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<"classic" | "freeverse">("classic")
  const [sermonPoems, setSermonPoems] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  // Check if we're in sermon mode
  const isSermonMode = searchParams.get('source') === 'sermon'
  const sermonTitle = searchParams.get('title') || ''
  const sermonSummary = searchParams.get('summary') || ''
  const sermonId = isSermonMode ? optionalUuid(searchParams.get('sermonId')) : undefined
  const contentId = isSermonMode ? sermonId || JSON.stringify([sermonTitle, sermonSummary]) : devotional.verse?.reference || ''
  const scopedCache = (kind: string) => contentCacheKey(kind, contentId, church?.id, language)

  // Use sermon poems if in sermon mode, otherwise use devotional poems
  const poems = isSermonMode ? sermonPoems : (devotional.poetry || [])
  const sourceReference = isSermonMode ? sermonTitle : devotional.verse?.reference

  useEffect(() => {
    window.scrollTo(0, 0)
    mainRef.current?.scrollTo(0, 0)
  }, [])

  // Generate sermon-based poems when in sermon mode
  useEffect(() => {
    if (isSermonMode && sermonTitle && sermonPoems.length === 0 && !isGenerating) {
      generateSermonPoems()
    }
  }, [isSermonMode, sermonTitle])

  const generateSermonPoems = async () => {
    setIsGenerating(true)
    try {
      // Check cache first
      const cacheKey = scopedCache('sermon_poetry')
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const data = JSON.parse(cached)
          if (data.poetry?.length > 0) {
            setSermonPoems(data.poetry)
            setIsGenerating(false)
            return
          }
        } catch (e) {
          localStorage.removeItem(cacheKey)
        }
      }

      const savedProfile = localStorage.getItem("userProfile")
      const profile = savedProfile ? JSON.parse(savedProfile) : {}

      const response = await apiFetch("/api/generate-poetry", {
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
        setSermonPoems(data.poetry || [])
        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify({ poetry: data.poetry }))
      }
    } catch (error) {
      console.error("Error generating sermon poems:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const activePoem = activeTab === "classic" ? poems[0] : poems[1]
  useContentDisplay(!!activePoem?.text, scopedCache('poetry'), 'poetry', sermonId)

  return (
    <div
      ref={mainRef}
      className="relative flex min-h-screen w-full flex-col bg-[#0c1929] max-w-md mx-auto shadow-2xl"
    >
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#0c1929]/95 p-4 backdrop-blur-md">
        <button
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-base font-bold text-purple-400">Poetry</h2>
        <HeaderDropdown verseReference={sourceReference} />
      </div>

      <main className="flex-1 px-5 pt-6 pb-20">
        {/* Verse Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 text-purple-400 mb-4">
            <span className="material-symbols-outlined text-sm">{isSermonMode ? "podium" : "edit_note"}</span>
            <span className="text-xs font-semibold uppercase tracking-wide">
              {isSermonMode ? "From the Sermon" : "Poetic Reflections"}
            </span>
          </div>
          <h1 className="font-serif text-2xl font-light leading-snug md:text-3xl text-white">
            {isSermonMode 
              ? `"${sermonTitle}"`
              : devotional.verse?.text 
                ? `"${devotional.verse.text.split(" ").slice(0, 8).join(" ")}..."`
                : "Loading..."}
          </h1>
          <p className="mt-2 text-sm font-semibold tracking-wide text-blue-200/70">
            {sourceReference}
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("classic")}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === "classic"
                ? "bg-purple-500 text-white shadow-lg"
                : "bg-white/10 text-white/70 hover:text-white"
            }`}
          >
            Classic Verse
          </button>
          <button
            onClick={() => setActiveTab("freeverse")}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === "freeverse"
                ? "bg-purple-500 text-white shadow-lg"
                : "bg-white/10 text-white/70 hover:text-white"
            }`}
          >
            Free Verse
          </button>
        </div>

        {/* Single Poem Display */}
        {!activePoem ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="size-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 animate-pulse">
              <span className="material-symbols-outlined text-purple-400">edit_note</span>
            </div>
            <p className="text-blue-200/70">
              {isGenerating ? "Crafting poetry from sermon..." : "Crafting poetry..."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg">
            <div className="aspect-video w-full bg-gradient-to-br from-purple-900/30 to-pink-900/30">
              {activePoem.img ? (
                <img
                  alt="Poem visual"
                  className="w-full h-full object-cover"
                  src={activePoem.img || "/placeholder.svg"}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center animate-pulse">
                  <span className="material-symbols-outlined text-4xl text-purple-500/50">filter_vintage</span>
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  <span className="material-symbols-outlined text-lg">edit_note</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{activePoem.title}</h2>
                  <span className="text-xs text-purple-400 font-medium">{activePoem.type}</span>
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-6 mt-4">
                <div className="text-blue-100/80 leading-loose text-center font-serif italic">
                  {activePoem.text.split("\n").map((line: string, lineIdx: number) => (
                    <p key={lineIdx} className={line.trim() === "" ? "h-4" : "mb-1"}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function PoetryPage() {
  return <ContentContextBoundary><PoetryContent /></ContentContextBoundary>
}
