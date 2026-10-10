"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSubscription } from "@/context/subscription-context"
import { apiUrl } from "@/lib/api-base"
import { eraseAllAnalytics } from "@/lib/analytics/client"

export default function DeleteAccountPage() {
  const router = useRouter()
  const { userEmail, openPortal } = useSubscription()
  const [confirmEmail, setConfirmEmail] = useState("")
  const [step, setStep] = useState<"info" | "confirm" | "done">("info")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [link, setLink] = useState<{email:string;token:string}|null>(null)
  useEffect(() => { const params = new URLSearchParams(window.location.search); const email=params.get('email'), token=params.get('token'); if(email && token) { setLink({email,token}); setConfirmEmail(email); setStep('confirm') } }, [])
  const accountEmail = link?.email || userEmail || ''
  const emailMatch = confirmEmail.toLowerCase().trim() === accountEmail.toLowerCase().trim()

  async function handleDelete() {
    if (!emailMatch) return
    setDeleting(true)
    setError(null)

    try {
      // Keep the local deletion identifiers until the server confirms erasure.
      await eraseAllAnalytics()
      const res = await fetch(apiUrl("/api/account/delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accountEmail, token: link?.token }),
      })

      if (!res.headers.get('content-type')?.includes('application/json')) throw new Error('The account-deletion service is unavailable. Please retry or contact info@wintechpartners.com.')
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Deletion failed")

      // Clear all local data
      localStorage.clear()
      setStep("done")
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again or contact info@wintechpartners.com")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-[#0c1929] shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-[#0c1929]/95 backdrop-blur-md p-4 justify-between border-b border-white/10">
        <button
          onClick={() => router.push("/profile")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-base font-bold text-white">Delete Account</h2>
        <div className="w-10"></div>
      </div>

      <main className="flex-1 px-4 py-6 overflow-y-auto">
        {/* Step 1: Info */}
        {step === "info" && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-red-500/20 mb-4">
                <span className="material-symbols-outlined text-red-400 text-3xl">warning</span>
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Delete Your Account</h1>
              <p className="text-blue-200/70 text-sm">
                We&apos;re sorry to see you go. Please review what happens when you delete your account.
              </p>
            </div>

            <div className="bg-[#0f2137] border border-white/10 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">What gets deleted:</h3>
              <ul className="space-y-3 text-sm text-blue-200/70">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-400 text-base mt-0.5">close</span>
                  Your email address and profile data
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-400 text-base mt-0.5">close</span>
                  Your verse history and cached content
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-400 text-base mt-0.5">close</span>
                  Your personalization preferences
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-400 text-base mt-0.5">close</span>
                  Push notification registration
                </li>
              </ul>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-400 text-xl mt-0.5">info</span>
                <div className="text-sm">
                  <p className="text-amber-200 font-semibold mb-1">Active subscription?</p>
                  <p className="text-amber-200/70">
                    Deleting your account does not cancel your subscription. Please manage your subscription through your device settings before deleting your account.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep("confirm")}
              className="w-full py-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-bold text-base"
            >
              I understand, continue
            </button>

            <button
              onClick={() => router.push("/profile")}
              className="w-full py-3 text-blue-200/50 hover:text-white text-sm transition-colors"
            >
              Cancel — keep my account
            </button>
          </div>
        )}

        {/* Step 2: Confirm with email */}
        {step === "confirm" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold text-white mb-2">Confirm Deletion</h1>
              <p className="text-blue-200/70 text-sm">
                Type your email address to confirm. This action cannot be undone.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-blue-200/50">Your email</label>
              <div className="text-sm text-white/60 bg-white/5 rounded-lg px-4 py-3">
                {accountEmail || "No email on file"}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-blue-200/50">Type your email to confirm</label>
              <input
                type="email"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full rounded-lg border border-white/20 bg-[#0c1929] text-white px-4 py-3 text-sm focus:border-red-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleDelete}
              disabled={!emailMatch || deleting}
              className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting..." : "Permanently Delete My Account"}
            </button>

            <button
              onClick={() => setStep("info")}
              className="w-full py-3 text-blue-200/50 hover:text-white text-sm transition-colors"
            >
              Go back
            </button>
          </div>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <div className="text-center py-12 space-y-4">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-500/20 mb-2">
              <span className="material-symbols-outlined text-green-400 text-3xl">check_circle</span>
            </div>
            <h1 className="text-xl font-bold text-white">Account Deleted</h1>
            <p className="text-blue-200/70 text-sm">
              Your data has been removed. We hope to see you again someday.
            </p>
            <p className="text-blue-200/50 text-xs mt-4">
              If you had an active subscription, remember to cancel it in your device settings.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
