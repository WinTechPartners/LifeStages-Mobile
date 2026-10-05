"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { apiUrl } from "@/lib/api-base"
import { safeLogoUrl, validHexColor } from "@/lib/church-branding"

// =====================================================
// TYPES
// =====================================================

export interface ChurchConfig {
  id: string
  slug: string
  name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  welcome_message?: string | null
  leadership_contact_name?: string | null
  leadership_contact_email?: string | null
  leadership_contact_phone?: string | null
  leadership_contact_url?: string | null
  sermon_review_enabled: boolean
  sermon_prep_enabled: boolean
  last_sermon_id?: string
  last_sermon_date?: string | null
  last_sermon_scripture?: string | null
  last_sermon_transcript?: string | null
  last_sermon_title: string | null
  last_sermon_source?: string
  last_sermon_source_description?: string | null
  last_sermon_analysis_status?: string | null
  last_sermon_youtube_url: string | null
  last_sermon_summary: string | null
  current_sermon_id?: string
  current_sermon_title: string | null
  current_sermon_scripture: string | null
  current_sermon_theme: string | null
  trueteachings_enabled: boolean
  trueteachings_context: string | null
}

interface ChurchContextType {
  church: ChurchConfig | null
  isLoading: boolean
  hasChurch: boolean
  logo: string | null
  primaryColor: string
  secondaryColor: string
  showSermonRow: boolean
  lastSermon: { id?: string; title: string; url: string; summary: string; date?: string | null; scripture?: string | null; transcript?: string | null; source?: string; sourceDescription?: string | null; analysisStatus?: string | null } | null
  thisSermon: { id?: string; title: string; scripture: string; theme: string } | null
}

const DEFAULT_PRIMARY = "#f59e0b"
const DEFAULT_SECONDARY = "#0c1929"

const defaultContext: ChurchContextType = {
  church: null,
  isLoading: true,
  hasChurch: false,
  logo: null,
  primaryColor: DEFAULT_PRIMARY,
  secondaryColor: DEFAULT_SECONDARY,
  showSermonRow: false,
  lastSermon: null,
  thisSermon: null,
}

const ChurchContext = createContext<ChurchContextType>(defaultContext)

export function isChurchConfig(value: unknown, expectedSlug?: string): value is ChurchConfig {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate.id)
    && typeof candidate.slug === "string" && (!expectedSlug || candidate.slug.toLowerCase() === expectedSlug.toLowerCase())
    && typeof candidate.name === "string" && candidate.name.trim().length > 0
}

export function ChurchProvider({ children }: { children: ReactNode }) {
  const [church, setChurch] = useState<ChurchConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Profile churchId is a code. Only this resolved record supplies a church UUID.
  useEffect(() => {
    setMounted(true)
    let request: AbortController | undefined
    let version = 0
    let lastCode: string | undefined
    let lastAttempt = 0
    let pending = false

    const loadChurchFromProfile = async (allowRefresh = false) => {
      let churchCode = ""
      try {
        const profile = JSON.parse(localStorage.getItem("userProfile") || "{}")
        if (typeof profile?.churchId === "string") churchCode = profile.churchId.trim().toLowerCase()
      } catch { /* Missing or invalid profiles have no church association. */ }
      const associationChanged = churchCode !== lastCode
      if (!associationChanged && (!allowRefresh || pending || Date.now() - lastAttempt < 60_000)) return
      lastCode = churchCode
      const currentVersion = ++version
      request?.abort()
      if (associationChanged) {
        setChurch(null)
        setIsLoading(Boolean(churchCode))
      }
      if (!churchCode) { pending = false; return }
      const controller = new AbortController()
      request = controller
      pending = true
      lastAttempt = Date.now()
      const timeout = window.setTimeout(() => controller.abort(), 15_000)
      try {
        const res = await fetch(apiUrl(`/api/church?slug=${encodeURIComponent(churchCode)}&action=info`), { signal: controller.signal, cache: "no-store" })
        if (res.status === 404 && currentVersion === version) setChurch(null)
        if (!res.ok) throw new Error("Church lookup failed")
        const data = await res.json()
        if (currentVersion !== version || controller.signal.aborted) return
        setChurch(isChurchConfig(data, churchCode) ? data : null)
      } catch {
        if (currentVersion === version && !controller.signal.aborted) {
          // A refresh can retain this church offline; a failed association never retains another church.
          if (associationChanged) setChurch(null)
        }
      } finally {
        window.clearTimeout(timeout)
        if (currentVersion === version) {
          pending = false
          setIsLoading(false)
        }
      }
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === "userProfile" || event.key === null) void loadChurchFromProfile()
    }
    const onProfileChanged = () => { void loadChurchFromProfile() }
    const onForeground = () => {
      if (document.visibilityState !== "hidden") void loadChurchFromProfile(true)
    }
    void loadChurchFromProfile()
    window.addEventListener("lifestages-profile-changed", onProfileChanged)
    window.addEventListener("storage", onStorage)
    window.addEventListener("focus", onForeground)
    window.addEventListener("online", onForeground)
    document.addEventListener("visibilitychange", onForeground)
    const refreshTimer = window.setInterval(onForeground, 60_000)
    return () => {
      ++version
      request?.abort()
      window.removeEventListener("lifestages-profile-changed", onProfileChanged)
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("focus", onForeground)
      window.removeEventListener("online", onForeground)
      document.removeEventListener("visibilitychange", onForeground)
      window.clearInterval(refreshTimer)
    }
  }, [])

  // During SSR or before mount, return defaults
  if (!mounted) {
    return (
      <ChurchContext.Provider value={defaultContext}>
        {children}
      </ChurchContext.Provider>
    )
  }

  const hasChurch = !!church
  
  const showSermonRow = Boolean(hasChurch && (
    (church.sermon_review_enabled && church.last_sermon_title) ||
    (church.sermon_prep_enabled && church.current_sermon_title)
  ))

  const lastSermon = hasChurch && church.sermon_review_enabled && church.last_sermon_title
    ? {
        id: church.last_sermon_id,
        title: church.last_sermon_title,
        url: church.last_sermon_youtube_url || "",
        summary: church.last_sermon_summary || "",
        date: church.last_sermon_date,
        scripture: church.last_sermon_scripture,
        transcript: church.last_sermon_transcript,
        source: church.last_sermon_source,
        sourceDescription: church.last_sermon_source_description,
        analysisStatus: church.last_sermon_analysis_status,
      }
    : null

  const thisSermon = hasChurch && church.sermon_prep_enabled && church.current_sermon_title
    ? {
        id: church.current_sermon_id,
        title: church.current_sermon_title,
        scripture: church.current_sermon_scripture || "",
        theme: church.current_sermon_theme || "",
      }
    : null

  const value: ChurchContextType = {
    church,
    isLoading,
    hasChurch,
    logo: hasChurch ? (safeLogoUrl(church.logo_url) || null) : null,
    primaryColor: hasChurch ? validHexColor(church.primary_color, DEFAULT_PRIMARY) : DEFAULT_PRIMARY,
    secondaryColor: hasChurch ? validHexColor(church.secondary_color, DEFAULT_SECONDARY) : DEFAULT_SECONDARY,
    showSermonRow,
    lastSermon,
    thisSermon,
  }

  return (
    <ChurchContext.Provider value={value}>
      {children}
    </ChurchContext.Provider>
  )
}

export function useChurch() {
  const context = useContext(ChurchContext)
  if (!context) {
    throw new Error("useChurch must be used within a ChurchProvider")
  }
  return context
}
