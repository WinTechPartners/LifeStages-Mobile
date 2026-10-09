import { entitlementProfile, hasPremium } from '@/lib/entitlements'
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"
import { languageInstruction } from "@/lib/language-instruction"
import { culturalInstruction } from "@/lib/cultural-context"
import { cacheGet, cacheSet } from "@/lib/content-cache"
import { normalizeProfile, policyKey, readerInstruction } from "@/lib/content-policy"
import { parseLLMJson } from "@/lib/parse-llm-json"

export async function POST(request: Request) {
  try {
    const body = await entitlementProfile(await request.json())
    const { verseReference, verseText } = body
    const p = normalizeProfile(body)
    const language = p.language
    const cultural = (await culturalInstruction(language)) + readerInstruction(p)
    const cacheKey = policyKey(p, { verse: verseReference })
    const hit = await cacheGet("context", cacheKey)
    if (hit) return Response.json(hit)

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "google/gemini-2.0-flash-001").trim()

    const { text } = await generateText({
      model: openrouter(modelId),
      abortSignal: AbortSignal.timeout(35000),
      system: `You're a brilliant Bible scholar who makes history come alive. You love the details - the politics, the personalities, the drama. You write with depth and insight, not bullet points.

Each field should be a substantial paragraph (4-6 sentences) that gives real insight, not a one-liner summary. Include specific historical details, names, dates, political context, and interesting facts that illuminate the verse.${languageInstruction(language, 'Every value inside the "context" object must be in that language. Only "contextImagePrompt" stays in English.')}${cultural}`,
      prompt: `Deep historical context for ${verseReference}: "${verseText}"

Return JSON only:
{
  "context": {
    "whoIsSpeaking": "Who is speaking and why their voice matters here. What shaped them? What's their story? What authority or experience do they bring to these words? Give us the person, not just the title.",
    "originalListeners": "Who first heard these words? What were they going through? What did they need to hear? What fears, hopes, or struggles were they carrying into this moment?",
    "whyTheConversation": "What prompted this? What crisis, celebration, or turning point led to these words being spoken? What's the tension or need being addressed?",
    "setting": "Paint the scene vividly. Where are we? What would we see, hear, smell? What time of year? What's the atmosphere - tense, celebratory, desperate, hopeful?",
    "historicalBackdrop": "What's happening in the wider world? Politics, wars, empires, social conditions. How does the bigger picture shape what's happening in this moment?",
    "immediateImpact": "How did people respond? What changed right away? Were there skeptics? Believers? What actions followed?",
    "longTermImpact": "How did this moment ripple through history? What traditions, beliefs, or practices trace back to this? Why are we still talking about it thousands of years later?"
  },
  "contextImagePrompt": "Cinematic historical scene capturing this moment, specific and evocative, 25 words"
}`,
      maxOutputTokens: 2500,
    })

    const data = parseLLMJson(text)
    await cacheSet("context", cacheKey, data)
    return Response.json(data)
  } catch (error) {
    console.error("Context error:", error)
    return Response.json({ error: "Failed to generate context" }, { status: 500 })
  }
}
