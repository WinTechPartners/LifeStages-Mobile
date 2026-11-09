"use client"

import { Analytics } from '@vercel/analytics/next'
import { usePathname } from 'next/navigation'

export function SiteAnalytics() {
  const pathname = usePathname()
  // Invitations and leader sessions are not part of website traffic analytics.
  if (pathname.startsWith('/church/')) return null
  return <Analytics />
}
