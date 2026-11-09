"use client"
import { usePathname } from "next/navigation"

import { LanguageProvider } from '@/context/language-context'
import { SubscriptionProvider } from '@/context/subscription-context'
import { ChurchProvider } from '@/context/church-context'
import { DevotionalProvider } from '@/context/devotional-context'
import { ChurchBranding } from './church-branding'
import { ChurchAnalyticsProvider } from './church-analytics-provider'
import { SiteAnalytics } from './site-analytics'
import EmailGate from './email-gate'

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Public saved examples never load member devotionals or alter a profile.
  if (pathname === "/personalization") return <>{children}</>
  return <LanguageProvider><SubscriptionProvider><ChurchProvider>
    <ChurchBranding />
    <DevotionalProvider><ChurchAnalyticsProvider><EmailGate>{children}</EmailGate></ChurchAnalyticsProvider></DevotionalProvider>
    <SiteAnalytics />
  </ChurchProvider></SubscriptionProvider></LanguageProvider>
}
