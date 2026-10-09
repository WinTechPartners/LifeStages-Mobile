import { entitlementProfile, hasPremium } from '@/lib/entitlements'
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"
import { culturalInstruction } from "@/lib/cultural-context"
import { cacheGet, cacheSet } from "@/lib/content-cache"
import { normalizeProfile, policyKey, readerInstruction } from "@/lib/content-policy"

export async function POST(request: Request) {
  try {
    const body = await entitlementProfile(await request.json())
    if (!body.email) return Response.json({error: 'Email is required for free verse explanations'}, {status: 401})
    const { selectedText, reference } = body
    const p = normalizeProfile(body)
    const { language, ageRange } = p

    console.log("[Explain API] Request received:", { 
      textLength: selectedText?.length, 
      reference, 
      ageRange 
    })

    if (!selectedText || selectedText.trim().length < 5) {
      console.log("[Explain API] Text too short")
      return Response.json({ error: "Please select some text to explain" }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.error("[Explain API] Missing OPENROUTER_API_KEY")
      return Response.json({ error: "API key not configured" }, { status: 500 })
    }

    const openrouter = createOpenRouter({
      apiKey: apiKey,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "google/gemini-2.0-flash-001").trim()
    console.log("[Explain API] Using model:", modelId)

    const ageContext: Record<string, string> = {
      teens: "Explain for teenagers - use their language, reference their world (school, friendships, social media, parents), make it relatable.",
      university: "Explain for young adults (18-23) - address independence, big life decisions, questioning faith, finding identity.",
      adult: "Explain for adults - connect to work, relationships, parenting, financial stress, real-life complexity.",
      senior: "Explain for seniors - honor their wisdom, address legacy, loss, purpose in later years, grandchildren.",
    }

    const ageInstruction = ageContext[ageRange] || ageContext.adult

    const langName = language !== "en" ? getLanguageName(language) : null
    const langNote = langName ? ` Respond entirely in ${langName}. Do not use English.` : ""
    const cultural = (await culturalInstruction(language)) + readerInstruction(p)

    // Same highlighted text and reference -> same explanation for everyone in that language, country, and gender
    const cacheKey = policyKey(p, { text: selectedText, reference })
    const hit = await cacheGet<{ explanation: string }>("explain", cacheKey)
    if (hit?.explanation) return Response.json(hit)

    console.log("[Explain API] Generating explanation for:", selectedText.substring(0, 50), "...")

    const { text } = await generateText({
      model: openrouter(modelId),
      system: `You are a friendly Bible study companion who explains scripture in plain, accessible language.

${ageInstruction}${langNote}${cultural}

STYLE:
- Conversational, like explaining to a friend over coffee
- No churchy jargon or "thee/thou" language
- Connect abstract concepts to real life
- Keep it warm and encouraging, never preachy
- 100-150 words max`,
      prompt: `The user highlighted this from ${reference}:

"${selectedText}"

Give a friendly, plain-language explanation of what this means${langName ? ` (in ${langName})` : ""}. Start with a brief paraphrase in modern language, then unpack the key idea. Make it practical and relatable.`,
      maxOutputTokens: 400,
    })

    console.log("[Explain API] Generated text length:", text?.length)

    if (!text || text.trim().length === 0) {
      return Response.json({ error: "Empty response from AI" }, { status: 500 })
    }

    await cacheSet("explain", cacheKey, { explanation: text.trim() })
    return Response.json({ explanation: text.trim() })
  } catch (error) {
    console.error("[Explain API] Error details:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ 
      error: "Failed to generate explanation", 
      details: errorMessage 
    }, { status: 500 })
  }
}

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
    zh: "Chinese", vi: "Vietnamese", ko: "Korean", th: "Thai",
  }
  return languages[code] || "English"
}
