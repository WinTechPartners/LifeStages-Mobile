"use client"

import { apiFetch } from "../api-base"
import { resolveAgeDeclaration } from "../age-bands"
import { normalizeLifeCircumstances } from "../life-circumstances"
import { isAnalyticsUuid, validateAnalyticsEnvelope, type AnalyticsEnvelope, type AnalyticsEvent, type AnalyticsEventKind } from "./contract"

const PREFS = "lifestages_analytics_consent_v1"
const QUEUE = "lifestages_analytics_queue_v1"
const CHANGE = "lifestages-analytics-changed"
const uuid = () => crypto.randomUUID()
type Preference = { enabled: boolean; consentedAt: string; deviceId: string; version: 1 }
type Preferences = Record<string, Preference>
type Fields = Omit<Partial<AnalyticsEvent>, "id" | "kind" | "occurredAt" | "sessionId">
let churchId: string | null = null
let available = false
let sessionId: string | null = null
let sending: Promise<void> | null = null
let retry: ReturnType<typeof setTimeout> | undefined
let retryDelay = 2000
let controller: AbortController | undefined

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback } catch { return fallback }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Analytics must never interrupt the app. */ }
}
function preferences(): Preferences {
  const stored = read<unknown>(PREFS, {})
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {}
  const valid: Preferences = {}
  for (const [id, value] of Object.entries(stored)) {
    if (!isAnalyticsUuid(id) || !value || typeof value !== "object" || Array.isArray(value)) continue
    const pref = value as Partial<Preference>
    if (typeof pref.enabled === "boolean" && pref.version === 1 && isAnalyticsUuid(pref.deviceId)
      && typeof pref.consentedAt === "string" && Number.isFinite(Date.parse(pref.consentedAt))) {
      valid[id] = { enabled: pref.enabled, version: 1, deviceId: pref.deviceId, consentedAt: pref.consentedAt }
    }
  }
  return valid
}
function changed() { window.dispatchEvent(new Event(CHANGE)) }
export function analyticsStatus() {
  const preference = churchId ? preferences()[churchId] : undefined
  return { available, churchId, enabled: !!preference?.enabled, hasData: !!preference?.deviceId }
}
export function subscribeAnalytics(listener: () => void) {
  window.addEventListener(CHANGE, listener)
  return () => window.removeEventListener(CHANGE, listener)
}
function validQueue(): AnalyticsEnvelope[] {
  const stored = read<unknown>(QUEUE, [])
  if (!Array.isArray(stored)) return []
  return stored.filter((batch): batch is AnalyticsEnvelope => {
    const result = validateAnalyticsEnvelope(batch)
    if (!result.ok) return false
    const pref = preferences()[result.value.churchId]
    return !!pref?.enabled && pref.deviceId === result.value.deviceId && pref.consentedAt === result.value.consentedAt
      && Date.parse(result.value.events[0].occurredAt) > Date.now() - 86400000
  }).slice(-200)
}
export function configureAnalytics(id: string | null, enabled: boolean) {
  id = isAnalyticsUuid(id) ? id.toLowerCase() : null
  enabled = enabled && id !== null
  const different = churchId !== id || available !== enabled
  if (churchId !== id) sessionId = null
  churchId = id; available = enabled
  if (different) {
    controller?.abort()
    // A change in selected church never reattributes or sends the previous church's pending events.
    // While the provider resolves its church/config, preserve consented retry envelopes across reloads.
    write(QUEUE, validQueue().filter(batch => id === null || batch.churchId === id))
    changed()
    track("app_open")
    void flushAnalytics()
  }
}
export function setAnalyticsConsent(enabled: boolean) {
  if (!churchId || (enabled && !available)) return
  const all = preferences(), previous = all[churchId]
  all[churchId] = enabled
    ? { enabled: true, version: 1, deviceId: previous?.deviceId || uuid(), consentedAt: new Date().toISOString() }
    : { ...previous, enabled: false }
  write(PREFS, all)
  controller?.abort()
  write(QUEUE, validQueue().filter(batch => batch.churchId !== churchId))
  changed()
  if (enabled) track("app_open")
}
export function track(kind: AnalyticsEventKind, fields: Fields = {}) {
  if (typeof window === "undefined" || !available || !churchId) return
  const pref = preferences()[churchId]
  if (!pref?.enabled || !pref.deviceId) return
  sessionId ||= uuid()
  const profile = read<Record<string, unknown>>("userProfile", {})
  const situations: Record<string, AnalyticsEnvelope["situation"]> = {
    General: "general", "New beginnings": "new_beginnings", Struggling: "struggling", Transitions: "transitions",
  }
  const age = resolveAgeDeclaration(profile)
  const circumstances = profile.circumstanceTaxonomyVersion === 2 && Array.isArray(profile.lifeCircumstances)
    ? normalizeLifeCircumstances(profile.lifeCircumstances) : undefined
  const declarationTime = typeof profile.declarationsUpdatedAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(profile.declarationsUpdatedAt)
    && Number.isFinite(Date.parse(profile.declarationsUpdatedAt)) && Date.parse(profile.declarationsUpdatedAt) <= Date.now() ? profile.declarationsUpdatedAt : undefined
  const situation = situations[String(profile.stageSituation)]
  const envelope: AnalyticsEnvelope = {
    version: 1, consentVersion: 1, consentedAt: pref.consentedAt,
    deviceId: pref.deviceId, churchId,
    ...(age ? { ageBand: age.value, ageTaxonomyVersion: age.taxonomyVersion } : {}), ...(situation ? { situation } : {}),
    ...(circumstances ? { lifeCircumstances: circumstances, circumstanceTaxonomyVersion: 2 as const } : {}),
    ...(declarationTime ? { declarationsUpdatedAt: declarationTime } : {}),
    events: [{ ...fields, id: uuid(), kind, occurredAt: new Date().toISOString(), sessionId } as AnalyticsEvent],
  }
  if (!validateAnalyticsEnvelope(envelope).ok) return
  write(QUEUE, [...validQueue(), envelope].slice(-200))
  schedule(150)
}
function schedule(ms: number) {
  if (retry) return
  retry = setTimeout(() => { retry = undefined; void flushAnalytics() }, ms)
}
export async function flushAnalytics() {
  if (sending || !available || !churchId || (typeof navigator !== "undefined" && !navigator.onLine)) return sending
  sending = (async () => {
    for (let i = 0; i < 25; i++) {
      const next = validQueue().find(batch => batch.churchId === churchId)
      if (!next || !available) return
      controller = new AbortController()
      const timeout = setTimeout(() => controller?.abort(), 10000)
      try {
        const response = await apiFetch("/api/analytics/events", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next), signal: controller.signal,
        })
        if (response.status === 503 || response.status === 429 || response.status >= 500) {
          schedule(retryDelay); retryDelay = Math.min(60000, retryDelay * 2); return
        }
        // IDs stay fixed across network retries. Invalid events are discarded, never changed into another event.
        write(QUEUE, validQueue().filter(batch => batch.events[0].id !== next.events[0].id))
        retryDelay = 2000
      } catch { schedule(retryDelay); retryDelay = Math.min(60000, retryDelay * 2); return }
      finally { clearTimeout(timeout) }
    }
    if (validQueue().some(batch => batch.churchId === churchId)) schedule(1000)
  })().finally(() => { sending = null })
  return sending
}
export async function eraseAnalytics(church = churchId) {
  if (!church) return
  const pref = preferences()[church]
  if (!pref?.deviceId) return
  const all = preferences(); all[church] = { ...pref, enabled: false }; write(PREFS, all)
  controller?.abort(); write(QUEUE, validQueue().filter(batch => batch.churchId !== church)); changed()
  await sending
  const eraseController = new AbortController()
  const timeout = setTimeout(() => eraseController.abort(), 10000)
  try {
    const response = await apiFetch("/api/analytics/events", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, signal: eraseController.signal,
      body: JSON.stringify({ version: 1, churchId: church, deviceId: pref.deviceId }),
    })
    if (!response.ok) throw new Error('Erasure not confirmed')
    const confirmation = await response.json()
    if (confirmation?.erased !== true) throw new Error('Erasure not confirmed')
  } catch { throw new Error("Could not erase shared activity yet. Sharing is off. Please retry when connected.") }
  finally { clearTimeout(timeout) }
  const latest = preferences(); delete latest[church]; write(PREFS, latest); changed()
}
export async function eraseAllAnalytics() {
  const all = preferences()
  // Account deletion must stop sharing at every previously selected church even if erasure is offline.
  for (const pref of Object.values(all)) pref.enabled = false
  write(PREFS, all); controller?.abort(); write(QUEUE, []); changed()
  const results = await Promise.allSettled(Object.keys(all).map(id => eraseAnalytics(id)))
  if (results.some(result => result.status === "rejected")) throw new Error("Could not erase all shared activity yet. Sharing is off. Please retry when connected.")
}

/** Counts only a visible, recently interacted-with view; never claims reading or comprehension. */
export function observeForeground(fields: Fields) {
  let last = performance.now(), interaction = last, total = 0
  const tick = () => {
    const now = performance.now()
    if (document.visibilityState === "visible" && document.hasFocus()) {
      total += Math.max(0, Math.min(now, interaction + 30000) - last)
    }
    last = now
  }
  const emit = () => {
    tick()
    if (total >= 1000) track("foreground_interval", { ...fields, activeMs: Math.min(300000, Math.floor(total)) })
    total = 0
  }
  const activity = () => { tick(); interaction = performance.now() }
  const visibility = () => { emit(); interaction = -Infinity; last = performance.now() }
  const actions = ["pointerdown", "keydown", "scroll", "touchstart"]
  actions.forEach(name => window.addEventListener(name, activity, { passive: true }))
  document.addEventListener("visibilitychange", visibility)
  window.addEventListener("blur", visibility)
  // Flush accumulated visible time while consent is still valid, and discard pre-consent intervals.
  const consentChange = () => { total = 0; last = performance.now(); interaction = last }
  window.addEventListener(CHANGE, consentChange)
  const timer = setInterval(emit, 15000)
  return () => {
    emit(); clearInterval(timer)
    actions.forEach(name => window.removeEventListener(name, activity))
    document.removeEventListener("visibilitychange", visibility); window.removeEventListener("blur", visibility)
    window.removeEventListener(CHANGE, consentChange)
  }
}
