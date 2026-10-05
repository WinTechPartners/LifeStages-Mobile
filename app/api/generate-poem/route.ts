import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { verseReference, verseText, poemType } = await request.json()

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "google/gemini-2.0-flash-001").trim()

    const isClassic = poemType === "classic"
    
    const stylePrompt = isClassic 
      ? `Write a formal poem in the tradition of George Herbert, John Donne, or Gerard Manley Hopkins. 
Use rhyme and meter deliberately. Could be a sonnet, hymn-like verses, or structured stanzas.
12-20 lines. Each line crafted, every word earning its place.
This should feel timeless - something that could appear in an anthology of religious verse.`
      : `Write contemporary free verse in the tradition of Mary Oliver, Wendell Berry, or Scott Cairns.
No forced rhyme. Let the line breaks do work. Vivid, concrete imagery.
12-20 lines. Spare but resonant.
This should feel like real poetry, not greeting card sentiment.`

    const { text } = await generateText({
      model: openrouter(modelId),
      system: `You are a poet - not a Christian content creator, but an actual poet who takes craft seriously. 

${stylePrompt}

NEVER:
- Rhyme just for the sake of rhyming
- Use clichés like "amazing grace" or "precious Lord" unless genuinely earned
- Write greeting card sentiment
- Sacrifice meaning for meter

ALWAYS:
- Every image concrete and specific
- Emotional truth, not religious platitudes  
- Let the verse inspire, but write YOUR poem
- Quality over length`,
      prompt: `Write a poem inspired by ${verseReference}: "${verseText}"

TITLE===
[Evocative title - not just the verse reference]
===TITLE

POEM===
[Your 12-20 line poem with intentional stanza breaks]
===POEM

IMAGE===
[Artistic, painterly scene that captures the poem's mood - 25 words]
===IMAGE`,
      maxOutputTokens: 800,
    })

    const titleMatch = text.match(/TITLE===\s*(.+?)\s*===TITLE/s)
    const poemMatch = text.match(/POEM===\s*(.+?)\s*===POEM/s)
    const imageMatch = text.match(/IMAGE===\s*(.+?)\s*===IMAGE/s)

    return Response.json({
      poem: {
        title: titleMatch?.[1]?.trim() || "Untitled Poem",
        type: isClassic ? "Classic Verse" : "Free Verse",
        text: poemMatch?.[1]?.trim() || text,
        imagePrompt: imageMatch?.[1]?.trim() || "Abstract spiritual contemplation in warm light",
      }
    })
  } catch (error) {
    console.error("Poem error:", error)
    return Response.json({ error: "Failed to generate poem" }, { status: 500 })
  }
}
