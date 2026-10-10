"use client"

import { usePathname } from "next/navigation"
import { normalizeLifeCircumstances } from "@/lib/life-circumstances"
import { loadContentExtras } from "@/lib/content-loader"
import React, { createContext, useContext, useState, type ReactNode, useCallback, useRef } from "react"
import { useLanguage } from "./language-context"
import { useSubscription } from "./subscription-context"
import { apiUrl, apiFetch } from "@/lib/api-base"
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
  firstHalf?: string
  secondHalf?: string
  midImagePrompt?: string
  midImg?: string
  format?: string
  imageErrors?: string[]
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
  contentErrors: Record<string,string>
  retryContent: () => void
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
  country?: string
  email?: string | null
  personalized?: boolean
  ageRange: string
  gender: string
  stageSituation: string
  language?: string
  contentStyle?: "casual" | "academic"
  lifeCircumstances?: string[]
  churchId?: string | null
}

export function DevotionalProvider({ children }: { children: ReactNode }) {
  const pathname=usePathname()
  const autoLoaded=useRef(false)
  const extrasEpoch=useRef(0)
  const [contentErrors,setContentErrors]=useState<Record<string,string>>({})
  const [profileEpoch,setProfileEpoch]=useState(0)
  React.useEffect(()=>{const changed=()=>setProfileEpoch(value=>value+1);window.addEventListener("lifestages-profile-changed",changed);return()=>window.removeEventListener("lifestages-profile-changed",changed)},[])
  const { canAccessPremium, userEmail } = useSubscription()
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
          email: userEmail || parsed.email,
          country: canAccessPremium ? parsed.country : undefined,
          personalized: canAccessPremium,
          lifeCircumstances: canAccessPremium ? normalizeLifeCircumstances(parsed.lifeCircumstances) : [],
          ageRange: canAccessPremium ? parsed.ageBand || parsed.ageRange || "40-54" : "40-54",
          gender: canAccessPremium ? parsed.gender || "male" : "male",
          stageSituation: canAccessPremium ? parsed.stageSituation || parsed.season || "General" : "General",
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
  }, [selectedLanguage, church?.id, canAccessPremium, userEmail, profileEpoch])

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
            return { reference: data.reference, text: data.text, version: 'WEB' }
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
      const response = await apiFetch("/api/devotional", {
        signal: AbortSignal.timeout(45000),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profile.email,
          country: profile.country,
          verse_reference: verse.reference,
          verse_text: verse.text,
          age_range: profile.ageRange,
          gender: profile.gender,
          life_stage: profile.stageSituation,
          lifeCircumstances: profile.lifeCircumstances || [],
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
  const generatePremiumContentInBackground = useCallback((verse:VerseData,profile:UserProfile) => {
    if (premiumGeneratedRef.current) return
    premiumGeneratedRef.current=true
    const epoch=++extrasEpoch.current
    setContentErrors({})
    const payload={...profile,verseReference:verse.reference,verseText:verse.text}
    void loadContentExtras(apiUrl, payload, {
      loading:(kind,value)=>{if(epoch===extrasEpoch.current)setLoadingStates(prev=>({...prev,[kind]:value}))},
      result:(kind,data)=>{if(epoch===extrasEpoch.current)setDevotional(prev=>({...prev,...data}))},
      error:(kind)=>{if(epoch===extrasEpoch.current)setContentErrors(prev=>({...prev,[kind]:'Could not load this content. Please retry.'}))},
    })
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
    const cacheKey = JSON.stringify(["access-web-v2-country", profile.personalized, "text-free-v3", source, profile.churchId, profile.ageRange, profile.gender, profile.country, profile.stageSituation, profile.lifeCircumstances, profile.language, profile.contentStyle])
    
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

      generatePremiumContentInBackground(verse, profile)

      // Get devotional content
      const content = await getDevotionalContent(verse, profile)
      
      if (content) {
        setDevotional(prev => ({
          ...prev,
          ...content,
          verse,
          source,
        }))

        // Verse artwork is fetched independently by the carousel.
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
  }, [canAccessPremium, churchLoading, devotional.verse, generatePremiumContentInBackground, getDevotionalContent, getFreshProfile, getVerseFast])

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
  const accessKey = `${selectedLanguage}:${canAccessPremium}:${userEmail || "anonymous"}:${profileEpoch}`
  const prevLanguageRef = useRef(accessKey)
  React.useEffect(() => {
    if (prevLanguageRef.current === accessKey) return
    if (isLoading) return
    prevLanguageRef.current = accessKey
    if (devotional.verse) {
      lastLoadedKeyRef.current = null
      premiumGeneratedRef.current = false
      generateDevotional(devotional.source || "YouVersion")
    }
  }, [accessKey, selectedLanguage, devotional.verse, devotional.source, isLoading, generateDevotional])

  React.useEffect(()=>{
    if (!['/','/verse','/context','/stories','/poetry','/imagery','/songs'].includes(pathname) || churchLoading || autoLoaded.current || devotional.verse) return
    autoLoaded.current=true
    void generateDevotional('YouVersion')
  },[pathname,churchLoading,devotional.verse,generateDevotional])
  const retryContent=useCallback(()=>{if(devotional.verse){premiumGeneratedRef.current=false;generatePremiumContentInBackground(devotional.verse,getFreshProfile())}},[devotional.verse,generatePremiumContentInBackground,getFreshProfile])
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
        contentErrors,
        retryContent,
      }}
    >
      {children}
    </DevotionalContext.Provider>
  )
}
