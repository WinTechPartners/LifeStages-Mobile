import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"
import { buildPersonalizationContext } from "@/lib/personalization-prompts"

export async function POST(request: Request) {
  try {
    const { verseReference, verseText, ageRange, gender, stageSituation, source, sermonTitle, sermonSummary } = await request.json()

    // Determine if this is sermon-based or verse-based
    const isSermonMode = source === 'sermon' && sermonTitle
    const contentReference = isSermonMode ? `the sermon "${sermonTitle}"` : verseReference
    const contentText = isSermonMode ? sermonSummary : verseText

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "anthropic/claude-sonnet-4-20250514").trim()

    const personalization = buildPersonalizationContext(ageRange, gender, stageSituation)

    const systemInstruction = `You are a gifted poet who writes beautiful, emotionally resonant poetry. Your poems have proper structure with line breaks, stanzas, and poetic rhythm. Write in a warm, accessible style that touches the heart.${personalization}`

    const poem1Promise = generateText({
      model: openrouter(modelId),
      system: systemInstruction,
      prompt: `Generate 1 beautiful SONNET or HYMN STYLE poem inspired by ${contentReference}: "${contentText}"
      
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
      prompt: `Generate 1 beautiful FREE VERSE poem inspired by ${contentReference}: "${contentText}"
      
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
