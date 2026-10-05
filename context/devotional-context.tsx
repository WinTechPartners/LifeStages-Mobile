"use client"

import React, { createContext, useContext, useState, type ReactNode, useCallback, useRef } from "react"
import { useLanguage } from "./language-context"
import { apiUrl } from "@/lib/api-base"
import { useChurch } from "./church-context"

export interface VerseData {
  reference: string
  version: string
  text: string
}

export interface ContextData {
  whoIsSpeaking?: string
  originalListeners?: string
  whyTheConversation?: string
  historicalBackdrop?: string
  immediateImpact?: string
  longTermImpact?: string
  setting?: string
}

export interface StoryData {
  title: string
  text: string
  imagePrompt?: string
  img?: string
}

export interface PoetryData {
  title: string
  type: string
  text: string
  imagePrompt?: string
  img?: string
}

export interface ImageryData {
  title: string
  sub: string
  icon: string
  imagePrompt?: string
  img?: string
}

export interface SongData {
  title: string
  sub: string
  lyrics: string
  prompt: string
  imagePrompt?: string
  img?: string
}

export interface DevotionalData {
  verse?: VerseData
  interpretation?: string
  heroImage?: string
  heroImagePrompt?: string
  context?: ContextData
  contextImagePrompt?: string
  contextHeroImage?: string
  stories?: StoryData[]
  poetry?: PoetryData[]
  imagery?: ImageryData[]
  songs?: SongData
  source?: string
  reflection?: string
  application?: string
  prayer?: string
  cache_hit?: boolean
}

interface LoadingStates {
  verse: boolean
  interpretation: boolean
  context: boolean
  stories: boolean
  poetry: boolean
  imagery: boolean
  songs: boolean
}

interface DevotionalContextType {
  devotional: DevotionalData
  setDevotional: React.Dispatch<React.SetStateAction<DevotionalData>>
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  loadingStep: string
  setLoadingStep: React.Dispatch<React.SetStateAction<string>>
  loadingStates: LoadingStates
  generateDevotional: (source?: string) => Promise<void>
  generateForVerse: (verseQuery: string) => Promise<void>
  userName: string
  setUserName: React.Dispatch<React.SetStateAction<string>>
  clearCache: () => void
  isContentReady: boolean
}

const DevotionalContext = createContext<DevotionalContextType | null>(null)

export function useDevotional() {
  const context = useContext(DevotionalContext)
  if (!context) {
    throw new Error("useDevotional must be used within a DevotionalProvider")
  }
  return context
}

const initialLoadingStates: LoadingStates = {
  verse: false,
  interpretation: false,
  context: false,
  stories: false,
  poetry: false,
  imagery: false,
  songs: false,
}

interface UserProfile {
  ageRange: string
  gender: string
  stageSituation: string
  language?: string
  contentStyle?: "casual" | "academic"
  churchId?: string | null
}

export function DevotionalProvider({ children }: { children: ReactNode }) {
  const [devotional, setDevotional] = useState<DevotionalData>({})
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState("")
  const [loadingStates, setLoadingStates] = useState<LoadingStates>(initialLoadingStates)
  const [userName, setUserName] = useState("Friend")
  const [isContentReady, setIsContentReady] = useState(false)
  const { language: selectedLanguage } = useLanguage()
  const { church, isLoading: churchLoading } = useChurch()
  
  // Track loading state to prevent duplicate calls
  const isLoadingRef = useRef(false)
  const lastLoadedKeyRef = useRef<string | null>(null)
  const premiumGeneratedRef = useRef(false)

  const getFreshProfile = useCallback((): UserProfile => {
    try {
      const savedProfile = localStorage.getItem("userProfile")
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile)
        return {
          ageRange: parsed.ageRange || "adult",
          gender: parsed.gender || "male",
          stageSituation: parsed.stageSituation || parsed.season || "General",
          language: selectedLanguage,
          contentStyle: parsed.contentStyle || "casual",
          churchId: church?.id || null,
        }
      }
    } catch (e) {
      console.error("Error parsing user profile:", e)
    }
    return {
      ageRange: "adult",
      gender: "male",
      stageSituation: "General",
      language: selectedLanguage,
      contentStyle: "casual",
      churchId: church?.id || null,
    }
  }, [selectedLanguage, church?.id])

  // Load username on mount
  React.useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile")
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile)
        if (parsed.fullName) {
          setUserName(parsed.fullName.split(" ")[0])
        }
      } catch (e) {
        console.error("Error parsing user profile:", e)
      }
    }
  }, [])

  /**
   * Get verse FAST (database or YouVersion)
   */
  const getVerseFast = useCallback(async (source: string, churchId?: string | null): Promise<VerseData | null> => {
    if (source === "YouVersion") {
      try {
        const url = churchId 
          ? apiUrl(`/api/today-verse?church_id=${encodeURIComponent(churchId)}`)
          : apiUrl('/api/today-verse')
        
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          if (data.reference && data.text) {
            return { reference: data.reference, text: data.text, version: 'NIV' }
          }
        }
      } catch (e) {
        console.error("[Fast] Database lookup failed:", e)
      }
    }
    
    try {
      const response = await fetch(apiUrl("/api/generate-verse"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          source.startsWith("Theme:") ? { source } : 
          /^[A-Za-z0-9\s]+\d+:\d+/.test(source) ? { verseQuery: source } : 
          { source }
        ),
      })
      if (response.ok) {
        return await response.json()
      }
    } catch (e) {
      console.error("[Fast] API verse fetch failed:", e)
    }
    
    return null
  }, [])

  /**
   * Get devotional content (Supabase cached)
   */
  const getDevotionalContent = useCallback(async (verse: VerseData, profile: UserProfile): Promise<DevotionalData | null> => {
    try {
      const response = await fetch(apiUrl("/api/devotional"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verse_reference: verse.reference,
          verse_text: verse.text,
          age_range: profile.ageRange,
          gender: profile.gender,
          life_stage: profile.stageSituation,
          language: profile.language || "en",
          church_id: profile.churchId || null,
          content_style: profile.contentStyle || "casual",
        }),
      })

      if (!response.ok) return null

      const data = await response.json()
      
      return {
        verse: data.devotional.verse,
        interpretation: data.devotional.reflection,
        reflection: data.devotional.reflection,
        application: data.devotional.application,
        prayer: data.devotional.prayer,
        heroImage: data.devotional.image_url,
        cache_hit: data.cache_hit,
      }
    } catch (error) {
      console.error("[Devotional] API error:", error)
      return null
    }
  }, [])

  /**
   * Generate premium content in background - ONLY ONCE per session
   */
  const generatePremiumContentInBackground = useCallback((verse: VerseData, profile: UserProfile) => {
    // Only generate premium content once per session
    if (premiumGeneratedRef.current) {
      console.log("[Premium] Already generated this session, skipping")
      return
    }
    premiumGeneratedRef.current = true
    
    const profilePayload = {
      verseReference: verse.reference,
      verseText: verse.text,
      ageRange: profile.ageRange,
      gender: profile.gender,
      stageSituation: profile.stageSituation,
      language: profile.language || "en",
      contentStyle: profile.contentStyle || "casual",
    }

    console.log("[Premium] Starting background generation...")

    // CONTEXT
    setLoadingStates(prev => ({ ...prev, context: true }))
    fetch(apiUrl("/api/generate-context"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profilePayload),
    })
      .then(res => res.json())
      .then(data => {
        setDevotional(prev => ({ ...prev, context: data.context, contextImagePrompt: data.contextImagePrompt }))
        setLoadingStates(prev => ({ ...prev, context: false }))
      })
      .catch(() => setLoadingStates(prev => ({ ...prev, context: false })))

    // STORIES - fetch content then generate images
    setLoadingStates(prev => ({ ...prev, stories: true }))
    Promise.all([
      fetch(apiUrl("/api/generate-story"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profilePayload, storyType: "contemporary" }) }).then(res => res.json()),
      fetch(apiUrl("/api/generate-story"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profilePayload, storyType: "historical" }) }).then(res => res.json()),
    ])
      .then(async ([s1, s2]) => {
        const stories = [s1, s2]
        // Set stories immediately (without images)
        setDevotional(prev => ({ ...prev, stories }))
        setLoadingStates(prev => ({ ...prev, stories: false }))
        
        // Generate images for each story in parallel
        const imagePromises = stories.map(async (story: StoryData, index: number) => {
          if (story.imagePrompt) {
            try {
              const imgResponse = await fetch(apiUrl("/api/generate-image"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: `${story.imagePrompt}. Cinematic, warm lighting, emotional, no text.`,
                  width: 768,
                  height: 512,
                  ageRange: profile.ageRange
                })
              })
              if (imgResponse.ok) {
                const imgData = await imgResponse.json()
                return { index, img: imgData.imageUrl }
              }
            } catch (e) {
              console.error(`[Stories] Failed to generate image ${index}:`, e)
            }
          }
          return null
        })
        
        const results = await Promise.all(imagePromises)
        results.forEach(result => {
          if (result && result.img) {
            setDevotional(prev => {
              const updatedStories = [...(prev.stories || [])]
              if (updatedStories[result.index]) {
                updatedStories[result.index] = { ...updatedStories[result.index], img: result.img }
              }
              return { ...prev, stories: updatedStories }
            })
          }
        })
      })
      .catch(() => setLoadingStates(prev => ({ ...prev, stories: false })))

    // POETRY - fetch content then generate images
    setLoadingStates(prev => ({ ...prev, poetry: true }))
    Promise.all([
      fetch(apiUrl("/api/generate-poem"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profilePayload, poemType: "classic" }) }).then(res => res.json()),
      fetch(apiUrl("/api/generate-poem"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profilePayload, poemType: "freeverse" }) }).then(res => res.json()),
    ])
      .then(async ([p1, p2]) => {
        const poems = [p1.poem, p2.poem]
        // Set poetry immediately (without images)
        setDevotional(prev => ({ ...prev, poetry: poems }))
        setLoadingStates(prev => ({ ...prev, poetry: false }))
        
        // Generate images for each poem in parallel
        const imagePromises = poems.map(async (poem: PoetryData, index: number) => {
          if (poem.imagePrompt) {
            try {
              const imgResponse = await fetch(apiUrl("/api/generate-image"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: `${poem.imagePrompt}. Artistic, ethereal, poetic mood, soft lighting, no text.`,
                  width: 512,
                  height: 768,
                  ageRange: profile.ageRange
                })
              })
              if (imgResponse.ok) {
                const imgData = await imgResponse.json()
                return { index, img: imgData.imageUrl }
              }
            } catch (e) {
              console.error(`[Poetry] Failed to generate image ${index}:`, e)
            }
          }
          return null
        })
        
        const results = await Promise.all(imagePromises)
        results.forEach(result => {
          if (result && result.img) {
            setDevotional(prev => {
              const updatedPoetry = [...(prev.poetry || [])]
              if (updatedPoetry[result.index]) {
                updatedPoetry[result.index] = { ...updatedPoetry[result.index], img: result.img }
              }
              return { ...prev, poetry: updatedPoetry }
            })
          }
        })
      })
      .catch(() => setLoadingStates(prev => ({ ...prev, poetry: false })))

    // IMAGERY - fetch content then generate images
    setLoadingStates(prev => ({ ...prev, imagery: true }))
    fetch(apiUrl("/api/generate-imagery"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profilePayload) })
      .then(res => res.json())
      .then(async (data) => {
        const imageryItems = data.imagery || []
        // Set imagery immediately (without images)
        setDevotional(prev => ({ ...prev, imagery: imageryItems }))
        setLoadingStates(prev => ({ ...prev, imagery: false }))
        
        // Generate images for each imagery item in parallel
        const imagePromises = imageryItems.map(async (item: ImageryData, index: number) => {
          if (item.imagePrompt) {
            try {
              const imgResponse = await fetch(apiUrl("/api/generate-image"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: `${item.imagePrompt}. Symbolic, artistic, warm lighting, no text.`,
                  width: 512,
                  height: 512,
                  ageRange: profile.ageRange
                })
              })
              if (imgResponse.ok) {
                const imgData = await imgResponse.json()
                return { index, img: imgData.imageUrl }
              }
            } catch (e) {
              console.error(`[Imagery] Failed to generate image ${index}:`, e)
            }
          }
          return null
        })
        
        // Update imagery items as images complete
        const results = await Promise.all(imagePromises)
        results.forEach(result => {
          if (result && result.img) {
            setDevotional(prev => {
              const updatedImagery = [...(prev.imagery || [])]
              if (updatedImagery[result.index]) {
                updatedImagery[result.index] = { ...updatedImagery[result.index], img: result.img }
              }
              return { ...prev, imagery: updatedImagery }
            })
          }
        })
      })
      .catch(() => setLoadingStates(prev => ({ ...prev, imagery: false })))

    // SONGS
    setLoadingStates(prev => ({ ...prev, songs: true }))
    fetch(apiUrl("/api/generate-songs"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profilePayload) })
      .then(res => res.json())
      .then(data => {
        setDevotional(prev => ({ ...prev, songs: data.songs }))
        setLoadingStates(prev => ({ ...prev, songs: false }))
      })
      .catch(() => setLoadingStates(prev => ({ ...prev, songs: false })))
  }, [])

  /**
   * MAIN: Generate devotional
   */
  const generateDevotional = useCallback(async (source = "YouVersion") => {
    // The profile stores a church code; APIs require the resolved church UUID.
    if (churchLoading) return
    // STRICT duplicate prevention
    if (isLoadingRef.current) {
      console.log("[Generate] Already loading, ignoring duplicate call")
      return
    }
    
    const profile = getFreshProfile()
    const cacheKey = JSON.stringify([source, profile.churchId, profile.ageRange, profile.gender, profile.stageSituation, profile.language, profile.contentStyle])
    
    // If we already loaded this exact combination, skip
    if (lastLoadedKeyRef.current === cacheKey && devotional.verse) {
      console.log("[Generate] Same content already loaded, skipping")
      return
    }
    
    isLoadingRef.current = true
    console.log("[Generate] Starting load for:", cacheKey)
    
    setIsLoading(true)
    setIsContentReady(false)
    setLoadingStates({ ...initialLoadingStates, verse: true })
    setLoadingStep("Finding today's verse...")

    try {
      const verse = await getVerseFast(source, profile.churchId)
      
      if (!verse) {
        throw new Error("No verse available")
      }

      // Show verse immediately
      setDevotional({ verse, source })
      setLoadingStates(prev => ({ ...prev, verse: false, interpretation: true }))
      setLoadingStep("Loading your devotional...")

      // Get devotional content
      const content = await getDevotionalContent(verse, profile)
      
      if (content) {
        setDevotional(prev => ({
          ...prev,
          ...content,
          verse,
          source,
        }))

          // Generate hero image if missing from cache
                if (!content.heroImage && verse) {
                            fetch(apiUrl('/api/generate-image'), {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                                          prompt: 'Serene landscape with golden sunlight breaking through clouds, peaceful atmosphere, cinematic composition, warm lighting, inspirational, no text.',
                                                          width: 1024,
                                                          height: 768,
                                                          ageRange: profile.ageRange
                                          })
                            })
                              .then(res => res.json())
                              .then(data => {
                                              if (data.imageUrl) {
                                                                setDevotional(prev => ({ ...prev, heroImage: data.imageUrl }))
                                              }
                              })
                              .catch(err => console.error('[HeroImage] Generation failed:', err))
                }
        
        // Mark as ready
        setLoadingStates(prev => ({ ...prev, interpretation: false }))
        setIsLoading(false)
        setIsContentReady(true)
        lastLoadedKeyRef.current = cacheKey
        
        // Fire premium content in background (only once)
        generatePremiumContentInBackground(verse, profile)
        
      } else {
        setLoadingStates(prev => ({ ...prev, interpretation: false }))
        setIsLoading(false)
        setIsContentReady(true)
      }

    } catch (error) {
      console.error("[Generate] Failed:", error)
      setLoadingStep("Connection error. Please try again.")
      setTimeout(() => {
        setIsLoading(false)
        setLoadingStates(initialLoadingStates)
      }, 2000)
    } finally {
      isLoadingRef.current = false
    }
  }, [churchLoading, devotional.verse, generatePremiumContentInBackground, getDevotionalContent, getFreshProfile, getVerseFast])

  const generateForVerse = useCallback(async (verseQuery: string) => {
    lastLoadedKeyRef.current = null
    premiumGeneratedRef.current = false
    await generateDevotional(verseQuery)
  }, [generateDevotional])

  const clearCache = useCallback(() => {
    lastLoadedKeyRef.current = null
    premiumGeneratedRef.current = false
    setDevotional({})
  }, [])

  // Handle language changes
  const prevLanguageRef = useRef(selectedLanguage)
  React.useEffect(() => {
    if (prevLanguageRef.current === selectedLanguage) return
    prevLanguageRef.current = selectedLanguage
    if (devotional.verse && !isLoading) {
      lastLoadedKeyRef.current = null
      premiumGeneratedRef.current = false
      generateDevotional(devotional.source || "YouVersion")
    }
  }, [selectedLanguage, devotional.verse, devotional.source, isLoading, generateDevotional])

  return (
    <DevotionalContext.Provider
      value={{
        devotional,
        setDevotional,
        isLoading,
        setIsLoading,
        loadingStep,
        setLoadingStep,
        loadingStates,
        generateDevotional,
        generateForVerse,
        userName,
        setUserName,
        clearCache,
        isContentReady,
      }}
    >
      {children}
    </DevotionalContext.Provider>
  )
}
