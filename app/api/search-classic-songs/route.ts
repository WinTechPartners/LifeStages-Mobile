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
      system: `You are a worship music expert who helps people find hymns and worship songs that connect with specific themes and scriptures.

RULES:
- Only recommend REAL songs that actually exist
- Mix classic hymns with modern worship songs
- Include a variety: traditional hymns, contemporary worship, gospel
- For each song, explain WHY it fits the theme
- Provide accurate artist/composer information
- Generate valid Spotify and YouTube search URLs`,
      prompt: `Find 4 worship songs (mix of classic hymns and modern worship) that connect with this theme:
Topic: "${topic}"
Context: ${context}

Return JSON only:
{
  "songs": [
    {
      "title": "Song Title",
      "artist": "Artist/Composer name",
      "year": "Year written/released (if known)",
      "why": "1-2 sentences explaining why this song fits the theme",
      "spotifyUrl": "https://open.spotify.com/search/[song title artist]",
      "youtubeUrl": "https://www.youtube.com/results?search_query=[song+title+artist]"
    }
  ]
}

Include a mix of:
- 1-2 traditional hymns (Amazing Grace, Great Is Thy Faithfulness, etc.)
- 1-2 modern worship songs (Hillsong, Elevation, Bethel, Chris Tomlin, etc.)

Make sure URLs are properly encoded (spaces become + or %20).`,
      maxOutputTokens: 1200,
    })

    const data = parseLLMJson<{ songs?: any[] }>(text.replace(/```json|```/g, "").trim())
    
    // Validate we got an array of songs back
    if (!data.songs || !Array.isArray(data.songs) || data.songs.length === 0) {
      console.error("Classic songs: unexpected response shape", JSON.stringify(data).substring(0, 300))
      return Response.json({ songs: [] })
    }

    // Ensure URLs are properly formatted and filter out malformed entries
    const songs = data.songs
      .filter((song: any) => song.title) // must at least have a title
      .map((song: any) => ({
        title: song.title || "Unknown Song",
        artist: song.artist || "Unknown Artist",
        year: song.year || null,
        why: song.why || "",
        spotifyUrl: song.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(song.title + ' ' + (song.artist || ''))}`,
        youtubeUrl: song.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(song.title + ' ' + (song.artist || ''))}`,
      }))
    
    return Response.json({ songs })
  } catch (error) {
    console.error("Classic songs search error:", error)
    return Response.json({ songs: [] }, { status: 200 })
  }
}
