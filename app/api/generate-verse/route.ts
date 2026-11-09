import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

async function fetchYouVersionVOTD(): Promise<{ reference: string; text: string; version: string } | null> {
  try {
    const response = await fetch("https://www.bible.com/verse-of-the-day", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      // Add timeout
      signal: AbortSignal.timeout(5000),
    })
    if (response.ok) {
      const html = await response.text()

      const altMatch = html.match(/alt="([^"]+\d+:\d+)\s*-\s*([^"]+)"/i)
      if (altMatch) {
        return {
          reference: altMatch[1].trim(),
          text: altMatch[2].trim(),
          version: "NIV",
        }
      }

      const titleMatch = html.match(/Verse of the Day[^-]*-\s*([A-Za-z]+\s+\d+:\d+)/i)
      if (titleMatch) {
        const reference = titleMatch[1].trim()
        const textMatch = html.match(new RegExp(reference.replace(/[:\d]+/g, "[:\\d]+") + "[^>]*>([^<]+)<", "i"))
        if (textMatch) {
          return {
            reference,
            text: textMatch[1].trim(),
            version: "NIV",
          }
        }
      }
    }
  } catch (e) {
    console.error("YouVersion fetch error:", e)
  }
  return null
}

// Fallback verses for when YouVersion is unavailable
const FALLBACK_VERSES = [
  { reference: "Psalm 23:1", text: "The Lord is my shepherd, I lack nothing.", version: "NIV" },
  { reference: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", version: "NIV" },
  { reference: "Philippians 4:13", text: "I can do all this through him who gives me strength.", version: "NIV" },
  { reference: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", version: "NIV" },
  { reference: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.", version: "NIV" },
  { reference: "Isaiah 40:31", text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.", version: "NIV" },
  { reference: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", version: "NIV" },
]

function getRandomFallbackVerse() {
  const today = new Date()
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
  return FALLBACK_VERSES[dayOfYear % FALLBACK_VERSES.length]
}

// 35 Theme verse pools - one key verse per theme
// Structure: Each theme gets a single powerful verse that embodies the concept
const THEME_VERSES: Record<string, string> = {
  // MONDAY - Mission Mode (The Launch)
  "Diligence": "Colossians 3:23-24",      // Work as for the Lord
  "Focus": "Philippians 3:13-14",         // Forgetting what's behind, pressing on
  "Integrity": "Proverbs 11:3",           // Integrity guides the upright
  "Wisdom": "James 1:5",                  // If any lacks wisdom, ask God
  "Obedience": "James 1:22",              // Be doers of the word
  
  // TUESDAY - Endurance Mode (The Grind)
  "Strength": "Isaiah 40:31",             // Renew their strength
  "Patience": "James 1:2-4",              // Testing produces perseverance
  "Perseverance": "Galatians 6:9",        // Don't grow weary doing good
  "Trust": "Proverbs 3:5-6",              // Trust with all your heart
  "Hope": "Romans 15:13",                 // God of hope fill you
  
  // WEDNESDAY - Battle Mode (The Hump)
  "Courage": "Joshua 1:9",                // Be strong and courageous
  "Boldness": "Acts 4:29-31",             // Speak your word with boldness
  "Identity": "Ephesians 2:10",           // We are God's handiwork
  "Discernment": "Hebrews 5:14",          // Trained to distinguish good from evil
  "Accountability": "Proverbs 27:17",     // Iron sharpens iron
  
  // THURSDAY - Community Mode (The People)
  "Compassion": "Colossians 3:12",        // Clothe yourselves with compassion
  "Service": "Galatians 5:13",            // Serve one another in love
  "Kindness": "Ephesians 4:32",           // Be kind to one another
  "Generosity": "2 Corinthians 9:7",      // God loves a cheerful giver
  "Unity": "Ephesians 4:2-3",             // Keep the unity of the Spirit
  
  // FRIDAY - Guardrails Mode (The Temptation)
  "Joy": "Nehemiah 8:10",                 // Joy of the Lord is strength
  "Self-Control": "Galatians 5:22-23",    // Fruit of the Spirit
  "Contentment": "Philippians 4:11-12",   // Learned to be content
  "Gratitude": "1 Thessalonians 5:18",    // Give thanks in all circumstances
  "Purity": "Psalm 51:10",                // Create in me a pure heart
  
  // SATURDAY - Recovery Mode (The Reset)
  "Rest": "Matthew 11:28-30",             // Come to me, I will give rest
  "Peace": "Philippians 4:6-7",           // Peace that transcends understanding
  "Humility": "Philippians 2:3-4",        // Value others above yourself
  "Forgiveness": "Colossians 3:13",       // Forgive as the Lord forgave
  "Silence": "Psalm 46:10",               // Be still and know
  
  // SUNDAY - Foundation Mode (The Core)
  "Faith": "Hebrews 11:1",                // Confidence in what we hope for
  "Love": "1 Corinthians 13:4-7",         // Love is patient, love is kind
  "Grace": "Ephesians 2:8-9",             // By grace you have been saved
  "Repentance": "2 Chronicles 7:14",      // If my people humble themselves
  "Worship": "Psalm 95:6-7",              // Come let us worship and bow down
}

// Get verse text for a reference using LLM
async function getVerseText(reference: string): Promise<{ reference: string; text: string; version: string } | null> {
  try {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = "google/gemini-2.0-flash-lite-001"

    const { text } = await generateText({
      model: openrouter(modelId),
      system: "Return only the NIV Bible verse text. No commentary, no introduction, just the verse.",
      prompt: `What is the NIV text of ${reference}? Return ONLY the verse text, nothing else.`,
      maxOutputTokens: 300,
    })

    return {
      reference,
      text: text.trim().replace(/^["']|["']$/g, ''), // Remove quotes if present
      version: "NIV",
    }
  } catch (e) {
    console.error("Verse text fetch error:", e)
    return null
  }
}

// Theme-based verse selection
async function selectVerseForTheme(theme: string): Promise<{ reference: string; text: string; version: string } | null> {
  try {
    const verseRef = THEME_VERSES[theme]
    if (!verseRef) {
      console.error("Unknown theme:", theme)
      return null
    }

    console.log(`[v0] Theme: ${theme} -> ${verseRef}`)
    return await getVerseText(verseRef)
  } catch (e) {
    console.error("Theme verse selection error:", e)
    return null
  }
}

export async function POST(request: Request) {
  try {
    const { source, verseQuery } = await request.json()

    // Handle specific verse query
    if (verseQuery) {
      console.log("[v0] generate-verse API - verseQuery requested:", verseQuery)
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY!,
      })

      const modelId = "google/gemini-2.0-flash-lite-001"

      const { text } = await generateText({
        model: openrouter(modelId),
        prompt: `Return ONLY a JSON object for the Bible verse: ${verseQuery}
        
        Return ONLY this JSON structure, no markdown, no explanation:
        {
          "reference": "Book Chapter:Verse (exactly as requested or corrected if needed)",
          "version": "NIV",
          "text": "The exact NIV text of the verse"
        }`,
        maxOutputTokens: 500,
      })

      const cleanJson = text.replace(/```json|```/g, "").trim()
      const data = JSON.parse(cleanJson)
      console.log("[v0] generate-verse API - LLM returned:", data.reference)
      return Response.json(data)
    }

    let verse = null

    // Handle theme-based selection (format: "Theme:ThemeName")
    if (source?.startsWith("Theme:")) {
      const theme = source.split(":")[1]
      console.log("[v0] generate-verse API - Theme requested:", theme)
      verse = await selectVerseForTheme(theme)
    }
    // Handle YouVersion
    else if (source === "YouVersion") {
      verse = await fetchYouVersionVOTD()
      // Use fallback if YouVersion fails
      if (!verse) {
        console.log("[v0] YouVersion failed, using fallback verse")
        verse = getRandomFallbackVerse()
      }
    }

    if (!verse) {
      console.log("[v0] generate-verse API - No verse found, returning error")
      return Response.json({ error: "Unable to fetch verse of the day" }, { status: 500 })
    }

    console.log("[v0] generate-verse API - Returning verse:", verse.reference)
    return Response.json(verse)
  } catch (error) {
    console.error("Verse generation error:", error)
    return Response.json({ error: "Failed to generate verse" }, { status: 500 })
  }
}
