// Shared helper so every AI generation route writes user-facing text in the
// user's selected language. Keys, delimiter labels, icon names, and image
// prompts stay in English because downstream code and the image model expect it.
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  zh: "Chinese",
  vi: "Vietnamese",
  ko: "Korean",
  th: "Thai",
}

export function getLanguageName(code?: string | null): string {
  return LANGUAGE_NAMES[(code || "en").toLowerCase()] || "English"
}

export function languageInstruction(code?: string | null, extra = ""): string {
  if (!code || code === "en") return ""
  const name = getLanguageName(code)
  return `

CRITICAL LANGUAGE REQUIREMENT: Write ALL user-facing text in ${name}, not English. ${extra}
Keep JSON keys, delimiter labels (such as TITLE===, STORY===, POEM===, IMAGE===), icon names, and image prompts in English. Everything a reader sees must be natural, fluent ${name}.`
}
