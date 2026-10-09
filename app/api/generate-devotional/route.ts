import { webPassage, scheduledFallback } from '@/lib/web-scripture'
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { source, verseQuery } = await request.json()
    const verse = verseQuery ? await webPassage(verseQuery) : scheduledFallback(new Date().toISOString().slice(0,10))

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "anthropic/claude-sonnet-4-20250514").trim()

    const systemInstruction = `
      Write in a casual, reflective tone that avoids first-person perspective (no 'I', 'we', or 'you'). Don't frame it as dialogue or direct conversation, but as thoughtful observations about the topic. Don't quote scripture directly - assume the ideas are being reflected on from memory without reference materials. Use natural, everyday language rather than academic or sermonic phrasing. The content should feel like overhearing someone's authentic thoughts, not like they're addressing an audience or speaking to themselves. Focus on relatable insights and practical applications without religious jargon. The tone should be warm and conversational but without explicitly acknowledging a listener.
      
      The "interpretation" field in the JSON MUST be at least 600 words and follow these rules.
      
      Ensure all quotation marks inside JSON string values are properly escaped with a backslash.
    `

    const prompt = verseQuery
      ? `Generate a daily devotional object for the verse: ${verseQuery}.`
      : `Generate a daily devotional object for a random verse based on the source: ${source}.
         If the source is "YouVersion", pick a popular, encouraging verse.
         If "Gateway", pick a deep theological verse.
         If "Olive Tree", pick a verse focused on growth or nature.`

    const fullPrompt = `
      Use this verified World English Bible passage: ${JSON.stringify(verse)}. Create all sections about this passage.
      Use this verified World English Bible passage: ${JSON.stringify(verse)}.
      
      The JSON schema MUST be:
      {
          "verse": {
            "reference": "Book Chapter:Verse",
            "version": "WEB",
            "text": "The verse text"
          },
          "interpretation": "A long, reflective interpretation following all persona rules. NO first-person. Focus on the core message, application, and relatable insights. At least 600 words long.",
          "heroImagePrompt": "Cinematic description of an abstract or nature scene representing the verse theme",
          "context": {
              "whoIsSpeaking": "Detailed paragraph about the speaker.",
              "audience": "Detailed paragraph about who they are speaking to.",
              "whyTheConversation": "Detailed paragraph about the immediate reason for this statement.",
              "historicalBackdrop": "Detailed paragraph about what was happening in the broader world at the time.",
              "immediateImpact": "Detailed paragraph about the short-term outcome or reaction.",
              "longTermImpact": "Detailed paragraph about the lasting legacy and influence.",
              "setting": "Detailed paragraph describing the physical location and atmosphere."
          },
          "contextImagePrompt": "Visual description for context background",
          "stories": [
              { "title": "Title", "text": "Story text...", "imagePrompt": "Visual description" },
              { "title": "Title", "text": "Story text...", "imagePrompt": "Visual description" }
          ],
          "imagery": [
              { "title": "Title", "sub": "Subtitle", "icon": "auto_awesome", "imagePrompt": "Visual description" },
              { "title": "Title", "sub": "Subtitle", "icon": "water_drop", "imagePrompt": "Visual description" },
              { "title": "Title", "sub": "Subtitle", "icon": "spa", "imagePrompt": "Visual description" },
              { "title": "Title", "sub": "Subtitle", "icon": "wb_sunny", "imagePrompt": "Visual description" }
          ],
          "songs": {
              "title": "Song Title",
              "sub": "Genre",
              "lyrics": "Chorus lyrics...",
              "prompt": "Suno AI music prompt",
              "imagePrompt": "Album art description"
          },
          "poetry": [
              { "title": "Poem Title", "type": "Sonnet", "text": "Poem text...", "imagePrompt": "Poem background" },
              { "title": "Poem Title", "type": "Free Verse", "text": "Poem text...", "imagePrompt": "Poem background" }
          ]
      }
      Remember to ONLY return the raw JSON object, with no extra text or markdown.
    `

    const { text } = await generateText({
      model: openrouter(modelId),
      system: systemInstruction,
      prompt: fullPrompt,
      maxOutputTokens: 4000,
    })

    // Parse and return the JSON
    const cleanJson = text.replace(/```json|```/g, "").trim()
    const data = JSON.parse(cleanJson)

    return Response.json({...data, verse})
  } catch (error) {
    console.error("Generation error:", error)
    return Response.json({ error: "Failed to generate devotional" }, { status: 500 })
  }
}
