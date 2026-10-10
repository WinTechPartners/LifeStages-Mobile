import { entitlementProfile, hasPremium } from '@/lib/entitlements'
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"
import { normalizeProfile, readerInstruction } from "@/lib/content-policy"
import { culturalInstruction } from "@/lib/cultural-context"

export async function POST(request: Request) {
  try {
    const body = await entitlementProfile(await request.json())
    const { verseReference, verseText } = body
    const p = normalizeProfile(body)

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "anthropic/claude-sonnet-4-20250514").trim()

    const personalization = readerInstruction(p) + await culturalInstruction(p.language, p.personalized ? p.country : undefined)

    const systemInstruction = `You are a gifted poet who writes beautiful, emotionally resonant poetry. Your poems have proper structure with line breaks, stanzas, and poetic rhythm. Write in a warm, accessible style that touches the heart.${personalization}`

    const poem1Promise = generateText({
      model: openrouter(modelId),
      system: systemInstruction,
      prompt: `Generate 1 beautiful SONNET or HYMN STYLE poem inspired by ${verseReference}: "${verseText}"
      
      Write a REAL POEM with proper poetic structure:
      - 8-16 lines total
      - Use rhyme and rhythm
      - Include stanzas
      - Use poetic devices like imagery and metaphor
      
      Respond in this EXACT format with delimiters:
      TITLE===Your Poem Title Here===TITLE
      TYPE===Sonnet or Hymn Style===TYPE
      POEM===
      Line one of the poem
      Line two of the poem
      
      Line three (new stanza)
      Line four
      ===POEM
      IMAGE===Ethereal artistic visual description for this poem===IMAGE`,
      maxOutputTokens: 1000,
    })

    const poem2Promise = generateText({
      model: openrouter(modelId),
      system: systemInstruction,
      prompt: `Generate 1 beautiful FREE VERSE poem inspired by ${verseReference}: "${verseText}"
      
      Write a REAL POEM with proper poetic structure:
      - 8-16 lines total
      - Free verse style (no strict rhyme required)
      - Include stanzas
      - Use vivid imagery and metaphor
      
      Respond in this EXACT format with delimiters:
      TITLE===Your Poem Title Here===TITLE
      TYPE===Free Verse===TYPE
      POEM===
      Line one of the poem
      Line two of the poem
      
      Line three (new stanza)
      Line four
      ===POEM
      IMAGE===Ethereal artistic visual description for this poem===IMAGE`,
      maxOutputTokens: 1000,
    })

    const [result1, result2] = await Promise.all([poem1Promise, poem2Promise])

    const parsePoem = (text: string) => {
      const titleMatch = text.match(/TITLE===(.+?)===TITLE/s)
      const typeMatch = text.match(/TYPE===(.+?)===TYPE/s)
      const poemMatch = text.match(/POEM===(.+?)===POEM/s)
      const imageMatch = text.match(/IMAGE===(.+?)===IMAGE/s)

      return {
        title: titleMatch?.[1]?.trim() || "Untitled Poem",
        type: typeMatch?.[1]?.trim() || "Free Verse",
        text: poemMatch?.[1]?.trim() || "",
        imagePrompt: imageMatch?.[1]?.trim() || "Abstract artistic representation of faith and hope",
      }
    }

    const poetry = [parsePoem(result1.text), parsePoem(result2.text)]

    return Response.json({ poetry })
  } catch (error) {
    console.error("Poetry generation error:", error)
    return Response.json({ error: "Failed to generate poetry" }, { status: 500 })
  }
}
