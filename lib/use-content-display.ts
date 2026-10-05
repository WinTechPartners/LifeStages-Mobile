"use client"

import { useEffect, useRef } from 'react'
import { track } from '@/lib/analytics/client'
import type { AnalyticsContentType } from '@/lib/analytics/contract'

/** Log a displayed content context once, after either cached or generated content is available. */
export function useContentDisplay(ready: boolean, contextKey: string, contentType: AnalyticsContentType, sermonId?: string) {
  const displayed = useRef(new Set<string>())
  useEffect(() => {
    if (!ready || displayed.current.has(contextKey)) return
    displayed.current.add(contextKey)
    track('content_displayed', { contentType, viewId: crypto.randomUUID(), sermonId })
  }, [ready, contextKey, contentType, sermonId])
}
