/** Explicitly selected age ranges. Existing broader ranges are never split by inference. */
export const AGE_BANDS = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65-74", "75+"] as const
export type AgeBand = typeof AGE_BANDS[number]
export type PersonalizationAgeRange = "teens" | "university" | "adult" | "senior"
export type AnalyticsAgeBand = AgeBand | "legacy-18-23" | "legacy-24-64" | "legacy-65+"

export const LEGACY_AGE_LABELS: Record<PersonalizationAgeRange, string> = {
  teens: "13–17", university: "18–23", adult: "24–64", senior: "65+",
}

interface AgeProfile { ageBand?: unknown; ageRange?: unknown }

export function isAgeBand(value: unknown): value is AgeBand {
  return typeof value === "string" && (AGE_BANDS as readonly string[]).includes(value)
}

export function isPersonalizationAgeRange(value: unknown): value is PersonalizationAgeRange {
  return typeof value === "string" && Object.hasOwn(LEGACY_AGE_LABELS, value)
}

export function toAnalyticsAgeBand(profile: AgeProfile): AnalyticsAgeBand | undefined {
  if (isAgeBand(profile.ageBand)) return profile.ageBand
  switch (profile.ageRange) {
    case "teens": return "13-17"
    case "university": return "legacy-18-23"
    case "adult": return "legacy-24-64"
    case "senior": return "legacy-65+"
    default: return undefined
  }
}

/** Legacy keys remain compatible with the existing devotional and reflection APIs. */
export function toPersonalizationAgeRange(profile: AgeProfile): PersonalizationAgeRange | undefined {
  if (isAgeBand(profile.ageBand)) {
    if (profile.ageBand === "13-17") return "teens"
    if (profile.ageBand === "65-74" || profile.ageBand === "75+") return "senior"
    // This range crosses the old 23/24 boundary. Retain an existing content preference.
    if (profile.ageBand === "18-24") return profile.ageRange === "adult" ? "adult" : "university"
    return "adult"
  }
  return isPersonalizationAgeRange(profile.ageRange) ? profile.ageRange : undefined
}
