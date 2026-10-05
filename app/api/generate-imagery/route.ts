import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"
import { parseLLMJson } from "@/lib/parse-llm-json"

export async function POST(request: Request) {
  try {
    const { verseReference, verseText, source, sermonTitle, sermonSummary } = await request.json()

    // Determine if this is sermon-based or verse-based
    const isSermonMode = source === 'sermon' && sermonTitle

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "google/gemini-2.0-flash-001").trim()

    const systemPrompt = isSermonMode
      ? `You're a creative visual thinker who helps people understand sermon messages through powerful imagery and metaphors.

For each visual concept:
- What does this image represent from the sermon?
- How does it connect emotionally to the message?
- What deeper truth does it reveal?
- How can meditating on this image deepen understanding?

Each "sub" field should be 3-4 sentences of genuine insight about the sermon's message.`
      : `You're a literary scholar who loves unpacking the rich imagery in ancient texts. You see the layers - the cultural context, the emotional resonance, the unexpected connections.

For each symbol or image, give REAL insight:
- What did this image mean to the original audience?
- What associations, fears, or hopes does it tap into?
- How does it work on us emotionally and spiritually?
- What's surprising or often missed about it?

Each "sub" field should be 3-4 sentences of genuine insight, not a dictionary definition.`

    const prompt = isSermonMode
      ? `Create 4 powerful visual concepts that capture the essence of this sermon:

Sermon: "${sermonTitle}"
Summary: ${sermonSummary}

Return JSON only:
{
  "imagery": [
    {
      "title": "Visual concept name",
      "sub": "3-4 sentences explaining what this image represents from the sermon and why it matters",
      "icon": "material_icon_name",
      "imagePrompt": "Evocative artistic visualization of this concept, painterly, emotional, NO TEXT NO WORDS NO LETTERS NO WRITING, 25 words"
    },
    {
      "title": "Second concept",
      "sub": "3-4 sentences of insight",
      "icon": "material_icon_name",
      "imagePrompt": "Artistic scene, NO TEXT NO WORDS NO LETTERS, 25 words"
    },
    {
      "title": "Third concept",
      "sub": "3-4 sentences of insight",
      "icon": "material_icon_name",
      "imagePrompt": "Artistic scene, NO TEXT NO WORDS NO LETTERS, 25 words"
    },
    {
      "title": "Fourth concept",
      "sub": "3-4 sentences of insight",
      "icon": "material_icon_name",
      "imagePrompt": "Artistic scene, NO TEXT NO WORDS NO LETTERS, 25 words"
    }
  ]
}

IMPORTANT: Every imagePrompt MUST include "NO TEXT NO WORDS NO LETTERS" to prevent any writing from appearing in the generated images.

Good icon options: auto_awesome, water_drop, spa, wb_sunny, landscape, favorite, shield, local_fire_department, air, anchor, brightness_high, park, psychology, visibility, route`
      : `Unpack 4 key images, symbols, or metaphors in ${verseReference}: "${verseText}"

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

Good icon options: auto_awesome, water_drop, spa, wb_sunny, landscape, favorite, shield, local_fire_department, air, anchor, brightness_high, park, psychology, visibility, route`

    const { text } = await generateText({
      model: openrouter(modelId),
      system: systemPrompt,
      prompt,
      maxOutputTokens: 1500,
    })

    const data = parseLLMJson(text.replace(/```json|```/g, "").trim())
    return Response.json(data)
  } catch (error) {
    console.error("Imagery error:", error)
    return Response.json({ error: "Failed to generate imagery" }, { status: 500 })
  }
}
