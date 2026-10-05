import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

export async function POST(req: Request) {
  try {
    const { 
      message, 
      verseReference, 
      verseText, 
      history,
      userProfile,
      isDeepDive,
      deepDiveTopic
    } = await req.json()

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    // Use a model without web search capability for voice chat
    const modelId = "google/gemini-2.0-flash-lite-001"

    const name = userProfile?.fullName?.split(" ")[0] || "friend"

    // Keep system prompts SHORT and explicit about no web searches
    const systemPrompt = isDeepDive 
      ? `You're a caring friend helping ${name} through "${deepDiveTopic}". Today's verse: ${verseReference}. Be warm, present, validate feelings. 2-3 sentences max. No preaching. Do NOT search the web or include any URLs or links.`
      : `You're a friendly Bible study companion chatting with ${name} about ${verseReference}. Warm, curious, encouraging. 2-3 sentences max. Do NOT search the web or include any URLs or links. Speak from your knowledge only.`

    // Only keep last 4 exchanges (8 messages) to limit context
    const recentHistory = history?.slice(-8) || []
    const conversationContext = recentHistory
      .map((msg: { sender: string; text: string }) => `${msg.sender}: ${msg.text}`)
      .join("\n")

    const prompt = conversationContext
      ? `${conversationContext}\nUser: ${message}`
      : `User: ${message}`

    const { text } = await generateText({
      model: openrouter(modelId),
      system: systemPrompt,
      prompt,
      maxOutputTokens: 150,
    })
    
    // Strip any URLs that might have snuck through
    const cleanedText = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '')
    
    return Response.json({ response: cleanedText })

  } catch (error) {
    console.error("Voice chat error:", error)
    return Response.json({ 
      response: "Sorry, I had trouble with that. Could you try again?",
      error: true 
    }, { status: 500 })
  }
}
