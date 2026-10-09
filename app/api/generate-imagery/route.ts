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
    const hit = await cacheGet("imagery", cacheKey)
    if (hit) return Response.json(hit)

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "google/gemini-2.0-flash-001").trim()

    const { text } = await generateText({
      model: openrouter(modelId),
      abortSignal: AbortSignal.timeout(35000),
      system: `You're a literary scholar who loves unpacking the rich imagery in ancient texts. You see the layers - the cultural context, the emotional resonance, the unexpected connections.

For each symbol or image, give REAL insight:
- What did this image mean to the original audience?
- What associations, fears, or hopes does it tap into?
- How does it work on us emotionally and spiritually?
- What's surprising or often missed about it?

Each "sub" field should be 3-4 sentences of genuine insight, not a dictionary definition.${languageInstruction(language, 'Every "title" and "sub" must be in that language. "icon" and "imagePrompt" stay in English.')}${cultural}`,
      prompt: `Unpack 4 key images, symbols, or metaphors in ${verseReference}: "${verseText}"

Choose images that reward deeper exploration. Could be obvious ones (if there's depth to uncover) or subtle ones people miss.

Return JSON only:
{
  "imagery": [
    {
      "title": "The image/symbol name",
      "sub": "3-4 sentences of real insight - cultural context, emotional resonance, what's often missed, why it matters",
      "icon": "material_icon_name",
      "imagePrompt": "Evocative artistic visualization of this symbol, painterly, emotional, NO TEXT NO WORDS NO LETTERS NO WRITING, 25 words"
    },
    {
      "title": "Second image",
      "sub": "3-4 sentences of genuine insight",
      "icon": "material_icon_name",
      "imagePrompt": "Artistic scene, NO TEXT NO WORDS NO LETTERS, 25 words"
    },
    {
      "title": "Third image",
      "sub": "3-4 sentences of genuine insight",
      "icon": "material_icon_name",
      "imagePrompt": "Artistic scene, NO TEXT NO WORDS NO LETTERS, 25 words"
    },
    {
      "title": "Fourth image",
      "sub": "3-4 sentences of genuine insight",
      "icon": "material_icon_name",
      "imagePrompt": "Artistic scene, NO TEXT NO WORDS NO LETTERS, 25 words"
    }
  ]
}

IMPORTANT: Every imagePrompt MUST include "NO TEXT NO WORDS NO LETTERS" to prevent any writing from appearing in the generated images.

Good icon options: auto_awesome, water_drop, spa, wb_sunny, landscape, favorite, shield, local_fire_department, air, anchor, brightness_high, park, psychology, visibility, route`,
      maxOutputTokens: 1500,
    })

    const data = parseLLMJson(text.replace(/```json|```/g, "").trim())
    await cacheSet("imagery", cacheKey, data)
    return Response.json(data)
  } catch (error) {
    console.error("Imagery error:", error)
    return Response.json({ error: "Failed to generate imagery" }, { status: 500 })
  }
}
