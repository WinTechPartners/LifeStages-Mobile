"use client"

import { useState, useEffect } from "react"
import { useSubscription } from "@/context/subscription-context"
import { usePathname } from "next/navigation"

export default function EmailGate({ children, required = false, onContinue }: { children: React.ReactNode; required?: boolean; onContinue?: () => void }) {
  const pathname = usePathname()
  const { setUserEmail, userEmail } = useSubscription()
  const [email, setEmail] = useState("")
  const [hasEmail, setHasEmail] = useState<boolean | null>(null) // null = loading
  const [error, setError] = useState("")

  useEffect(() => {
    const profile = localStorage.getItem("userProfile")
    if (profile) {
      try {
        const parsed = JSON.parse(profile)
        if (parsed.email && parsed.email.includes("@")) {
          setHasEmail(true)
          return
        }
      } catch {}
    }
    setHasEmail(false)
  }, [pathname, userEmail])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()

    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setError("Please enter a valid email address")
      return
    }

    // Save email to profile
    const existing = localStorage.getItem("userProfile")
    const profile = existing ? JSON.parse(existing) : {}
    profile.email = trimmed
    localStorage.setItem("userProfile", JSON.stringify(profile))
    setUserEmail(trimmed)
    window.dispatchEvent(new Event("profile-updated"))
    setHasEmail(true)
    onContinue?.()
  }

  // Leader authentication is independent from a member's local profile.
  if (!required && (['/', '/bible', '/verse'].includes(pathname) || pathname === '/church/manage' || pathname === '/connect' || pathname === '/privacy' || pathname === '/terms')) return <>{children}</>

  // Loading state
  if (hasEmail === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c1929]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    )
  }

  // Email already provided — show the app
  if (hasEmail) {
    return <>{children}</>
  }

  // Email gate screen
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c1929] px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo/Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center size-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-2">
            <span className="material-symbols-outlined text-white text-4xl">menu_book</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Bible for Life Stages</h1>
          <p className="text-blue-200/60 text-sm leading-relaxed">
            Free verse explanations and all Lifelines. Premium adds personalization.
          </p>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-200/70">
              Enter your email for free access
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError("") }}
              placeholder="name@example.com"
              autoFocus
              className="w-full rounded-xl border border-white/20 bg-white/5 text-white px-4 py-4 text-base placeholder:text-white/30 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-all"
            />
            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 text-gray-900 rounded-xl font-bold text-base shadow-xl active:scale-[0.98] transition-transform"
          >
            Continue
          </button>
        </form>

        {/* Trust/Privacy */}
        <div className="text-center space-y-2">
          <p className="text-blue-200/40 text-xs">
            Your email unlocks generic explanations and all Lifelines. Personalization requires Premium.
            Permission to connect you with church leadership for care is controlled separately in your profile.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-blue-200/30">
            <a href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</a>
            <span>|</span>
            <a href="/terms" className="hover:text-white/50 transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </div>
  )
}
