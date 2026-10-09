"use client"
import { useSubscription } from '@/context/subscription-context'
import Link from 'next/link'
export function PremiumGate({children}: {children: React.ReactNode}) {
  const {canAccessPremium, isLoading} = useSubscription()
  if (isLoading) return <p className="p-6 text-white">Checking access…</p>
  if (canAccessPremium) return <>{children}</>
  return <div className="min-h-screen bg-[#0c1929] px-6 py-12 text-white max-w-md mx-auto">
    <h1 className="text-2xl font-bold">Text Chat is Premium</h1>
    <p className="my-4">Premium brings personalization and text conversations. Bible reading, the daily verse, and the Friendly Breakdown are free. Email unlocks Verse explanations and all Lifelines.</p>
    <Link className="inline-block rounded-xl bg-amber-400 px-5 py-3 text-black font-bold" href="/subscription">Explore Premium</Link>
    <p className="mt-6 text-blue-200">Voice Chat: Coming Soon — Premium Plus</p>
    <Link className="block mt-6 underline" href="/">Back to free content</Link>
  </div>
}
