import { webPassage } from './web-scripture'
import { hasApplePremium } from './apple-iap-server'
import { authorizedWarmup } from "./warmup-auth"
import { normalizeLifeCircumstances } from "./life-circumstances"
import { getSubscriptionByEmail } from '@/lib/supabase'

export const OWNER_PREMIUM_EMAIL = 'stevewinfieldtx@gmail.com'
export async function hasPremium(email: unknown): Promise<boolean> {
  if (typeof email !== 'string') return false
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return false
  if (normalized === OWNER_PREMIUM_EMAIL) return true
  try {
    const subscription = await getSubscriptionByEmail(normalized)
    if (!subscription || !['active', 'trialing'].includes(subscription.subscription_status || '')) return false
    const end = subscription.subscription_status === 'trialing' ? subscription.trial_ends_at : subscription.current_period_end
    return !end || new Date(end).getTime() > Date.now()
  } catch { return false }
}

/** Resolve paid access on the server before allowing any profile-based generation. */
export async function entitlementProfile(input: Record<string, any>): Promise<Record<string, any>> {
  const reference = input.verseReference || input.verse_reference || (input.selectedText ? input.reference : undefined)
  if (reference) {
    const passage = await webPassage(reference)
    input = {...input, version:'WEB'}
    if ('verseText' in input) input.verseText = passage.text
    if ('verse_text' in input) input.verse_text = passage.text
    if ('selectedText' in input && !passage.text.includes(input.selectedText)) input.selectedText = passage.text
  }
  const email = input.email || input.profile?.email || input.userProfile?.email
  const supplied = typeof input.__warmupSecret === "string" ? input.__warmupSecret : ""
  const trustedWarmup = authorizedWarmup(supplied)
  const personalized = trustedWarmup ? input.profile?.personalized === true : (await hasApplePremium(input.appleTransaction) || await hasPremium(email))
  const source = input.profile || input.userProfile || input
  const profile = personalized ? {
    ageRange: source.ageBand || source.ageRange || input.age_range || '40-54',
    lifeCircumstances: normalizeLifeCircumstances(source.lifeCircumstances || input.lifeCircumstances),
    gender: source.gender || input.gender || 'male',
    stageSituation: source.stageSituation || input.life_stage || 'General',
    contentStyle: source.contentStyle || input.content_style || 'casual',
    country: source.country || input.country,
  } : { lifeCircumstances: [], ageRange: '40-54', gender: 'male', stageSituation: 'General', contentStyle: 'casual', fullName: undefined, country: undefined }
  const { appleTransaction: _receipt, ...safeInput } = input
  return { ...safeInput, ...profile, language: "en", age_range: profile.ageRange, life_stage: profile.stageSituation,
    content_style: profile.contentStyle, profile: { ...source, ...profile, language: "en" }, userProfile: { ...source, ...profile, language: "en" },
    __personalizationAuthorized: personalized }
}
