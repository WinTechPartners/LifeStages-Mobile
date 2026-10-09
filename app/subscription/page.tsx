"use client"

import { useRouter } from "next/navigation"
import { useSubscription } from "@/context/subscription-context"
import { Card } from "@/components/ui/card"
import { useState, useEffect, Suspense } from "react"
import { PRODUCT_IDS } from "@/lib/native-iap"

function SubscriptionContent() {
  const router = useRouter()
  const {
    canStartTrial,
    tier,
    ownerAccess,
    isTrialActive,
    daysLeftInTrial,
    isLoading,
    products,
    purchase,
    restore,
    openPortal,
    refreshSubscription,
    setUserEmail,
  } = useSubscription()

  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual")

  // Load email from profile on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile")
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile)
        if (parsed.email) {
          setUserEmail(parsed.email)
        }
      } catch (e) {
        console.error("Failed to parse profile:", e)
      }
    }
  }, [setUserEmail])

  // Get prices from store products (with fallback)
  const monthlyProduct = products.find((p) => p.id === PRODUCT_IDS.MONTHLY)
  const yearlyProduct = products.find((p) => p.id === PRODUCT_IDS.YEARLY)

  const monthlyPrice = monthlyProduct?.price || "$4.99"
  const yearlyPrice = yearlyProduct?.price || "$49.99"
  const yearlyMonthly = yearlyProduct
    ? `$${(yearlyProduct.priceAmount / 12).toFixed(2)}`
    : "$4.17"

  const premiumFeatures = [
    { name: canStartTrial ? "7-day FREE trial" : "Personalized for your life", icon: "celebration", highlight: true },
    { name: "Personalized Stories", icon: "auto_stories", highlight: false },
    { name: "Inspiring Poetry & Hymns", icon: "edit_note", highlight: false },
    { name: "Visual Imagery & Symbols", icon: "image", highlight: false },
    { name: "Worship Songs & Music", icon: "music_note", highlight: false },
    { name: "Biblical Context & Backstory", icon: "history_edu", highlight: false },
    { name: "Personalized Lifelines", icon: "explore", highlight: false },
    { name: "Text Chat — Premium", icon: "chat", highlight: false },
    { name: "Personalization across all content", icon: "psychology", highlight: true },
  ]

  const freeFeatures = [
    { name: "Read the entire Bible — no email", included: true },
    { name: "Verse of the day — no email", included: true },
    { name: "Friendly Breakdown — no email", included: true },
    { name: "verse explanations — email only", included: true },
    { name: "All Lifelines — email only", included: true },
    { name: "Personalized stories", included: false },
    { name: "Poetry & hymns", included: false },
    { name: "Visual imagery", included: false },
    { name: "Worship songs", included: false },
    { name: "Biblical context", included: false },
    { name: "Personalization of Lifelines & all content", included: false },
    { name: "Text Chat — Premium", included: false },
    { name: "Voice Chat — Coming Soon, Premium Plus", included: false },
  ]

  const handleStartTrial = async () => {
    setError(null)
    setPurchasing(true)
    try {
      const productId =
        selectedPlan === "annual" ? PRODUCT_IDS.YEARLY : PRODUCT_IDS.MONTHLY
      const success = await purchase(productId)
      if (success) {
        setShowSuccess(true)
        setTimeout(() => {
          router.push("/")
        }, 2000)
      } else {
        setError("Purchase cancelled. Your plan has not changed.")
      }
    } catch (err: any) {
      setError(
        err?.message || "Purchase failed. Please try again."
      )
      console.error("[Subscription] Purchase error:", err)
    } finally {
      setPurchasing(false)
    }
  }

  const handleRestore = async () => {
    setError(null)
    setRestoring(true)
    try {
      const restored = await restore()
      if (restored) {
        setShowSuccess(true)
        setTimeout(() => {
          router.push("/")
        }, 2000)
      } else {
        setError("No previous purchases found. If you believe this is an error, contact support.")
      }
    } catch (err) {
      setError("Failed to restore purchases. Please try again.")
      console.error("[Subscription] Restore error:", err)
    } finally {
      setRestoring(false)
    }
  }

  const handleManageSubscription = async () => {
    // On native, this directs users to OS subscription settings
    // iOS: Settings > Apple ID > Subscriptions
    // Android: Play Store > Subscriptions
    await openPortal()
  }

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-[#0c1929] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-[#0c1929] shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-[#0c1929]/95 backdrop-blur-md p-4 justify-between border-b border-white/10">
        <button
          onClick={() => router.push("/")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-base font-bold text-white">Choose Your Plan</h2>
        <div className="w-10"></div>
      </div>

      <main className="flex-1 px-4 py-6 overflow-y-auto">
        {/* Success Message */}
        {showSuccess && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-center">
            <span className="material-symbols-outlined text-3xl mb-2">celebration</span>
            <p className="font-bold">Your Premium personalization is ready!</p>
            <p className="text-sm text-green-200/70 mt-1">Enjoy all premium features.</p>
          </div>
        )}

        {/* Hero Section */}
        {tier === "free" && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Premium Brings Personalization</h1>
            <p className="text-blue-200/70">The Bible, daily verse, and Friendly Breakdown are free without email. Email unlocks explanations and all Lifelines. Premium tailors breakdowns, Lifelines, stories, poetry, imagery, and context to YOUR profile.</p>

            {/* Free Trial Badge */}
            <div className="flex justify-center mt-4">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-semibold">
                <span className="material-symbols-outlined !text-lg">check_circle</span>
                {canStartTrial ? "7-Day Trial of Premium Personalization" : "Premium Personalization"}
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div role="alert" className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Pricing Cards for Free Users */}
        {tier === "free" && (
          <div className="space-y-4">
            {/* Plan Toggle */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
              <button
                onClick={() => setSelectedPlan("monthly")}
                className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
                  selectedPlan === "monthly"
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedPlan("annual")}
                className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all relative ${
                  selectedPlan === "annual"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900"
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                Annual
                <span className="absolute -top-2 -right-1 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
                  SAVE 16%
                </span>
              </button>
            </div>

            {/* Selected Plan Card */}
            <Card className="p-5 border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 relative overflow-hidden">
              {selectedPlan === "annual" && (
                <div className="absolute -top-1 -right-8 bg-green-500 text-white text-xs font-bold px-8 py-1 rotate-45 transform translate-x-2">
                  BEST VALUE
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-primary">Premium</h3>
                    <span className="material-symbols-outlined text-amber-500">star</span>
                  </div>
                  {selectedPlan === "monthly" ? (
                    <div className="mt-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-primary">{monthlyPrice}</span>
                        <span className="text-sm text-gray-500">/month</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Flexible, cancel anytime</p>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-primary">{yearlyPrice}</span>
                        <span className="text-sm text-gray-500">/year</span>
                      </div>
                      <p className="text-xs text-green-600 font-medium mt-1">
                        Just {yearlyMonthly}/month — Save with annual billing
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* What's Included */}
              <div className="mb-4">
                <p className="text-sm font-bold text-gray-700 mb-2">Everything you need:</p>
                <ul className="space-y-2">
                  {premiumFeatures.map((feature, idx) => (
                    <li
                      key={idx}
                      className={`flex items-center gap-2 text-sm ${
                        feature.highlight ? "bg-amber-100 -mx-2 px-2 py-1 rounded" : ""
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-base ${
                          feature.highlight ? "text-amber-600" : "text-primary"
                        }`}
                      >
                        {feature.icon}
                      </span>
                      <span
                        className={`${
                          feature.highlight
                            ? "font-semibold text-amber-800"
                            : "font-medium text-gray-700"
                        }`}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {!canStartTrial && !(selectedPlan === "annual" ? yearlyProduct : monthlyProduct) && (
              <p role="status" className="text-sm text-amber-200">Apple has not loaded this plan yet. Tap Subscribe with Apple to retry.</p>
            )}

            {/* CTA Button */}
            <button
              onClick={handleStartTrial}
              disabled={purchasing}
              className="w-full py-4 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 text-gray-900 rounded-xl font-bold text-lg shadow-xl active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {purchasing ? "Processing..." : canStartTrial ? "Start FREE 7-Day Trial" : "Subscribe with Apple"}
            </button>

            <div className="flex items-center justify-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-blue-200/60">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Secure payment
              </span>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-green-400">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Cancel anytime
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                {canStartTrial ? "No charge for 7 days" : "Apple confirms the price before purchase"}
              </span>
            </div>

            {/* Restore Purchases */}
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="w-full py-3 text-blue-300/70 hover:text-white text-sm transition-colors"
            >
              {restoring ? "Restoring..." : "Restore Previous Purchase"}
            </button>

            {/* Free Tier Info */}
            <Card className="p-5 bg-[#0f2137] border-white/10 mt-2">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Free Plan</h3>
                  <p className="text-2xl font-bold text-gray-400">$0</p>
                </div>
                <span className="px-2 py-1 bg-white/10 rounded text-xs font-semibold text-white/70">
                  Current
                </span>
              </div>
              <ul className="space-y-2">
                {freeFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <span
                      className={`material-symbols-outlined text-base ${
                        feature.included ? "text-green-500" : "text-gray-600"
                      }`}
                    >
                      {feature.included ? "check" : "close"}
                    </span>
                    <span
                      className={
                        feature.included ? "text-white/80" : "text-white/40 line-through"
                      }
                    >
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-4 pt-4 text-xs text-blue-200/40">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">lock</span>
                Secure purchase
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">verified</span>
                {canStartTrial ? "Secure checkout" : "Verified by Apple"}
              </span>
            </div>
          </div>
        )}

        {/* Already Premium - Manage Subscription */}
        {(tier === "premium" || tier === "trial") && (
          <div className="text-center py-8 space-y-4">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-500/20 mb-2">
              <span className="material-symbols-outlined text-green-400 text-3xl">
                check_circle
              </span>
            </div>
            <p className="text-white font-semibold">{ownerAccess ? "Full owner access" : "You're enjoying Premium!"}</p>
            <p className="text-blue-200/70 text-sm">
              Thank you for using Bible for Life Stages
            </p>
            <button
              onClick={handleManageSubscription}
              className="px-6 py-3 border border-white/20 rounded-xl text-white hover:bg-white/10 transition-colors"
            >
              Manage Subscription
            </button>
            <button
              onClick={() => router.push("/")}
              className="block mx-auto text-blue-200/50 hover:text-white transition-colors"
            >
              Back to Home
            </button>
          </div>
        )}

        {/* Trial Banner */}
        {isTrialActive && (
          <div className="mt-6 p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-400 text-2xl">timer</span>
              <div>
                <p className="text-sm text-amber-200 font-semibold">
                  Trial ends in {daysLeftInTrial} days
                </p>
                <p className="text-xs text-amber-200/60">
                  You can manage your subscription in your device settings
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-[#0c1929] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <SubscriptionContent />
    </Suspense>
  )
}
