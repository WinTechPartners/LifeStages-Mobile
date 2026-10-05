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

    if (isSermonMode) {
      // Sermon context generation
      const { text } = await generateText({
        model: openrouter(modelId),
        system: `You're a thoughtful ministry leader who helps people understand and apply sermon messages. You write with depth, warmth, and practical wisdom.

Each field should be substantial (4-6 sentences) that gives real insight and practical guidance.`,
        prompt: `Analyze this sermon and provide deep context:

Sermon Title: "${sermonTitle}"
Sermon Summary: "${sermonSummary}"

Return JSON only:
{
  "context": {
    "themes": "What are the main themes explored in this sermon? How do they connect to each other? What underlying truth ties everything together?",
    "scriptures": "What scripture passages are central to this message? How do they support the sermon's themes? Include any key verses that should be studied further.",
    "coreMessage": "What is the heart of this sermon? If someone had to remember just one thing, what would it be? Why does this message matter for believers today?",
    "application": "How can listeners apply this message to their daily lives? What specific areas of life does this speak to? How might this change how we think, act, or relate to others?",
    "questions": "What reflection questions help listeners go deeper? Include 3-4 thought-provoking questions for personal meditation or small group discussion.",
    "actionSteps": "What concrete action steps can someone take this week? Be specific and practical. What would living out this message look like in daily life?"
  }
}`,
        maxOutputTokens: 2500,
      })

      const data = parseLLMJson(text)
      return Response.json(data)
    } else {
      // Original verse context generation
      const { text } = await generateText({
        model: openrouter(modelId),
        system: `You're a brilliant Bible scholar who makes history come alive. You love the details - the politics, the personalities, the drama. You write with depth and insight, not bullet points.

Each field should be a substantial paragraph (4-6 sentences) that gives real insight, not a one-liner summary. Include specific historical details, names, dates, political context, and interesting facts that illuminate the verse.`,
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
      return Response.json(data)
    }
  } catch (error) {
    console.error("Context error:", error)
    return Response.json({ error: "Failed to generate context" }, { status: 500 })
  }
}
