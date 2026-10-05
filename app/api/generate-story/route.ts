import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { verseReference, verseText, ageRange, stageSituation, storyType } = await request.json()

    if (!verseReference || !verseText || !storyType) {
      return Response.json({
        title: "Story Unavailable",
        text: "Unable to generate story.",
        imagePrompt: "A peaceful scene",
      }, { status: 400 })
    }

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "google/gemini-2.0-flash-001").trim()

    const settingPrompt = storyType === "contemporary" 
      ? "Set in the present day (2024). Real people in real situations - not sanitized Christian fiction. Include messy emotions, imperfect characters, genuine struggle. The verse's truth should emerge through the story, not be preached at the end."
      : "Set in a different time period or culture - could be ancient, medieval, another country, a historical moment. Show how this truth has echoed through human experience across time. Rich historical or cultural details."

    const ageContext: Record<string, string> = {
      teens: "Characters and situations relatable to teenagers - school, friendships, family conflict, social pressure, identity.",
      university: "Characters navigating early adulthood - career uncertainty, relationships, independence, finding their way.",
      adult: "Characters facing adult realities - work stress, marriage challenges, parenting, financial pressure, aging parents.",
      senior: "Characters with life experience - legacy questions, health challenges, loss, wisdom gained through decades.",
    }

    const situationHint = stageSituation && stageSituation !== "Nothing special" && stageSituation !== "General"
      ? `Weave in themes of: ${stageSituation}. Don't make it the whole story, but let it inform the emotional undercurrent.`
      : ""

    const { text } = await generateText({
      model: openrouter(modelId),
      system: `You're a literary fiction writer who happens to love scripture. You write stories that move people - not Christian propaganda, but real human stories where faith is one thread in the tapestry.

${settingPrompt}

${ageContext[ageRange] || ageContext.adult}

${situationHint}

CRAFT REQUIREMENTS:
- 500-600 words
- Show, don't tell. No moralizing.
- Real dialogue that sounds like actual people talking
- Emotional authenticity - let characters be messy, conflicted, human
- A genuine story arc with tension and resolution
- The verse's truth should be FELT, not explained
- End with resonance, not a sermon
- Literary quality - this should be genuinely good writing`,
      prompt: `Write a story that brings ${verseReference} to life: "${verseText}"

TITLE===
[A literary, evocative title - not cheesy]
===TITLE

STORY===
[Your 500-600 word story]
===STORY

IMAGE===
[Cinematic scene from the story - specific moment, emotional, 25 words]
===IMAGE`,
      maxOutputTokens: 1800,
    })

    const titleMatch = text.match(/TITLE===\s*(.+?)\s*===TITLE/s)
    const storyMatch = text.match(/STORY===\s*(.+?)\s*===STORY/s)
    const imageMatch = text.match(/IMAGE===\s*(.+?)\s*===IMAGE/s)

    return Response.json({
      title: titleMatch?.[1]?.trim() || "A Story of Faith",
      text: storyMatch?.[1]?.trim() || text.replace(/TITLE===.+?===TITLE/s, "").replace(/IMAGE===.+?===IMAGE/s, "").trim(),
      imagePrompt: imageMatch?.[1]?.trim() || `Emotional scene depicting themes from ${verseReference}`,
    })
  } catch (error) {
    console.error("Story error:", error)
    return Response.json({
      title: "Story Unavailable",
      text: "Please try again later.",
      imagePrompt: "A peaceful scene",
    }, { status: 200 })
  }
}
