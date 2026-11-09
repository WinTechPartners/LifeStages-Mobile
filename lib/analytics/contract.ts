import { LIFELINE_TOPICS as canonicalLifeLines } from '../lifelines'
import { ANALYTICS_AGE_BANDS, AGE_BANDS } from '../age-bands'
import { LIFE_CIRCUMSTANCE_IDS, isLifeCircumstanceId, type LifeCircumstanceId } from '../life-circumstances'

// Shared, deliberately closed contract. Never add free text or arbitrary metadata.
export const ANALYTICS_VERSION = 1 as const
export const ANALYTICS_CONSENT_VERSION = 1 as const
export const ANALYTICS_MAX_BATCH_SIZE = 25
export const ANALYTICS_MAX_BODY_BYTES = 32_768
export const analyticsAgeBands = ANALYTICS_AGE_BANDS
export const analyticsEventKinds = ['app_open', 'chapter_displayed', 'verse_selected', 'explanation_requested', 'explanation_displayed', 'lifeline_selected', 'question_sent', 'content_displayed', 'foreground_interval'] as const
export const analyticsContentTypes = ['sermon', 'reflection', 'context', 'stories', 'poetry', 'imagery', 'songs', 'bible'] as const
export const analyticsSituations = ['general', 'new_beginnings', 'struggling', 'transitions'] as const
export type AnalyticsAgeBand = typeof analyticsAgeBands[number]
export type AnalyticsEventKind = typeof analyticsEventKinds[number]
export type AnalyticsContentType = typeof analyticsContentTypes[number]
export type AnalyticsSituation = typeof analyticsSituations[number]
export interface AnalyticsScripture { book: number; chapter: number; verses?: number[]; translation: string }
export interface AnalyticsEvent {
  id: string; kind: AnalyticsEventKind; occurredAt: string; sessionId: string
  viewId?: string; topicId?: string; sermonId?: string; contentType?: AnalyticsContentType
  channel?: 'chat'; scripture?: AnalyticsScripture; activeMs?: number
}
export interface AnalyticsEnvelope {
  version: 1; consentVersion: 1; consentedAt: string; deviceId: string; churchId: string
  ageBand?: AnalyticsAgeBand; situation?: AnalyticsSituation; events: AnalyticsEvent[]
  ageTaxonomyVersion?: 1 | 2
  lifeCircumstances?: LifeCircumstanceId[]; circumstanceTaxonomyVersion?: 2; declarationsUpdatedAt?: string
}
export interface AnalyticsDeleteRequest { version: 1; deviceId: string; churchId: string }
export type AnalyticsValidation<T> = { ok: true; value: T } | { ok: false; error: string }
export const isAnalyticsUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const keys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every(key => allowed.includes(key))
const iso = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19)
const oneOf = (value: unknown, values: readonly string[]) => typeof value === 'string' && values.includes(value)
const integer = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && (value as number) >= min && (value as number) <= max
const bad = (error: string): { ok: false; error: string } => ({ ok: false, error })
const knownTopics = new Set<string>(canonicalLifeLines.map(line => line.id))

export function validateAnalyticsEnvelope(input: unknown, now = Date.now()): AnalyticsValidation<AnalyticsEnvelope> {
  if (!record(input) || !keys(input, ['version', 'consentVersion', 'consentedAt', 'deviceId', 'churchId', 'ageBand', 'ageTaxonomyVersion', 'lifeCircumstances', 'circumstanceTaxonomyVersion', 'declarationsUpdatedAt', 'situation', 'events'])) return bad('Invalid envelope fields')
  if (input.version !== 1 || input.consentVersion !== 1) return bad('Unsupported contract or consent version')
  if (!isAnalyticsUuid(input.deviceId) || !isAnalyticsUuid(input.churchId)) return bad('Canonical church and device UUIDs required')
  if (!iso(input.consentedAt) || Date.parse(input.consentedAt) > now + 60_000) return bad('Invalid consent timestamp')
  if (input.ageBand !== undefined && !oneOf(input.ageBand, analyticsAgeBands)) return bad('Invalid age band')
  if (input.ageTaxonomyVersion !== undefined && (input.ageBand === undefined || (input.ageTaxonomyVersion !== 1 && input.ageTaxonomyVersion !== 2))) return bad('Invalid age taxonomy version')
  if (input.ageTaxonomyVersion === 2 && !oneOf(input.ageBand, AGE_BANDS)) return bad('Age band does not belong to taxonomy version 2')
  if (input.ageTaxonomyVersion === 1 && ['13-15', '16-17', '25-39', '40-54'].includes(input.ageBand as string)) return bad('Age band does not belong to taxonomy version 1')
  if (input.lifeCircumstances !== undefined && (!Array.isArray(input.lifeCircumstances) || input.lifeCircumstances.length > LIFE_CIRCUMSTANCE_IDS.length || !input.lifeCircumstances.every(isLifeCircumstanceId) || new Set(input.lifeCircumstances).size !== input.lifeCircumstances.length || input.circumstanceTaxonomyVersion !== 2)) return bad('Invalid declared life circumstances')
  if (input.circumstanceTaxonomyVersion !== undefined && (input.circumstanceTaxonomyVersion !== 2 || input.lifeCircumstances === undefined)) return bad('Invalid circumstance taxonomy version')
  if (input.declarationsUpdatedAt !== undefined && (!iso(input.declarationsUpdatedAt) || Date.parse(input.declarationsUpdatedAt) > now + 60_000)) return bad('Invalid declaration timestamp')
  if (input.situation !== undefined && !oneOf(input.situation, analyticsSituations)) return bad('Invalid situation')
  if (!Array.isArray(input.events) || input.events.length < 1 || input.events.length > ANALYTICS_MAX_BATCH_SIZE) return bad('Batch must contain 1 to 25 events')
  const eventIds = new Set<string>()
  for (const event of input.events) {
    if (!record(event) || !keys(event, ['id', 'kind', 'occurredAt', 'sessionId', 'viewId', 'topicId', 'sermonId', 'contentType', 'channel', 'scripture', 'activeMs'])) return bad('Invalid event fields')
    if (!isAnalyticsUuid(event.id) || !isAnalyticsUuid(event.sessionId)) return bad('Invalid event or session UUID')
    if (eventIds.has(event.id.toLowerCase())) return bad('Duplicate event ID in batch')
    eventIds.add(event.id.toLowerCase())
    if (!oneOf(event.kind, analyticsEventKinds)) return bad('Unsupported event kind')
    if (!iso(event.occurredAt) || Date.parse(event.occurredAt) > now + 60_000 || Date.parse(event.occurredAt) < now - 7 * 86_400_000 || Date.parse(event.occurredAt) < Date.parse(input.consentedAt)) return bad('Event outside consent or seven-day delivery window')
    if (event.viewId !== undefined && !isAnalyticsUuid(event.viewId)) return bad('Invalid view UUID')
    if (event.sermonId !== undefined && !isAnalyticsUuid(event.sermonId)) return bad('Invalid sermon UUID')
    if (event.topicId !== undefined && (typeof event.topicId !== 'string' || !knownTopics.has(event.topicId))) return bad('Unknown LifeLine')
    if (event.contentType !== undefined && !oneOf(event.contentType, analyticsContentTypes)) return bad('Unknown content type')
    if (event.channel !== undefined && event.channel !== 'chat') return bad('Unsupported channel')
    if (event.kind === 'question_sent' && event.channel !== 'chat') return bad('Chat channel required for questions')
    if (event.kind !== 'question_sent' && event.channel !== undefined) return bad('Channel only applies to questions')
    if (event.kind === 'lifeline_selected' && event.topicId === undefined) return bad('LifeLine required')
    if (['chapter_displayed', 'explanation_displayed', 'content_displayed', 'foreground_interval'].includes(event.kind as string) && !isAnalyticsUuid(event.viewId)) return bad('View UUID required')
    if (event.kind === 'content_displayed' && event.contentType === undefined) return bad('Content type required')
    if (event.activeMs !== undefined && (event.kind !== 'foreground_interval' || !integer(event.activeMs, 1, 300_000))) return bad('Invalid foreground interval')
    if (event.kind === 'foreground_interval' && event.activeMs === undefined) return bad('Foreground interval duration required')
    const bibleEvent = ['chapter_displayed', 'verse_selected', 'explanation_requested', 'explanation_displayed'].includes(event.kind as string)
    if (bibleEvent && (event.scripture === undefined || (event.contentType !== undefined && event.contentType !== 'bible'))) return bad('Bible reference required')
    if (event.scripture !== undefined) {
      const s = event.scripture
      if (!record(s) || !keys(s, ['book', 'chapter', 'verses', 'translation']) || !integer(s.book, 1, 66) || !integer(s.chapter, 1, 150) || typeof s.translation !== 'string' || !/^[A-Za-z0-9_-]{2,20}$/.test(s.translation)) return bad('Invalid structured Scripture reference')
      if (s.verses !== undefined && (!Array.isArray(s.verses) || s.verses.length < 1 || s.verses.length > 176 || !s.verses.every(v => integer(v, 1, 176)) || new Set(s.verses).size !== s.verses.length)) return bad('Invalid verses')
      if (['verse_selected', 'explanation_requested', 'explanation_displayed'].includes(event.kind as string) && s.verses === undefined) return bad('Selected verses required')
    }
  }
  // Validation above checks every field; clone prevents later mutation by caller.
  return { ok: true, value: JSON.parse(JSON.stringify(input)) as AnalyticsEnvelope }
}

export function validateAnalyticsDeleteRequest(input: unknown): AnalyticsValidation<AnalyticsDeleteRequest> {
  if (!record(input) || !keys(input, ['version', 'deviceId', 'churchId']) || input.version !== 1 || !isAnalyticsUuid(input.deviceId) || !isAnalyticsUuid(input.churchId)) return bad('Invalid deletion request')
  return { ok: true, value: { version: 1, deviceId: input.deviceId, churchId: input.churchId } }
}
