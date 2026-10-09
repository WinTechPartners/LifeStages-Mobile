import { entitlementProfile } from '@/lib/entitlements'
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { topic, verseReference, verseText, ageRange = "adult", source, sermonTitle, sermonSummary } = await entitlementProfile(await request.json())

    const isSermonMode = source === 'sermon' && sermonTitle

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "google/gemini-2.0-flash-001").trim()

    const systemPrompt = isSermonMode 
      ? `You're a thoughtful friend helping someone apply Sunday's sermon to their life.

RULES:
- 150-200 words
- Warm, conversational, practical
- Reference the sermon's message naturally
- Give 2-3 specific, actionable ways to apply this week
- NO URLs, NO websites, NO external references
- NO "you should" preaching - be supportive
- Write like a friend texting, not a pastor lecturing`
      : `You're a caring friend helping someone connect Scripture to a specific life struggle.

CRITICAL HONESTY RULE:
First, assess how directly this verse speaks to their situation. Be HONEST:
- If the verse directly addresses their struggle, dive deep into the connection
- If the verse is somewhat related, acknowledge that and still find helpful threads
- If the verse doesn't really fit, SAY SO HONESTLY, but still offer encouragement

STRUCTURE:
1. Start with an honest fit assessment (1 sentence)
2. If it fits: Share the connection warmly (main content)
3. If it doesn't fit well: Acknowledge it, but still offer what wisdom you can, and suggest they might also look at [relevant verse that DOES fit]

RULES:
- 80-120 words
- Warm, real, conversational
- NO URLs, NO websites
- NO "you should" or preachy advice
- Start naturally, not with "Hey!" or greetings
- If verse doesn't fit, be honest but still supportive`

    const prompt = isSermonMode
      ? `Sermon: "${sermonTitle}"
Summary: ${sermonSummary}
Age group: ${ageRange}

Write a warm 150-200 word reflection on how to apply this sermon to daily life this week. Include 2-3 specific action steps. NO URLS.`
      : `Verse: ${verseReference}: "${verseText}"
Their struggle: ${topic}
Age group: ${ageRange}

First, honestly assess: Does this verse speak directly to "${topic}"? 
Then write a warm 80-120 word reflection. Be honest about the fit. NO URLS.`

    const { text } = await generateText({
      model: openrouter(modelId),
      system: systemPrompt,
      prompt,
      maxOutputTokens: isSermonMode ? 400 : 250,
    })

    // Clean up any URLs or website references
    let cleanedText = text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/https?:\/\/[^\s)]+/g, '')
      .replace(/\b(bible\.com|focusonthefamily\.com|gotquestions\.org|biblegateway\.com|christianity\.com|crosswalk\.com|desiringgod\.org|thegospelcoalition\.org|relevant\s*magazine|devotional\s*sites?)\b/gi, '')
      .replace(/\b\w+\.(com|org|net|io|edu)\b/gi, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\(\s*\)/g, '')
      .replace(/\[\s*\]/g, '')
      .replace(/\s{2,}/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => {
        const lower = sentence.toLowerCase()
        return !/(website|site|article|resource|link|click|visit|check out|writes about|says that|according to)/i.test(lower)
      })
      .join(' ')
      .trim()

    return Response.json({ reflection: cleanedText })
  } catch (error) {
    console.error("Deep Dive error:", error)
    return Response.json({ error: "Failed to generate reflection" }, { status: 500 })
  }
}
