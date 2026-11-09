import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

export async function POST(req: Request) {
  try {
    const { message, verseReference, verseText, history } = await req.json()

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "anthropic/claude-sonnet-4-20250514").trim()

    const systemPrompt = `You are a helpful, empathetic Bible study assistant. You are discussing the verse: ${verseReference} ("${verseText}"). 

Guidelines:
- Keep responses concise (under 100 words) and conversational
- Ask open-ended questions to help the user reflect
- Be warm, encouraging, and supportive
- Reference the specific verse when relevant
- If the user asks about other topics, gently guide back to scripture study`

    // Build conversation history for context
    const conversationContext =
      history
        ?.slice(-6)
        .map((msg: { sender: string; text: string }) => `${msg.sender}: ${msg.text}`)
        .join("\n") || ""

    const prompt = conversationContext
      ? `Previous conversation:\n${conversationContext}\n\nUser: ${message}\n\nRespond helpfully:`
      : `User: ${message}\n\nRespond helpfully:`

    const { text } = await generateText({
      model: openrouter(modelId),
      system: systemPrompt,
      prompt,
      maxOutputTokens: 500,
    })

    return Response.json({ response: text })
  } catch (error) {
    console.error("Chat API error:", error)
    return Response.json({ response: "I apologize, but I had trouble responding. Please try again." }, { status: 500 })
  }
}
