/** Versioned, explicitly selected chronological age ranges; never infer a life circumstance. */
export const AGE_TAXONOMY_VERSION = 2 as const
export const AGE_BANDS = ["13-15", "16-17", "18-24", "25-39", "40-54", "55-64", "65-74", "75+"] as const
export const LEGACY_AGE_BANDS = ["13-17", "25-34", "35-44", "45-54"] as const
export const ANALYTICS_AGE_BANDS = [...AGE_BANDS, ...LEGACY_AGE_BANDS, "legacy-18-23", "legacy-24-64", "legacy-65+"] as const
export type AgeBand = typeof AGE_BANDS[number]
export type PersonalizationAgeRange = "teens" | "university" | "adult" | "senior"
export type AnalyticsAgeBand = typeof ANALYTICS_AGE_BANDS[number]
export type KnownAgeBand = AgeBand | typeof LEGACY_AGE_BANDS[number]

export const LEGACY_AGE_LABELS: Record<PersonalizationAgeRange, string> = {
  teens: "13–17", university: "18–23", adult: "24–64", senior: "65+",
}

export interface AgeProfile { ageBand?: unknown; ageRange?: unknown; ageTaxonomyVersion?: unknown; ageDeclaredAt?: unknown }
export interface AgeDeclaration { value: AnalyticsAgeBand; label: string; taxonomyVersion: 1 | 2; source: "ageBand" | "legacy-ageRange"; legacy: boolean; declaredAt?: string }

export function isAgeBand(value: unknown): value is AgeBand {
  return typeof value === "string" && (AGE_BANDS as readonly string[]).includes(value)
}

export function isKnownAgeBand(value: unknown): value is KnownAgeBand {
  return isAgeBand(value) || (typeof value === "string" && (LEGACY_AGE_BANDS as readonly string[]).includes(value))
}

export function isPersonalizationAgeRange(value: unknown): value is PersonalizationAgeRange {
  return typeof value === "string" && Object.hasOwn(LEGACY_AGE_LABELS, value)
}

export function toAnalyticsAgeBand(profile: AgeProfile): AnalyticsAgeBand | undefined {
  if (isKnownAgeBand(profile.ageBand)) return profile.ageBand
  switch (profile.ageRange) {
    case "teens": return "13-17"
    case "university": return "legacy-18-23"
    case "adult": return "legacy-24-64"
    case "senior": return "legacy-65+"
    default: return undefined
  }
}

export function resolveAgeDeclaration(profile: AgeProfile): AgeDeclaration | undefined {
  const value = toAnalyticsAgeBand(profile)
  if (!value) return undefined
  const source = isKnownAgeBand(profile.ageBand) ? "ageBand" : "legacy-ageRange"
  const legacy = source === "legacy-ageRange" || !isAgeBand(value)
  const version: 1 | 2 = !legacy && (profile.ageTaxonomyVersion === AGE_TAXONOMY_VERSION || ["13-15", "16-17", "25-39", "40-54"].includes(value)) ? 2 : 1
  const declaredAt = typeof profile.ageDeclaredAt === "string" && Number.isFinite(Date.parse(profile.ageDeclaredAt)) ? profile.ageDeclaredAt : undefined
  return { value, label: value.replace(/^legacy-/, "").replace("-", "–"), taxonomyVersion: version, source, legacy, ...(declaredAt ? { declaredAt } : {}) }
}

/** Legacy keys remain compatible with the existing devotional and reflection APIs. */
export function toPersonalizationAgeRange(profile: AgeProfile): PersonalizationAgeRange | undefined {
  if (isKnownAgeBand(profile.ageBand)) {
    if (["13-15", "16-17", "13-17"].includes(profile.ageBand)) return "teens"
    if (profile.ageBand === "65-74" || profile.ageBand === "75+") return "senior"
    // This range crosses the old 23/24 boundary. Retain an existing content preference.
    if (profile.ageBand === "18-24") return profile.ageRange === "adult" ? "adult" : "university"
    return "adult"
  }
  return isPersonalizationAgeRange(profile.ageRange) ? profile.ageRange : undefined
}
