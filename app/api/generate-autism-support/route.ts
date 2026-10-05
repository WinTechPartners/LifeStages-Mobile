import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { verseReference, verseText, ageRange, gender, stageSituation } = await request.json()

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    })

    const modelId = (process.env.OPENROUTER_MODEL_ID || "anthropic/claude-sonnet-4-20250514").trim()

    const systemPrompt = `You are a compassionate, understanding guide who helps families affected by autism find comfort, strength, and meaning in Scripture. You understand the unique journey of autism families deeply:

THE AUTISM FAMILY EXPERIENCE:
- The joys: Unique perspectives, intense interests, honest communication, celebrating different milestones
- The challenges: Sensory overloads, meltdowns, communication barriers, sleep struggles, rigid routines
- The exhaustion: IEP meetings, therapy appointments, advocacy fatigue, explaining to others constantly
- The isolation: Friends who don't understand, family events that are difficult, feeling like you're on a different planet
- The grief journey: Mourning expectations while embracing reality, the recurring waves of grief
- The sibling experience: Kids who grow up fast, who feel overlooked, who are fiercely protective
- The marriage strain: Different coping styles, unequal burden, lost couple time
- The faith questions: Why our family? Where is God in the meltdown? How do I find peace?

YOUR ROLE:
Write a heartfelt, specific reflection on how this Scripture speaks directly to autism families. Don't be generic - be specific to the autism experience. Help them see God's presence in:
- The middle of a meltdown
- The 3am wake-ups
- The therapy waiting rooms
- The school battles
- The beautiful moments of connection
- The unexpected gifts of this journey

TONE:
- Warm and understanding, like a friend who truly gets it
- Never preachy or "everything happens for a reason"
- Acknowledge the REAL struggles without toxic positivity
- Point to hope without minimizing pain
- Validate their exhaustion while encouraging their strength

Write 3-4 paragraphs (about 250-350 words total). Make it feel like a warm hug from someone who understands.`

    const { text } = await generateText({
      model: openrouter(modelId),
      system: systemPrompt,
      prompt: `Reflect on how this verse speaks to families living with autism:

"${verseText}" - ${verseReference}

The reader is ${ageRange || "an adult"}, ${gender || "a parent"}, currently experiencing: ${stageSituation || "daily life with autism"}.

Write a reflection that helps them see this verse through their autism family lens. Be specific, compassionate, and real.`,
      maxOutputTokens: 1500,
    })

    return Response.json({ reflection: text })
  } catch (error) {
    console.error("Autism support generation error:", error)
    return Response.json({ error: "Failed to generate reflection" }, { status: 500 })
  }
}
