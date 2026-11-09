// Cultural grounding for AI-generated content.
//
// When the user's language is not English, every generation route asks for a
// cultural brief here and appends it to its system prompt. The brief has two
// parts:
//   1. A storytelling block (names, settings, daily life, faith context) so
//      stories, poems, imagery, and image prompts are set in the reader's
//      world instead of an American one.
//   2. Sensitivity norms pulled live from TheCultureSync API (Steve's cultural
//      intelligence service) so tone, hierarchy, and taboos are respected.
//      The API result is cached in memory; if it is unreachable the static
//      block still applies, so content never silently falls back to American.
//
// Env (Railway): CULTURESYNC_API_URL (default https://theculturalsync.com),
//                CULTURESYNC_API_KEY (X-API-Key, only needed if that API enables auth).

const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  vi: "Vietnam",
  en: "United States",
  es: "Mexico",
  pt: "Brazil",
  zh: "China",
  th: "Thailand",
  de: "Germany",
  fr: "Belgium",
  ko: "Japan", // nearest profile on file; swap when a Korea profile exists
}

// Storytelling grounding per language. Written for a Christian devotional
// audience in that culture; the API adds communication norms on top.
const STORYTELLING: Record<string, string> = {
  vi: `SETTING AND PEOPLE (Vietnam):
- Characters are Vietnamese with Vietnamese names and honorifics: given names like Minh, Lan, Hương, Tuấn, Thảo, Hùng, Ngọc, Phúc, Linh, Quang, Mai, Đức; family names Nguyễn, Trần, Lê, Phạm, Hoàng, Võ, Đặng, Bùi. Use relational address (anh, chị, em, cô, chú, bác, ông, bà) the way Vietnamese people actually speak.
- Settings are in Vietnam: Hanoi's Old Quarter and lakes, Ho Chi Minh City's districts and traffic, the Mekong Delta, Huế, Đà Nẵng, Đà Lạt, highland coffee farms, coastal fishing towns, rice paddies, alleyway (hẻm) homes, street-side phở and cà phê sữa đá, motorbikes, Zalo messages, the 5 a.m. market, the evening rain.
- Daily life: multi-generational households, sending money home, parents' expectations, university entrance pressure, factory and office shifts, overseas relatives (Việt kiều), Tết preparations, weddings and death anniversaries (đám giỗ), karaoke, school uniforms, the ancestral altar in the living room.
- Faith context: Christians are a respected minority. Catholic parishes and evangelical (Tin Lành) house churches both exist. Faith is often lived alongside family expectations around ancestor veneration; treat that tension with honesty and respect, never mockery. Vietnamese Christians speak of Chúa, Đức Chúa Trời, Chúa Giê-xu, and pray simply and warmly.
- Idiom and feeling: use Vietnamese proverbs and imagery where natural (for example "Uống nước nhớ nguồn", "Lá lành đùm lá rách", "Có công mài sắt, có ngày nên kim"). Emotions are often shown through action and silence rather than declarations. Respect for elders and family harmony shape every decision.
- Image prompts (in English): depict Vietnamese people, clothing, streets, homes, countryside, and light. Say "Vietnamese" explicitly so the image model does not default to Western faces or American suburbs. Áo dài only where it fits the moment; everyday clothing otherwise.`,
}

type CultureProfile = {
  country?: string
  dimensions?: Record<string, { norm?: string; business_implication?: string; wrong_example?: string; regional_override?: string }>
  digital_communication?: Record<string, { norm?: string }>
  offline_behavioral?: Record<string, { norm?: string; taboos?: string[] }>
  religion_impact_on_business?: string
  generational_variation?: string
  urban_rural_variation?: string
}

/** Country name for a language code, or "" for English/unknown. Used for fallback image prompts. */
export function getCountryForLanguage(language?: string | null): string {
  const lang = (language || "en").toLowerCase()
  if (lang === "en") return ""
  return LANGUAGE_TO_COUNTRY[lang] || ""
}

const cache = new Map<string, { brief: string; expires: number }>()
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

function clip(s: string | undefined, max = 260): string {
  if (!s) return ""
  const t = s.replace(/\s+/g, " ").trim()
  return t.length > max ? t.slice(0, max - 1) + "..." : t
}

function summarizeProfile(p: CultureProfile): string {
  const lines: string[] = []
  const dims = p.dimensions || {}
  const wanted = [
    "communication_style",
    "hierarchy_and_authority",
    "identity_frame",
    "conflict_and_disagreement",
    "trust_architecture",
    "time_orientation",
    "regional_variation",
  ]
  for (const key of wanted) {
    const d = dims[key]
    if (d?.norm) lines.push(`- ${key.replace(/_/g, " ")}: ${clip(d.norm)}`)
  }
  const visual = p.digital_communication?.visual_preferences?.norm
  if (visual) lines.push(`- visual preferences: ${clip(visual)}`)
  if (p.religion_impact_on_business) lines.push(`- religion and worldview: ${clip(p.religion_impact_on_business)}`)
  if (p.generational_variation) lines.push(`- generations: ${clip(p.generational_variation)}`)
  if (p.urban_rural_variation) lines.push(`- urban vs rural: ${clip(p.urban_rural_variation)}`)
  const taboos: string[] = []
  for (const section of Object.values(p.offline_behavioral || {})) {
    for (const t of section?.taboos || []) taboos.push(clip(t, 120))
  }
  if (taboos.length) lines.push(`- avoid: ${taboos.slice(0, 8).join("; ")}`)
  return lines.join("\n")
}

async function fetchSensitivityNorms(country: string): Promise<string> {
  const base = (process.env.CULTURESYNC_API_URL || "https://theculturalsync.com").replace(/\/$/, "")
  const key = process.env.CULTURESYNC_API_KEY || ""
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const res = await fetch(`${base}/api/resolve/country/${encodeURIComponent(country)}`, {
      headers: key ? { "X-API-Key": key } : {},
      signal: controller.signal,
    })
    if (!res.ok) {
      console.warn(`[Culture] TheCultureSync ${res.status} for ${country}`)
      return ""
    }
    const profile = (await res.json()) as CultureProfile
    return summarizeProfile(profile)
  } catch (e) {
    console.warn(`[Culture] TheCultureSync unreachable for ${country}:`, e instanceof Error ? e.message : e)
    return ""
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Full cultural brief for a language, cached per country for 6 hours.
 * Returns "" for English so English content is unchanged.
 */
export async function getCulturalBrief(language?: string | null): Promise<string> {
  const lang = (language || "en").toLowerCase()
  if (lang === "en") return ""
  const country = LANGUAGE_TO_COUNTRY[lang]
  if (!country) return ""

  const hit = cache.get(country)
  if (hit && hit.expires > Date.now()) return hit.brief

  const storytelling =
    STORYTELLING[lang] ||
    `SETTING AND PEOPLE: Set everything in ${country}, with local names, places, daily life, and faith context. Image prompts must depict ${country} people and places.`
  const norms = await fetchSensitivityNorms(country)
  const brief = norms
    ? `${storytelling}\n\nCULTURAL SENSITIVITY NORMS (${country}, from TheCultureSync):\n${norms}`
    : storytelling

  // Cache a failed API lookup only briefly so a down API does not slow every request.
  cache.set(country, { brief, expires: Date.now() + (norms ? CACHE_TTL_MS : 5 * 60 * 1000) })
  return brief
}

/**
 * Prompt block to append to a system prompt. Empty for English.
 */
export async function culturalInstruction(language?: string | null): Promise<string> {
  const brief = await getCulturalBrief(language)
  if (!brief) return ""
  return `

CULTURAL GROUNDING (mandatory): The reader lives in this culture. Do not write from an American backdrop.
${brief}

Apply these as defaults, never as stereotypes. Individuals vary; the culture is the setting, not a caricature.`
}
