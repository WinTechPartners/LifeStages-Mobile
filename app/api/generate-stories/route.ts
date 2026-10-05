import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

function getAgeSpecificExamples(ageRange: string): string {
  switch (ageRange?.toLowerCase()) {
    case "teen":
    case "teens":
      return `EXAMPLES OF GOOD TEEN STORIES (use these as inspiration, but create NEW unique scenarios):

Example 1: "The Quiet Corner"
Zoe sat in the back corner of the library during lunch, earbuds in but no music playing. She watched classmates laugh at their usual table through the window. Her phone buzzed – another group chat she'd been removed from. "Maybe I'm just meant to be alone," she thought, picking at her sandwich.

Example 2: "The Failed Test"
Marcus stared at the red "D-" on his chemistry test. His dad would lose it. College applications were due in months. His friend group was talking about MIT and Stanford. He felt his chest tighten. "I'm not smart enough for this," he whispered.

Example 3: "The Empty Seat"
Jenna walked into the cafeteria, tray in hand. Her best friend since middle school now sat with the popular kids. Every table seemed full. She ended up eating in the bathroom stall, scrolling TikTok to avoid crying.

YOUR TEEN CHARACTERS MUST:
✅ Be high school students (ages 14-18)
✅ Deal with school, friends, family, identity
✅ Have authentic teen concerns: grades, fitting in, social media, crushes, parent pressure
✅ Use teen settings: school, bedroom, local coffee shop, park, family home
✅ Have part-time jobs if any: babysitting, lifeguarding, retail (NOT careers)

YOUR TEEN CHARACTERS MUST NEVER:
❌ Have professional careers or full-time jobs
❌ Pay rent, bills, or have mortgages
❌ Be parents with children
❌ Work in corporate offices, marketing firms, tech companies
❌ Have graduate degrees or specialized training
❌ Be over 19 years old`

    case "university":
    case "college":
      return `EXAMPLES for college/university students (ages 18-24):
- Dorm life, roommate conflicts, first time away from home
- Part-time internships, campus jobs, student organizations
- Identity exploration, relationships, future anxiety
- NOT yet established careers or married with kids`

    case "adult":
    case "adults":
      return `EXAMPLES for adults (ages 25-55):
- Established careers: meetings, deadlines, promotions
- Family responsibilities: spouse, children, aging parents
- Financial concerns: mortgage, bills, savings
- Work-life balance, career pivots`

    case "senior":
    case "seniors":
      return `EXAMPLES for seniors (ages 55+):
- Retirement or late career
- Grandchildren, legacy, life reflection
- Health concerns, wisdom, mentoring younger generations`

    default:
      return "Create age-appropriate scenarios matching the reader's life stage"
  }
}

export async function POST(request: Request) {
  try {
    const { verseReference, verseText, ageRange, stageSituation, language = "en", source, sermonTitle, sermonSummary } = await request.json()

    // Determine if this is sermon-based or verse-based
    const isSermonMode = source === 'sermon' && sermonTitle
    const contentReference = isSermonMode ? sermonTitle : verseReference
    const contentText = isSermonMode ? sermonSummary : verseText

    console.log("[v0] generate-stories called for age:", ageRange, "situation:", stageSituation, "mode:", isSermonMode ? 'sermon' : 'verse')

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "anthropic/claude-sonnet-4-20250514").trim()

    const ageGuidelines = getAgeSpecificExamples(ageRange)

    const languageInstruction =
      language && language !== "en"
        ? `\n\nCRITICAL: Write ALL story content in ${language}. Only the delimiter labels (STORY_1_TITLE===, etc.) should be in English.`
        : ""

    const { text } = await generateText({
      model: openrouter(modelId),
      system: `You are a master storyteller creating deeply relatable, age-appropriate modern stories that connect Bible verses to real life.

${ageGuidelines}

CRITICAL INSTRUCTION: Create UNIQUE, ORIGINAL scenarios. Do NOT repeat the examples. Use them as inspiration for tone and age-appropriateness, then create completely NEW situations.

Format your response with these delimiters:
STORY_1_TITLE===
[Story 1 title here]
===STORY_1_TITLE

STORY_1_TEXT===
[Full story 1 text here - minimum 500 words with dialogue, emotion, vivid detail]
===STORY_1_TEXT

STORY_1_IMAGE===
[Detailed image prompt for story 1, matching the age and scenario]
===STORY_1_IMAGE

STORY_2_TITLE===
[Story 2 title here]
===STORY_2_TITLE

STORY_2_TEXT===
[Full story 2 text here - minimum 500 words with dialogue, emotion, vivid detail]
===STORY_2_TEXT

STORY_2_IMAGE===
[Detailed image prompt for story 2]
===STORY_2_IMAGE`,
      prompt: isSermonMode 
        ? `Create 2 completely unique stories that bring the sermon "${contentReference}" to life for someone who is ${ageRange} and ${stageSituation}.

Sermon summary: ${contentText}

Story 1: Modern day scenario - create a NEW original situation showing how the sermon's message applies today
Story 2: Historical/biblical era scenario showing the timeless truth of this message

Requirements:
- Each story MUST be 500+ words
- Rich dialogue showing authentic character voice
- Deep emotional moments that readers will feel
- Vivid sensory details (what characters see, hear, feel)
- Clear connection showing how the sermon's message speaks to the situation
- Characters that match the age range EXACTLY${languageInstruction}

Be creative and original - surprise me with fresh scenarios!`
        : `Create 2 completely unique stories that bring ${contentReference}: "${contentText}" to life for someone who is ${ageRange} and ${stageSituation}.

Story 1: Modern day scenario - create a NEW original situation (not the examples)
Story 2: Historical/biblical era scenario

Requirements:
- Each story MUST be 500+ words
- Rich dialogue showing authentic character voice
- Deep emotional moments that readers will feel
- Vivid sensory details (what characters see, hear, feel)
- Clear connection showing how the verse speaks to the situation
- Characters that match the age range EXACTLY${languageInstruction}

Be creative and original - surprise me with fresh scenarios!`,
      maxOutputTokens: 8000,
    })

    console.log("[v0] Raw LLM response (first 500 chars):", text.substring(0, 500))

    const story1TitleMatch = text.match(/STORY_1_TITLE===\s*([\s\S]*?)\s*===STORY_1_TITLE/)
    const story1TextMatch = text.match(/STORY_1_TEXT===\s*([\s\S]*?)\s*===STORY_1_TEXT/)
    const story1ImageMatch = text.match(/STORY_1_IMAGE===\s*([\s\S]*?)\s*===STORY_1_IMAGE/)

    const story2TitleMatch = text.match(/STORY_2_TITLE===\s*([\s\S]*?)\s*===STORY_2_TITLE/)
    const story2TextMatch = text.match(/STORY_2_TEXT===\s*([\s\S]*?)\s*===STORY_2_TEXT/)
    const story2ImageMatch = text.match(/STORY_2_IMAGE===\s*([\s\S]*?)\s*===STORY_2_IMAGE/)

    if (!story1TitleMatch || !story1TextMatch || !story2TitleMatch || !story2TextMatch) {
      console.error("[v0] Failed to parse stories. Full response:", text)
      throw new Error("Failed to parse story delimiters")
    }

    const stories = [
      {
        title: story1TitleMatch[1].trim(),
        text: story1TextMatch[1].trim(),
        imagePrompt: story1ImageMatch?.[1]?.trim() || "A warm, relatable scene from the story",
      },
      {
        title: story2TitleMatch[1].trim(),
        text: story2TextMatch[1].trim(),
        imagePrompt: story2ImageMatch?.[1]?.trim() || "A historical biblical scene",
      },
    ]

    console.log("[v0] Stories generated:", {
      story1: { title: stories[0].title, length: stories[0].text.length },
      story2: { title: stories[1].title, length: stories[1].text.length },
    })

    return Response.json({ stories })
  } catch (error) {
    console.error("Stories generation error:", error)
    return Response.json({ error: "Failed to generate stories" }, { status: 500 })
  }
}
