import { cleanVisualScene, visualImageRequest } from "@/lib/visual-scene"
import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { verseImagePrompt } from "@/lib/verse-image"
import { isTextFree } from '@/lib/image-text-check'
import { preserveImage } from '@/lib/stored-images'
import { Runware } from "@runware/sdk-js"
import { cacheGet, cacheSet } from "@/lib/content-cache"
import { getCountryForLanguage } from "@/lib/cultural-context"
import { POLICY } from "@/lib/content-policy"

const DEMONYMS: Record<string, string> = {
  Vietnam: "Vietnamese",
  Mexico: "Mexican",
  Brazil: "Brazilian",
  China: "Chinese",
  Thailand: "Thai",
  Germany: "German",
  Belgium: "Belgian",
  Japan: "Japanese",
}

export async function POST(req: Request) {
  console.log("[v0] generate-image API called")
  let prompt = "image"
  let width = 1024
  let height = 1024
  let ageRange = ""

  try {
    const body = await req.json()
    prompt = typeof body.prompt==='string' ? body.prompt.replace(/NO TEXT|NO WORDS|NO LETTERS|NO WRITING/gi,'').replace(/[,\s]+$/,'') : ''
    {
      const source = body.verse_reference && body.verse_text ? verseImagePrompt({reference:body.verse_reference,text:body.verse_text}) : prompt
      if(!source) return Response.json({error:'A scene is required'},{status:400})
      const sceneKey={source,policy:'visual-scene-v2'}
      const existing=await cacheGet<{scene:string}>('image-scene',sceneKey)
      if(existing?.scene)prompt=existing.scene
      else{
        const provider=createOpenRouter({apiKey:process.env.OPENROUTER_API_KEY!})
        const planned=await generateText({model:provider(process.env.OPENROUTER_MODEL_ID||'google/gemini-2.5-flash-lite'),abortSignal:AbortSignal.timeout(25000),maxOutputTokens:250,system:'Translate the input meaning into a concrete visual-only photographic scene. Describe subjects, actions, surroundings, body language, composition and lighting. All visible surfaces are plain and unmarked. Communicate entirely through the scene. Return only the scene description in English, without headings or quoted source material. For a shepherd passage show a shepherd caring for sheep.',prompt:source})
        prompt=cleanVisualScene(planned.text)
        if(prompt.length<20)throw Error('Invalid scene plan')
        await cacheSet('image-scene',sceneKey,{scene:prompt})
      }
    }
    width = body.width || 1024
    height = body.height || 1024
    ageRange = POLICY.ageRange
    const language: string = "en"

    // Anchor every non-English image in the reader's country so the model
    // never defaults to Western faces or American scenery, whatever the
    // generated prompt happened to say.
    const country = getCountryForLanguage(language)
    if (country && prompt) {
      const people = DEMONYMS[country] || country
      prompt = `Scene set in ${country}. Where people appear, portray ${people} people. ${prompt}`
    }

    console.log("[v0] generate-image prompt:", prompt?.substring(0, 50) + "...")
    console.log("[v0] generate-image ageRange:", ageRange)

    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 })
    }

    const isTeen = ageRange?.toLowerCase() === "teen" || ageRange?.toLowerCase() === "teens"
    
    // Only the planned visual scene reaches the image model.
    const finalPrompt = prompt
    console.log("[v0] Final prompt (anime):", isTeen ? "YES" : "NO")

    const apiKey = process.env.RUNWARE_API_KEY
    if (!apiKey) {
      console.error("[v0] RUNWARE_API_KEY not configured")
      return Response.json({ error: 'Illustration is currently unavailable' }, { status: 503 })
    }

    const modelId = (process.env.RUNWARE_MODEL_ID || "runware:101@1").trim()
    const cacheKey = { policy: "visual-only-v7", prompt: finalPrompt, width, height, model: modelId }
    const hit = await cacheGet<{ imageUrl: string }>("image", cacheKey)
    if (hit?.imageUrl) {
      const saved = await preserveImage(hit.imageUrl)
      if (saved) { const payload = { imageUrl: saved }; await cacheSet('image', cacheKey, payload); return Response.json(payload) }
    }
    console.log("[v0] Using Runware model:", modelId)

    try {
      console.log("[v0] Creating Runware instance...")
      const runware = new Runware({ apiKey })

      console.log("[v0] Calling Runware SDK requestImages...")
      for (let attempt = 0; attempt < 2; attempt++) {
      const images = await runware.requestImages(visualImageRequest(prompt, modelId, width, height))

      console.log("[v0] Runware SDK response received:", images ? "yes" : "no")

      if (images && Array.isArray(images) && images.length > 0) {
        const dataUri = images[0].imageDataURI
        if (!dataUri || !await isTextFree(dataUri)) { console.warn("[Images] Rejected image containing text or unavailable verification"); continue }
        const imageUrl = await preserveImage(dataUri)
        console.log("[v0] Image URL from SDK:", imageUrl ? "received" : "null")

        if (imageUrl) {
          await cacheSet("image", cacheKey, { imageUrl })
          await cacheSet("image-policy", {url:imageUrl}, {approved:true, verse_reference:body.verse_reference || null})
          return Response.json({ imageUrl: imageUrl }, { status: 200 })
        }
      }
      }
    } catch (runwareError) {
      console.error(
        "[v0] Runware SDK error:",
        runwareError instanceof Error ? runwareError.message : String(runwareError),
      )
    }

    console.error("[v0] No verified text-free image returned from Runware")
    return Response.json({ error: 'Illustration is currently unavailable' }, { status: 503 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[v0] Top-level image generation error:", errorMessage)

    return Response.json({ error: 'Illustration is currently unavailable' }, { status: 503 })
  }
}
