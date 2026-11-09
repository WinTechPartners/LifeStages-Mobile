"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useChurch } from "@/context/church-context"
import { apiFetch } from "@/lib/api-base"
import { configureAnalytics, flushAnalytics } from "@/lib/analytics/client"

export function ChurchAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { church, isLoading } = useChurch()
  const leaderPage = usePathname().startsWith('/church/')
  useEffect(() => {
    let cancelled = false
    configureAnalytics(null, false)
    // This receiver stores pseudonymous longitudinal events, not anonymous aggregates.
    // Keep it out of the normal member experience pending the anonymous reporting boundary.
    if (process.env.NEXT_PUBLIC_ENABLE_PSEUDONYMOUS_ANALYTICS_PILOT !== 'true' || isLoading || !church?.id || leaderPage) return
    apiFetch("/api/analytics/config")
      .then(async response => response.ok ? response.json() : { enabled: false })
      .then(config => {
        if (!cancelled) configureAnalytics(church.id, config.enabled === true && config.version === 1 && config.consentVersion === 1)
      }).catch(() => { if (!cancelled) configureAnalytics(church.id, false) })
    const online = () => { void flushAnalytics() }
    window.addEventListener("online", online)
    return () => { cancelled = true; window.removeEventListener("online", online); configureAnalytics(null, false) }
  }, [church?.id, isLoading, leaderPage])
  return <>{children}</>
}
