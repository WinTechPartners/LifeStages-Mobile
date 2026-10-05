import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"
import { parseLLMJson } from "@/lib/parse-llm-json"

export async function POST(request: Request) {
  try {
    const { topic, context } = await request.json()

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "google/gemini-2.0-flash-001").trim()

    const { text } = await generateText({
      model: openrouter(modelId),
      system: `You are a researcher who finds REAL, DOCUMENTED stories of faith, transformation, and testimony.

CRITICAL RULES:
- Only cite stories that are REAL and VERIFIABLE
- Include historical figures, documented testimonies, well-known conversion stories
- Each story must be from a real person with a real name
- Provide the source or how they can verify it (book, organization, historical record)
- If you're not certain a story is real, don't include it
- Focus on stories that relate to the spiritual theme provided

Types of real stories to consider:
- Historical conversions (Augustine, C.S. Lewis, etc.)
- Missionary accounts (Jim Elliot, Corrie ten Boom, etc.)
- Modern documented testimonies from ministries
- Published memoirs and autobiographies
- Verified accounts from organizations like Voice of the Martyrs, Samaritan's Purse, etc.`,
      prompt: `Find 3 REAL, DOCUMENTED stories related to this theme:
Topic: "${topic}"
Context: ${context}

Return JSON only:
{
  "stories": [
    {
      "title": "Person's Name - Brief headline",
      "summary": "2-3 paragraph summary of their real story and how it connects to this theme. Be specific with dates, places, outcomes.",
      "source": "Where this story is documented (book title, organization, historical record)",
      "url": "URL where they can read more (if known, otherwise null)"
    }
  ]
}

Remember: Only REAL stories with REAL people. If you can't find 3 verified stories, return fewer.`,
      maxOutputTokens: 1500,
    })

    const data = parseLLMJson(text.replace(/```json|```/g, "").trim())
    return Response.json(data)
  } catch (error) {
    console.error("True stories search error:", error)
    return Response.json({ stories: [] }, { status: 200 })
  }
}
