"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react"
import { apiFetch } from "@/lib/api-base"
import { isNative, getPlatform } from "@/lib/native-features"
import {
  listenForSubscriptionChanges,
  manageAppleSubscriptions,
  initializeIAP,
  getProducts,
  purchaseProduct,
  restorePurchases,
  getSubscriptionInfo,
  type IAPProduct,
  type IAPSubscriptionInfo,
  type SubscriptionStatus,
  PRODUCT_IDS,
} from "@/lib/native-iap"

type SubscriptionTier = "free" | "trial" | "premium"

interface VoiceUsage {
  checkInsUsed: number
  checkInsLimit: number
  lastResetDate: string
}

interface SubscriptionContextType {
  // Subscription state
  tier: SubscriptionTier
  isLoading: boolean
  subscriptionStatus: SubscriptionStatus
  userEmail: string | null

  // Products from the store
  products: IAPProduct[]

  // Computed properties
  isPremium: boolean
  canAccessPremium: boolean
  canAccessCore: boolean
  canSearchCustomVerse: boolean

  // Voice usage
  voiceUsage: VoiceUsage
  canUseVoice: boolean
  useVoiceCheckIn: () => boolean

  // Trial state
  isTrialActive: boolean
  daysLeftInTrial: number
  trialEndsAt: number | null

  // Actions
  setUserEmail: (email: string) => void
  purchase: (productId: string) => Promise<boolean>
  restore: () => Promise<boolean>
  refreshSubscription: () => Promise<void>

  // Legacy compatibility
  canStartTrial: boolean
  trialBlockedReason: string | null
  customerId: string | null
  checkout: (priceType: "monthly" | "yearly", email?: string) => Promise<void>
  openPortal: () => Promise<void>
  startTrial: () => void
  upgradeToPaid: (plan: "core" | "premium" | "premium-yearly") => void
  offerings: null
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

const STORAGE_KEYS = {
  USER_EMAIL: "bible_user_email",
  VOICE_USAGE: "voiceUsage",
}

const VOICE_LIMITS = {
  free: 1,
  trial: 999,
  premium: 999,
}

function isNewWeek(lastDate: string, currentDate: string): boolean {
  const last = new Date(lastDate)
  const current = new Date(currentDate)
  const lastMonday = new Date(last)
  lastMonday.setDate(last.getDate() - last.getDay() + 1)
  const currentMonday = new Date(current)
  currentMonday.setDate(current.getDate() - current.getDay() + 1)
  return currentMonday > lastMonday
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [isNativeApp, setIsNativeApp] = useState(false)
  useEffect(() => { setIsNativeApp(isNative()) }, [])
  const [userEmail, setUserEmailState] = useState<string | null>(null)
  const [subscriptionInfo, setSubscriptionInfo] = useState<IAPSubscriptionInfo>({
    status: "none",
    productId: null,
    expiresAt: null,
    isTrialing: false,
    willRenew: false,
  })
  const [products, setProducts] = useState<IAPProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [voiceUsage, setVoiceUsage] = useState<VoiceUsage>({
    checkInsUsed: 0,
    checkInsLimit: VOICE_LIMITS.free,
    lastResetDate: new Date().toISOString().split("T")[0],
  })

  // Set user email and persist
  const setUserEmail = useCallback((email: string) => {
    const normalized = email.toLowerCase().trim()
    setUserEmailState(normalized)
    localStorage.setItem(STORAGE_KEYS.USER_EMAIL, normalized)
  }, [])

  useEffect(() => {
    const sync = () => {
      try {
        const email = JSON.parse(localStorage.getItem('userProfile') || '{}').email || null
        setUserEmailState(email)
      } catch { /* Invalid profile does not grant access. */ }
    }
    window.addEventListener('profile-updated', sync)
    window.addEventListener('lifestages-profile-changed', sync)
    return () => { window.removeEventListener('profile-updated', sync); window.removeEventListener('lifestages-profile-changed', sync) }
  }, [])

  // Initialize IAP and load products + current subscription
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)

      // Load stored email
      const storedEmail = localStorage.getItem(STORAGE_KEYS.USER_EMAIL)
      let profileEmail = null
      try {
        const savedProfile = localStorage.getItem("userProfile")
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile)
          profileEmail = parsed.email
        }
      } catch {}
      const email = profileEmail || storedEmail
      if (email) {
        setUserEmailState(email)
        localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email)
      }

      // Initialize store
      await initializeIAP()

      // Load products
      const storeProducts = await getProducts()
      setProducts(storeProducts)

      // Check current subscription
      const info = await getSubscriptionInfo()
      setSubscriptionInfo(info)

      setIsLoading(false)
    }

    init()
  }, [])

  useEffect(() => {
    if (isNative()) return
    if (!userEmail) {
      if (!isNative()) setSubscriptionInfo({status:'none',productId:null,expiresAt:null,isTrialing:false,willRenew:false})
      return
    }
    if (!isNative()) setSubscriptionInfo({status:'none',productId:null,expiresAt:null,isTrialing:false,willRenew:false})
    let current = true
    apiFetch('/api/stripe/status', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email:userEmail}) })
      .then(r => r.ok ? r.json() : null).then(data => {
        if (!current || !data) return
        if (data.isActive) setSubscriptionInfo({status:data.isTrialing ? 'trialing' : 'active', productId:null,
          expiresAt:data.trialEndsAt ? new Date(data.trialEndsAt).getTime() : null, isTrialing:!!data.isTrialing, willRenew:!data.ownerAccess})
        else if (!isNative()) setSubscriptionInfo({status:'none',productId:null,expiresAt:null,isTrialing:false,willRenew:false})
      }).catch(() => {}).finally(() => {if(current) setIsLoading(false)})
    return () => { current = false }
  }, [userEmail])

  useEffect(() => {
    if (!isNative()) return
    let alive = true
    let remove: (() => void) | undefined
    const refresh = () => { if (document.visibilityState === 'visible') void getSubscriptionInfo().then(info => { if (alive) setSubscriptionInfo(info) }) }
    void listenForSubscriptionChanges(refresh).then(cleanup => { if (alive) remove = cleanup; else cleanup() })
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => { alive = false; remove?.(); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh) }
  }, [])

  // Determine tier
  const tier = useMemo((): SubscriptionTier => {
    if (subscriptionInfo.status === "trialing") return "trial"
    if (subscriptionInfo.status === "active") return "premium"
    return "free"
  }, [subscriptionInfo])

  // Computed
  const isPremium = tier === "premium"
  const isTrialActive = tier === "trial"
  const canAccessPremium = isPremium || isTrialActive
  const canAccessCore = true
  const canSearchCustomVerse = canAccessCore
  const subscriptionStatus = subscriptionInfo.status

  // Trial info
  const trialEndsAt = subscriptionInfo.isTrialing ? subscriptionInfo.expiresAt : null
  const daysLeftInTrial = useMemo(() => {
    if (!trialEndsAt) return 0
    const diff = trialEndsAt - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [trialEndsAt])

  // Voice usage
  useEffect(() => {
    const savedVoiceUsage = localStorage.getItem(STORAGE_KEYS.VOICE_USAGE)
    if (savedVoiceUsage) {
      try {
        const parsed = JSON.parse(savedVoiceUsage)
        const today = new Date().toISOString().split("T")[0]
        if (isNewWeek(parsed.lastResetDate, today)) {
          const newUsage = { checkInsUsed: 0, checkInsLimit: VOICE_LIMITS.free, lastResetDate: today }
          setVoiceUsage(newUsage)
          localStorage.setItem(STORAGE_KEYS.VOICE_USAGE, JSON.stringify(newUsage))
        } else {
          setVoiceUsage(parsed)
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    const newLimit = VOICE_LIMITS[tier] ?? VOICE_LIMITS.free
    setVoiceUsage((prev) => {
      const updated = { ...prev, checkInsLimit: newLimit }
      localStorage.setItem(STORAGE_KEYS.VOICE_USAGE, JSON.stringify(updated))
      return updated
    })
  }, [tier])

  const canUseVoice = false

  const useVoiceCheckIn = useCallback((): boolean => false, [])

  useEffect(() => { localStorage.setItem('lifestages-access', canAccessPremium ? 'premium' : 'free') }, [canAccessPremium])

  const webCheckout = useCallback(async (priceType: 'monthly' | 'yearly', suppliedEmail?: string) => {
    const email = suppliedEmail || userEmail || JSON.parse(localStorage.getItem('userProfile') || '{}').email
    if (!email) { window.location.assign('/subscription'); throw new Error('Enter your email to start your free trial.') }
    const response = await apiFetch('/api/stripe/checkout', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({priceType,email})})
    const data = await response.json()
    if (!response.ok || !data.url) throw new Error(data.error || 'Checkout could not start. Please try again.')
    window.location.assign(data.url)
  }, [userEmail])

  // Purchase a product via native IAP
  const purchase = useCallback(async (productId: string): Promise<boolean> => {
    if (!isNative()) { await webCheckout(productId === PRODUCT_IDS.YEARLY ? "yearly" : "monthly"); return false }
    try {
      const success = await purchaseProduct(productId)
      if (success) {
        // Refresh subscription info
        const info = await getSubscriptionInfo()
        setSubscriptionInfo(info)
      }
      return success
    } catch (e) {
      console.error("[Subscription] Purchase failed:", e)
      throw e
    }
  }, [webCheckout])

  // Restore purchases
  const restore = useCallback(async (): Promise<boolean> => {
    try {
      const info = await restorePurchases()
      setSubscriptionInfo(info)
      return info.status === "active" || info.status === "trialing"
    } catch {
      return false
    }
  }, [])

  // Refresh subscription info
  const refreshSubscription = useCallback(async () => {
    setIsLoading(true)
    const info = await getSubscriptionInfo()
    setSubscriptionInfo(info)
    setIsLoading(false)
  }, [])

  // Legacy compatibility — these map to native IAP now
  const checkout = useCallback(async (priceType: "monthly" | "yearly", email?: string) => {
    if (!isNative()) { await webCheckout(priceType, email); return }
    const productId = priceType === "yearly" ? PRODUCT_IDS.YEARLY : PRODUCT_IDS.MONTHLY
    await purchase(productId)
  }, [purchase, webCheckout])

  const startTrial = useCallback(() => {
    checkout("monthly").catch(console.error)
  }, [checkout])

  const upgradeToPaid = useCallback(
    (plan: "core" | "premium" | "premium-yearly") => {
      checkout(plan === "premium-yearly" ? "yearly" : "monthly")
    },
    [checkout]
  )

  const openPortal = useCallback(async () => {
    // On native, manage subscriptions through the OS settings
    // iOS: Settings > Apple ID > Subscriptions
    // Android: Play Store > Subscriptions
    if (isNative()) {
      if (getPlatform() === 'ios') { await manageAppleSubscriptions(); return }
      window.location.assign(getPlatform() === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions')
      return
    }
    window.location.assign('/support')
  }, [])

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        isLoading,
        subscriptionStatus,
        userEmail,
        products,
        isPremium,
        canAccessPremium,
        canAccessCore,
        canSearchCustomVerse,
        voiceUsage,
        canUseVoice,
        useVoiceCheckIn,
        isTrialActive,
        daysLeftInTrial,
        trialEndsAt,
        canStartTrial: !isNativeApp,
        trialBlockedReason: null,
        customerId: null,
        setUserEmail,
        purchase,
        restore,
        refreshSubscription,
        checkout,
        openPortal,
        startTrial,
        upgradeToPaid,
        offerings: null,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider")
  }
  return context
}
