"use client"

import { Fragment, Suspense, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { useChurch } from '@/context/church-context'
import { useLanguage } from '@/context/language-context'
import { contentCacheKey, optionalUuid } from '@/lib/content-context'

function Loading() {
  return <div className="min-h-screen bg-[#0c1929] flex items-center justify-center"><p className="text-blue-200/70">Loading your content…</p></div>
}

function ScopedContent({ children }: { children: ReactNode }) {
  const params = useSearchParams()
  const { church, isLoading } = useChurch()
  const { language } = useLanguage()
  if (isLoading) return <Loading />
  const sourceChurch = optionalUuid(params.get('churchId'))
  if ((params.get('source') === 'sermon' || params.get('context') === 'sermon') && sourceChurch && sourceChurch !== church?.id) {
    return <div className="min-h-screen bg-[#0c1929] p-6 text-white"><p>This sermon belongs to your previous church selection. Open a sermon from your current church to continue.</p><a className="inline-block mt-4 text-amber-400" href="/">Go home</a></div>
  }
  // Remount content when its church, route, age, language, or personalization changes.
  const scope = contentCacheKey('page', params.toString(), church?.id, language)
  return <Fragment key={scope}>{children}</Fragment>
}

export function ContentContextBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Loading />}><ScopedContent>{children}</ScopedContent></Suspense>
}
