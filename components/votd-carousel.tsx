"use client"
import { AppImage } from "@/components/app-image"

import { useState, useEffect, useRef, useCallback } from "react"
import { hapticMedium, hapticTap, nativeShare, getCachedVerseForDate, cacheVerseForDate, type CachedVerse } from "@/lib/native-features"
import { apiUrl } from "@/lib/api-base"

interface VOTDDay {
  date: string
  dateLabel: string
  dayLabel: string
  verse?: { reference: string; text: string }
  interpretation?: string
  heroImage?: string
  isLoading: boolean
  isToday: boolean
}

interface VOTDCarouselProps {
  todayVerse?: { reference: string; text: string; version?: string }
  todayInterpretation?: string
  todayHeroImage?: string
  todayIsLoading: boolean
  interpretationLoading: boolean
  canAccessPremium: boolean
  churchId?: string | null
  onRetry: () => void
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function getDayLabel(dateStr: string, index: number): string {
  if (index === 0) return "Today"
  if (index === 1) return "Yesterday"
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("en-US", { weekday: "long" })
}

function getPastDates(count: number): string[] {
  const dates: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split("T")[0])
  }
  return dates
}

export function VOTDCarousel({
  todayVerse,
  todayInterpretation,
  todayHeroImage,
  todayIsLoading,
  interpretationLoading,
  canAccessPremium,
  churchId,
  onRetry,
}: VOTDCarouselProps) {
  const TOTAL_DAYS = 8 // today + 7 previous
  const dates = getPastDates(TOTAL_DAYS)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [days, setDays] = useState<VOTDDay[]>([])
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchDelta, setTouchDelta] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const fetchedDates = useRef<Set<string>>(new Set())

  // Initialize days array
  useEffect(() => {
    const initialDays = dates.map((date, i) => {
      if (i === 0) {
        return {
          date,
          dateLabel: formatDateLabel(date),
          dayLabel: "Today",
          verse: todayVerse,
          interpretation: todayInterpretation,
          heroImage: todayHeroImage,
          isLoading: todayIsLoading,
          isToday: true,
        }
      }
      // Check cache for previous days
      const cached = getCachedVerseForDate(date)
      return {
        date,
        dateLabel: formatDateLabel(date),
        dayLabel: getDayLabel(date, i),
        verse: cached ? { reference: cached.reference, text: cached.text } : undefined,
        interpretation: cached?.interpretation,
        heroImage: cached?.heroImage,
        isLoading: false,
        isToday: false,
      }
    })
    setDays(initialDays)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep today's data in sync
  useEffect(() => {
    setDays(prev => prev.map((day, i) => {
      if (i === 0) {
        return {
          ...day,
          verse: todayVerse,
          interpretation: todayInterpretation,
          heroImage: todayHeroImage,
          isLoading: todayIsLoading,
        }
      }
      return day
    }))
  }, [todayVerse, todayInterpretation, todayHeroImage, todayIsLoading])

  // Fetch a previous day's verse from API
  const fetchDayVerse = useCallback(async (date: string, index: number) => {
    if (fetchedDates.current.has(date)) return
    fetchedDates.current.add(date)

    // Check cache first
    const cached = getCachedVerseForDate(date)
    if (cached?.reference) {
      setDays(prev => prev.map((d, i) => i === index ? {
        ...d,
        verse: { reference: cached.reference, text: cached.text },
        interpretation: cached.interpretation,
        heroImage: cached.heroImage,
        isLoading: false,
      } : d))
      return
    }

    // Fetch from API
    setDays(prev => prev.map((d, i) => i === index ? { ...d, isLoading: true } : d))

    try {
      const churchParam = churchId ? `&church_id=${encodeURIComponent(churchId)}` : ""
      const verseRes = await fetch(apiUrl(`/api/today-verse?date=${date}${churchParam}`))
      if (!verseRes.ok) throw new Error("Failed to fetch verse")

      const verseData = await verseRes.json()
      if (!verseData.reference || !verseData.text) {
        setDays(prev => prev.map((d, i) => i === index ? { ...d, isLoading: false } : d))
        return
      }

      const verse = { reference: verseData.reference, text: verseData.text }

      // Update immediately with verse
      setDays(prev => prev.map((d, i) => i === index ? { ...d, verse, isLoading: false } : d))

      // Try to get cached devotional content for this verse
      const profileRaw = localStorage.getItem("userProfile")
      const profile = profileRaw ? JSON.parse(profileRaw) : {}

      const devRes = await fetch(apiUrl("/api/devotional"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verse_reference: verse.reference,
          verse_text: verse.text,
          age_range: profile.ageRange || "adult",
          gender: profile.gender || "male",
          life_stage: profile.stageSituation || "General",
          language: profile.language || "en",
          church_id: profile.churchId || null,
          content_style: profile.contentStyle || "casual",
        }),
      })

      if (devRes.ok) {
        const devData = await devRes.json()
        const interpretation = devData.devotional?.reflection
        const heroImage = devData.devotional?.image_url

        setDays(prev => prev.map((d, i) => i === index ? {
          ...d,
          interpretation,
          heroImage,
        } : d))

        // Cache for future
        cacheVerseForDate(date, {
          reference: verse.reference,
          text: verse.text,
          interpretation,
          heroImage,
        })
      }
    } catch (e) {
      console.error(`[VOTDCarousel] Failed to fetch verse for ${date}:`, e)
      setDays(prev => prev.map((d, i) => i === index ? { ...d, isLoading: false } : d))
    }
  }, [churchId])

  // Prefetch adjacent days when index changes
  useEffect(() => {
    // Fetch current day if not today and not yet loaded
    if (currentIndex > 0 && !days[currentIndex]?.verse) {
      fetchDayVerse(dates[currentIndex], currentIndex)
    }
    // Prefetch next day too
    const nextIdx = currentIndex + 1
    if (nextIdx < TOTAL_DAYS && !days[nextIdx]?.verse) {
      fetchDayVerse(dates[nextIdx], nextIdx)
    }
  }, [currentIndex, days, dates, fetchDayVerse])

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
    setIsSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const delta = e.touches[0].clientX - touchStart
    // Resist at edges
    if ((currentIndex === 0 && delta > 0) || (currentIndex === TOTAL_DAYS - 1 && delta < 0)) {
      setTouchDelta(delta * 0.3) // rubber band
    } else {
      setTouchDelta(delta)
    }
  }

  const handleTouchEnd = () => {
    if (touchStart === null) return
    const threshold = 60

    if (touchDelta < -threshold && currentIndex < TOTAL_DAYS - 1) {
      // Swipe left → go to older day (right in time)
      setCurrentIndex(prev => prev + 1)
      hapticMedium()
    } else if (touchDelta > threshold && currentIndex > 0) {
      // Swipe right → go to newer day (left in time, toward today)
      setCurrentIndex(prev => prev - 1)
      hapticMedium()
    }

    setTouchStart(null)
    setTouchDelta(0)
    setIsSwiping(false)
  }

  const handleShareVerse = (day: VOTDDay) => {
    if (day.verse) {
      hapticTap()
      nativeShare({
        title: `${day.verse.reference} — LifeStages Bible`,
        text: `"${day.verse.text}" — ${day.verse.reference}`,
        url: "https://www.bibleforlifestages.com",
      })
    }
  }

  const goToDay = (index: number) => {
    hapticTap()
    setCurrentIndex(index)
  }

  const day = days[currentIndex]

  return (
    <div className="relative">
      {/* Day indicator dots + label */}
      <div className="px-5 pb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-amber-400/80">
            {day?.dayLabel || "Today"}
          </p>
          <p className="text-[10px] text-blue-200/40">
            {day?.dateLabel}
          </p>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          {dates.map((_, i) => (
            <button
              key={i}
              onClick={() => goToDay(i)}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "w-6 h-1.5 bg-amber-400"
                  : "w-1.5 h-1.5 bg-white/20 hover:bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Swipeable VOTD Card */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="overflow-hidden touch-pan-y"
      >
        <div
          className="transition-transform duration-300 ease-out"
          style={{
            transform: isSwiping ? `translateX(${touchDelta}px)` : undefined,
          }}
        >
          {day ? (
            <div className="px-5">
              {/* Verse of the Day Header */}
              <div className="pb-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
                  <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-[0.15em]">
                    Verse of the Day
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
                </div>

                {/* Hero Image */}
                {day.heroImage ? (
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
                    <AppImage
                      src={day.heroImage}
                      alt="Verse illustration"
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c1929] via-transparent to-transparent" />
                    <button
                      onClick={() => handleShareVerse(day)}
                      className="absolute top-3 right-3 size-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <span className="material-symbols-outlined text-white text-lg">share</span>
                    </button>
                    {!canAccessPremium && (
                      <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm">
                        <span className="text-[9px] text-blue-200/60">Generic image</span>
                      </div>
                    )}
                  </div>
                ) : day.isLoading || (day.isToday && todayIsLoading) ? (
                  <div className="w-full h-40 bg-gradient-to-br from-indigo-900/40 to-blue-900/40 rounded-2xl flex flex-col items-center justify-center border border-white/5">
                    <div className="size-8 border-3 border-amber-400/40 border-t-amber-400 rounded-full animate-spin mb-2" />
                    <p className="text-xs text-blue-200/40">Creating your image...</p>
                  </div>
                ) : day.verse ? (
                  <div className="w-full h-40 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-2xl flex items-center justify-center border border-white/5">
                    <span className="material-symbols-outlined text-amber-400/30 text-5xl">image</span>
                  </div>
                ) : null}
              </div>

              {/* Verse Text */}
              <div className="py-4">
                {day.verse ? (
                  <div className="text-center">
                    <p className="font-serif text-lg leading-relaxed text-white/90 mb-3">
                      &ldquo;{day.verse.text}&rdquo;
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-px w-5 bg-amber-400/30" />
                      <p className="text-xs text-amber-400/70 font-semibold tracking-wide">
                        {day.verse.reference}
                      </p>
                      <div className="h-px w-5 bg-amber-400/30" />
                    </div>
                  </div>
                ) : day.isLoading ? (
                  <div className="flex flex-col items-center py-8">
                    <div className="size-10 border-[3px] border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-blue-200/60 text-sm">Finding verse...</p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="inline-flex items-center justify-center size-12 rounded-full bg-amber-400/10 mb-3">
                      <span className="material-symbols-outlined text-amber-400">cloud_off</span>
                    </div>
                    <p className="text-blue-200/50 text-sm">
                      {day.isToday ? "Unable to load verse" : "No verse cached for this day"}
                    </p>
                    {day.isToday && (
                      <button
                        onClick={() => { hapticTap(); onRetry() }}
                        className="mt-3 px-5 py-2 bg-amber-500 text-white rounded-full font-semibold text-sm active:scale-95 transition-transform flex items-center gap-2 mx-auto"
                      >
                        <span className="material-symbols-outlined text-base">refresh</span>
                        Try Again
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Friendly Breakdown */}
              {day.interpretation ? (
                <div className="pb-4">
                  <div className="bg-white/[0.05] backdrop-blur-sm rounded-2xl p-4 border border-white/[0.08]">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="size-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-base">auto_awesome</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Friendly Breakdown</h3>
                        {!canAccessPremium && (
                          <span className="text-[9px] text-blue-200/40">Free · Generic. Premium adds personalization.</span>
                        )}
                      </div>
                    </div>
                    <p className="text-blue-100/70 text-[13px] leading-relaxed">{day.interpretation}</p>
                  </div>
                </div>
              ) : (day.isToday && interpretationLoading) || day.isLoading ? (
                <div className="pb-4">
                  <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.06]">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="size-8 rounded-full bg-white/10 flex items-center justify-center">
                        <div className="size-4 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
                      </div>
                      <h3 className="text-sm font-bold text-white/40">Personalizing for you...</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3.5 bg-white/[0.06] rounded-lg animate-pulse" />
                      <div className="h-3.5 bg-white/[0.06] rounded-lg animate-pulse w-5/6" />
                      <div className="h-3.5 bg-white/[0.06] rounded-lg animate-pulse w-3/5" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Swipe hint (only on first visit) */}
      {currentIndex === 0 && days.length > 1 && (
        <div className="flex items-center justify-center gap-1 pt-1 pb-2 animate-pulse">
          <span className="material-symbols-outlined text-blue-200/30 text-sm">swipe_left</span>
          <span className="text-[10px] text-blue-200/25">Swipe for previous days</span>
        </div>
      )}
    </div>
  )
}
