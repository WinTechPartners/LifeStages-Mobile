import { entitlementProfile } from '@/lib/entitlements'
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (typeof body.message !== 'string' || !body.message.trim()) return Response.json({error: 'A message is required'}, {status: 400})
    // General chat has no passage to resolve. Never interpret a screen title as Scripture.
    const generalChat = !body.verseReference || body.verseReference === 'General' || body.source === 'sermon'
    const resolved = await entitlementProfile(generalChat ? {...body, verseReference: undefined, verseText: ''} : body)
    if (!resolved.__personalizationAuthorized) return Response.json({error: 'Text Chat requires Premium'}, {status: 403})
    const { message, verseReference, verseText, history } = resolved

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "anthropic/claude-sonnet-4-20250514").trim()

    const systemPrompt = `You are a helpful, empathetic Bible study assistant. ${verseReference ? `You are discussing the verse: ${verseReference} ("${verseText}").` : 'No specific Bible passage is selected. Discuss the user’s question without inventing a selected verse.'}${body.isDeepDive && typeof body.deepDiveTopic === 'string' ? ` The selected Lifeline topic is: ${body.deepDiveTopic}.` : ''} 

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
