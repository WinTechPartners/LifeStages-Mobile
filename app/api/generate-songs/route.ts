import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { verseReference, verseText, ageRange, language = "en", source, sermonTitle, sermonSummary } = await request.json()

    // Determine if this is sermon-based or verse-based
    const isSermonMode = source === 'sermon' && sermonTitle
    const contentReference = isSermonMode ? `the sermon "${sermonTitle}"` : verseReference
    const contentText = isSermonMode ? sermonSummary : verseText

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "google/gemini-2.0-flash-001").trim()

    const styleGuide: Record<string, string> = {
      teens: `Target: Current Billboard Hot 100 sound
Style: High-energy pop, synth-pop, or pop-punk
Tempo: 120+ BPM, energetic
Influences: Olivia Rodrigo, Billie Eilish, Twenty One Pilots
Lyrics: Raw emotion, identity struggles, authentic doubt and hope`,
      university: `Target: Indie-pop crossover appeal  
Style: Indie-pop with R&B influences, atmospheric
Tempo: 90-110 BPM, introspective but building
Influences: FINNEAS, Hozier, Phoebe Bridgers
Lyrics: Vulnerable, questioning, poetic imagery`,
      adult: `Target: Anthemic crossover appeal
Style: Pop-rock, stadium-ready, emotional builds
Tempo: 100-120 BPM, powerful
Influences: Coldplay, OneRepublic, Imagine Dragons
Lyrics: Universal struggles, hope in darkness, resilience`,
      senior: `Target: Adult contemporary, timeless
Style: Warm acoustic-pop, piano-driven, melodic
Tempo: 70-90 BPM, reflective
Influences: James Taylor, Sara Bareilles, acoustic worship
Lyrics: Wisdom, gratitude, peace in the journey`,
    }

    const style = styleGuide[ageRange] || styleGuide.adult
    const langNote = language !== "en" ? ` Write lyrics in ${getLanguageName(language)}.` : ""

    const { text } = await generateText({
      model: openrouter(modelId),
      system: `You're a professional songwriter writing for mainstream artists. Your songs get radio play - they're catchy, emotional, and well-crafted.

${style}

SONGWRITING RULES:
- NO hymn language (thee/thou/thy/hath) - this is 2024
- NO cheesy Christian music clichés
- Hook should be memorable, singable, sticky
- Verses tell a story or paint a picture
- Pre-chorus builds tension
- Chorus releases with emotional punch
- Bridge offers a twist or deeper moment
- Professional structure: Verse/Pre/Chorus/Verse/Pre/Chorus/Bridge/Chorus
- 3-4 minute song length when performed${langNote}

The spiritual truth should be woven in naturally - not preachy, just real. Think "Viva La Vida" not "Amazing Grace."`,
      prompt: `Write a radio-ready song inspired by ${contentReference}: "${contentText}"

TITLE===
[Catchy, intriguing title - could chart]
===TITLE

SUBTITLE===
[Genre/style descriptor]
===SUBTITLE

LYRICS===
[Full song with clear structure:
VERSE 1
(4-6 lines)

PRE-CHORUS
(2-4 lines building)

CHORUS
(memorable, repeatable, emotional peak)

VERSE 2
(advances the story/deepens emotion)

PRE-CHORUS

CHORUS

BRIDGE
(something unexpected, a twist)

FINAL CHORUS
(maybe bigger/different)]
===LYRICS

AUDIO_PROMPT===
[Detailed Suno AI prompt: specific genre, tempo BPM, instruments, production style, mood, vocal style - 40 words]
===AUDIO_PROMPT

IMAGE_PROMPT===
[Album art: modern, Spotify-worthy, cinematic - 25 words]
===IMAGE_PROMPT`,
      maxOutputTokens: 1800,
    })

    // Strip markdown fences if the model wrapped its response
    const cleaned = text.replace(/```[\w]*\n?/g, "").trim()

    const titleMatch = cleaned.match(/TITLE===\s*([\s\S]*?)\s*===TITLE/)
    const subtitleMatch = cleaned.match(/SUBTITLE===\s*([\s\S]*?)\s*===SUBTITLE/)
    const lyricsMatch = cleaned.match(/LYRICS===\s*([\s\S]*?)\s*===LYRICS/)
    const audioMatch = cleaned.match(/AUDIO_PROMPT===\s*([\s\S]*?)\s*===AUDIO_PROMPT/)
    const imageMatch = cleaned.match(/IMAGE_PROMPT===\s*([\s\S]*?)\s*===IMAGE_PROMPT/)

    if (!titleMatch || !lyricsMatch) {
      // Log the raw response so we can see what the model actually returned
      console.error("Failed to parse song. Raw LLM response:", text.substring(0, 500))
      
      // Fallback: try to extract something useful even if delimiters are off
      const lines = cleaned.split("\n").filter(l => l.trim())
      const fallbackTitle = lines[0]?.replace(/^#+\s*/, "").replace(/\*+/g, "").trim() || "Untitled Song"
      const fallbackLyrics = lines.slice(1).join("\n").trim() || "Lyrics could not be generated. Please try again."
      
      return Response.json({
        songs: {
          title: fallbackTitle,
          sub: "Contemporary Pop",
          lyrics: fallbackLyrics,
          prompt: "uplifting pop song, professional production",
          imagePrompt: "modern album art, cinematic, atmospheric",
        }
      })
    }

    return Response.json({
      songs: {
        title: titleMatch[1].trim(),
        sub: subtitleMatch?.[1]?.trim() || "Contemporary Pop",
        lyrics: lyricsMatch[1].trim(),
        prompt: audioMatch?.[1]?.trim() || "uplifting pop song, professional production",
        imagePrompt: imageMatch?.[1]?.trim() || "modern album art, cinematic, atmospheric",
      }
    })
  } catch (error) {
    console.error("Songs error:", error)
    return Response.json({ error: "Failed to generate songs" }, { status: 500 })
  }
}

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
    zh: "Chinese", vi: "Vietnamese", ko: "Korean", th: "Thai",
  }
  return languages[code] || "English"
}
