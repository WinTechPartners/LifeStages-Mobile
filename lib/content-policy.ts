import { normalizeLifeCircumstances, LIFE_CIRCUMSTANCES } from "./life-circumstances"
import { getCountryForLanguage, normalizeCountry } from "@/lib/cultural-context"

// Content policy: the inputs every generation is allowed to vary on.
//
//   LANGUAGE + COUNTRY + Adult + GENDER + General + Casual
//
// Age range, life situation, and tone are pinned so the same verse (or the
// same lifeline topic) produces one piece of content per language and gender
// for everyone, and the global cache stays small and warm. Country is derived
// from language (vi -> Vietnam) and drives the cultural grounding.
//
// Cache lifetimes are set in lib/content-cache.ts: one day for generated
// content, 365 days for Bible verse text.

export const POLICY = {
  ageRange: "40-54",
  stageSituation: "General",
  contentStyle: "casual",
} as const

export type Gender = "male" | "female"

export interface ContentProfile {
  lifeCircumstances: string[]
  personalized: boolean
  language: string
  country: string
  gender: Gender
  ageRange: string
  stageSituation: string
  contentStyle: string
}

/** Reduce any request body (or nested profile) to the policy profile. */
export function normalizeProfile(input: Record<string, unknown> | null | undefined): ContentProfile {
  const src = (input || {}) as Record<string, unknown>
  const nested = (src.profile || {}) as Record<string, unknown>
  const language = "en"
  const personalized = src.__personalizationAuthorized === true
  const rawGender = String(src.gender || nested.gender || "").toLowerCase()
  const gender: Gender = rawGender.startsWith("f") ? "female" : "male"
  return {
    lifeCircumstances: personalized ? normalizeLifeCircumstances(src.lifeCircumstances || nested.lifeCircumstances) : [],
    language,
    country: personalized ? normalizeCountry(src.country || nested.country) || "United States" : getCountryForLanguage(language) || "United States",
    personalized,
    gender,
    ageRange: personalized ? String(src.ageRange || src.age_range || nested.ageRange || "40-54") : POLICY.ageRange,
    stageSituation: personalized ? String(src.stageSituation || src.life_stage || nested.stageSituation || "General") : POLICY.stageSituation,
    contentStyle: personalized ? String(src.contentStyle || src.content_style || nested.contentStyle || "casual") : POLICY.contentStyle,
  }
}

/** Cache key parts for a piece of content: the policy variables plus what makes this piece unique. */
export function policyKey(
  p: ContentProfile,
  extra: Record<string, string | number | boolean | null | undefined> = {}
): Record<string, string | number | boolean | null | undefined> {
  return { accessPolicy: "v4-country", personalized: p.personalized, language: p.language, country: p.country, gender: p.personalized ? p.gender : "generic", ageRange: p.ageRange, stageSituation: p.stageSituation, contentStyle: p.contentStyle, circumstances: p.lifeCircumstances?.join("|") || "", ...extra }
}

/** Prompt block describing the reader, appended to every generation system prompt. */
export function readerInstruction(p: ContentProfile): string {
  if (!p.personalized) return `\nREADER: a general audience. This is FREE content for a general audience. Do not tailor to age, gender, life stage, identity, or personal circumstances. Explain the selected scripture or Lifeline topic in warm, ordinary language. Write all reader-facing content in English.`
  const who = p.gender === "female" ? "woman" : "man"
  return `

READER: a ${who} aged ${p.ageRange} living in ${p.country}. Life stage: ${p.stageSituation}. Explicitly selected circumstances: ${(p.lifeCircumstances || []).map(id=>LIFE_CIRCUMSTANCES.find(c=>c.id===id)?.label || id).join(", ") || "not supplied"}. Age does not establish any family, employment, or caregiving circumstance. Do not invent personal history. Write in a casual, warm, everyday conversational tone, like a caring friend. Personalize naturally for a ${who} without making gender the subject. Write all reader-facing content in English.`
}
