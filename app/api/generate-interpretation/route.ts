import { entitlementProfile, hasPremium } from '@/lib/entitlements'
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { verseReference, verseText, ageRange, contentStyle = "casual", language = "en", theme } = await entitlementProfile(await request.json())

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "google/gemini-2.0-flash-001").trim()

    const ageContext: Record<string, string> = {
      teens: "Write for teenagers. Reference their world naturally - school pressures, social dynamics, identity questions, family tensions, future uncertainty. Don't be preachy or talk down to them.",
      university: "Write for young adults (18-23). Address the tensions of this season - independence vs. uncertainty, big decisions about career/relationships, questioning what they were taught, finding their own faith.",
      adult: "Write for adults navigating the full complexity of life - career pressures, relationship challenges, parenting struggles, financial stress, health concerns, caring for aging parents while raising kids.",
      senior: "Write for those with decades of life experience. Honor their wisdom while addressing real concerns - legacy, health, loss of friends/spouse, relevance, mortality, passing on faith to grandchildren.",
    }

    const ageInstruction = ageContext[ageRange] || ageContext.adult

    const langName = language !== "en" ? getLanguageName(language) : null
    const langNote = langName ? ` Write entirely in ${langName}.` : ""

    // THEME-BASED devotional - NO VERSE, just discuss the theme
    if (theme) {
      console.log("[API] Generating theme teaching for:", theme, "style:", contentStyle)
      
      // Different prompts based on content style
      const casualPrompt = `Write like you're texting a good friend about ${theme} - what the Bible actually says about it (350-400 words).

VIBE:
- Like you're having coffee with someone, not preaching at them
- "So here's the thing about ${theme}..." or "You know what I love about how the Bible talks about ${theme}?"
- Share insights like discoveries, not lectures
- Weave in 3-4 scripture references naturally (not formal citations - more like "there's this moment in Hebrews where...")
- Be real, warm, maybe even a little playful
- Connect to actual life stuff - work stress, relationships, the daily grind

DO NOT:
- Sound like a sermon or textbook
- Use churchy language ("thus", "therefore", "we must")
- Be preachy or give commands
- Start with "When scripture speaks of..." (too formal)
- List verses like a bibliography`

      const academicPrompt = `Write a substantive theological reflection on what Scripture teaches about ${theme} (450-550 words).

APPROACH:
- Scholarly but accessible depth
- Reference 5-7 key passages with proper citations
- Include relevant Hebrew/Greek word meanings where illuminating
- Show how this theme develops across Old and New Testaments
- Reference how theologians or church fathers have understood this concept
- Draw out theological implications

TONE:
- Seminary-level insight made readable
- Thoughtful, substantive, rich with cross-references
- Like a well-researched study guide`

      const themePrompt = contentStyle === "academic" ? academicPrompt : casualPrompt

      try {
        const { text } = await generateText({
          model: openrouter(modelId),
          system: `You are writing about the biblical theme of ${theme}.

${ageInstruction}${langNote}

STYLE: ${contentStyle === "academic" ? "Scholarly, substantive, well-cited" : "Casual, warm, like talking to a friend"}

This is about the THEME itself - what the Bible teaches about ${theme}. Reference multiple scriptures.`,
          prompt: `${themePrompt}

Write your response now. Start directly with the content - no preamble.`,
          maxOutputTokens: contentStyle === "academic" ? 1800 : 1200,
        })

        console.log("[API] Theme teaching raw response length:", text?.length)
        
        let teaching = text?.trim() || "Unable to generate teaching."
        teaching = cleanInterpretation(teaching)

        console.log("[API] Theme teaching cleaned length:", teaching?.length)

        return Response.json({
          interpretation: teaching,
          heroImagePrompt: `A serene, cinematic scene representing ${theme} with golden light and spiritual atmosphere`,
          isThemeTeaching: true,
        })
      } catch (themeError) {
        console.error("[API] Theme generation error:", themeError)
        return Response.json({ 
          error: "Failed to generate theme teaching",
          interpretation: "Unable to generate teaching. Please try again."
        }, { status: 500 })
      }
    }

    // REGULAR verse-based devotional (YouVersion, Find a Verse, etc.)
    const styleInstruction = contentStyle === "academic"
      ? `Write a substantive theological reflection (300-400 words). Include:
- Historical and literary context of the passage
- Key Greek or Hebrew words and their deeper meanings
- Cross-references to related scripture that illuminate the text
- Theological implications and how scholars have understood this
- Application that emerges naturally from the deeper understanding
Write with scholarly depth but accessible language. This is seminary-level insight made readable.`
      : `Write a warm, thoughtful reflection (250-300 words).

VOICE: You are reflecting on this verse as yourself - a thoughtful person sharing observations. 
- First person or direct address ("This verse...", "There's something striking here...", "Notice how...")
- Observational and contemplative, like journaling or thinking out loud
- Connect to universal human experience
- Let insight emerge naturally

DO NOT:
- Write fictional scenes with characters ("She read...", "He thought...", "Maria wondered...")
- Create dialogue or narrative stories
- Use second-person "you should" prescriptions
- Be preachy or give advice`

    console.log("[API] Generating interpretation for:", verseReference)
    
    const { text } = await generateText({
      model: openrouter(modelId),
      system: `${styleInstruction}

${ageInstruction}${langNote}

CRITICAL RULES:
- Do NOT search the web or include any URLs, links, or citations
- Do NOT mention any websites (no .com, .org, etc.)
- Do NOT create fictional characters or scenes
- Do NOT write "She thought..." or "He wondered..." narrative
- Write as direct reflection, not a story about someone reading the verse
- Never be preachy. Never use clichés. Never tell people what they "should" do.`,
      prompt: `${verseReference}: "${verseText}"

Write a direct, thoughtful reflection on this verse. No fictional framing, no URLs, no citations.

INTERPRETATION===
[Your reflection here - direct voice, not a story]
===INTERPRETATION

IMAGE_PROMPT===
[Describe a beautiful LANDSCAPE or NATURE SCENE that evokes the feeling of this verse. Focus on: lighting, sky, terrain, atmosphere. Examples: "Golden sunset over calm ocean waters", "Misty mountain forest at dawn", "Peaceful meadow under starry sky". NEVER include the verse text, words, letters, or any writing in your description. Pure visual scenery only. 20-30 words.]
===IMAGE_PROMPT`,
      maxOutputTokens: contentStyle === "academic" ? 1500 : 1000,
    })

    console.log("[API] Raw response length:", text?.length)
    console.log("[API] Raw response preview:", text?.substring(0, 200))
    
    const interpretationMatch = text.match(/INTERPRETATION===\s*([\s\S]*?)\s*===INTERPRETATION/)
    const imagePromptMatch = text.match(/IMAGE_PROMPT===\s*([\s\S]*?)\s*===IMAGE_PROMPT/)

    // If regex didn't match, use the whole text (model didn't follow format)
    let interpretation = interpretationMatch?.[1]?.trim()
    if (!interpretation || interpretation.length < 50) {
      // Fallback: use entire response, removing any image prompt section
      interpretation = text
        .replace(/IMAGE_PROMPT===.*$/s, '')
        .replace(/===INTERPRETATION/g, '')
        .replace(/INTERPRETATION===/g, '')
        .trim()
    }
    
    if (!interpretation || interpretation.length < 20) {
      interpretation = "Unable to generate interpretation."
    } else {
      interpretation = cleanInterpretation(interpretation)
    }

    let imagePrompt = imagePromptMatch?.[1]?.trim() || ""
    
    // Remove any verse text that might have snuck into the image prompt
    if (imagePrompt) {
      // Remove quotes and verse text patterns
      imagePrompt = imagePrompt
        .replace(/["'][^"']*["']/g, '') // Remove quoted text
        .replace(/Praise[^,.]*/gi, '') // Remove common verse starts
        .replace(/Lord[^,.]*/gi, '')
        .replace(/God[^,.]*/gi, '')
        .replace(/soul[^,.]*/gi, '')
        .replace(/\btext\b/gi, '')
        .replace(/\bwords\b/gi, '')
        .replace(/\bletters\b/gi, '')
        .replace(/\bwriting\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    }
    
    // Create a verse-specific fallback if no prompt was generated or it's too short
    const fallbackImagePrompt = `Serene landscape with golden sunlight breaking through clouds, peaceful atmosphere, cinematic composition`
    
    const finalImagePrompt = (imagePrompt && imagePrompt.length > 20) ? imagePrompt : fallbackImagePrompt
    
    console.log("[API] Generated image prompt:", finalImagePrompt)

    return Response.json({
      interpretation,
      heroImagePrompt: finalImagePrompt,
    })
  } catch (error) {
    console.error("Interpretation error:", error)
    return Response.json({ error: "Failed to generate interpretation" }, { status: 500 })
  }
}

function cleanInterpretation(text: string): string {
  if (!text || text.length < 20) return text // Don't clean very short text
  
  return text
    // Remove markdown links [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bare URLs
    .replace(/https?:\/\/[^\s]+/g, '')
    // Remove any domain references
    .replace(/\S*\.(com|org|net|edu|gov|io|bible)\S*/gi, '')
    // Remove sentences that mention websites/sources
    .split(/(?<=[.!?])\s+/)
    .filter(sentence => {
      const lower = sentence.toLowerCase()
      if (/(\.com|\.org|website|link|resource|article|click|visit)/i.test(lower)) return false
      if (sentence.trim().length < 10) return false
      return true
    })
    .join(' ')
    // Clean up double spaces
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
    zh: "Chinese", vi: "Vietnamese", ko: "Korean", th: "Thai",
  }
  return languages[code] || "English"
}
