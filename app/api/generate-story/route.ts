import { entitlementProfile } from '@/lib/entitlements'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { languageInstruction } from '@/lib/language-instruction'
import { culturalInstruction } from '@/lib/cultural-context'
import { cacheGet, cacheSet } from '@/lib/content-cache'
import { normalizeProfile, policyKey, readerInstruction } from '@/lib/content-policy'
import { parseLLMJson } from '@/lib/parse-llm-json'
import { validateModernStory, modernStoryVariant, STORY_FORMAT } from '@/lib/story-format'

export async function POST(request: Request) {
  try {
    const body = await entitlementProfile(await request.json())
    const { verseReference, verseText } = body
    const variant = modernStoryVariant(body.storyType)
    if (!verseReference || !verseText || !variant) return Response.json({ error: 'A verse and story option are required' }, { status: 400 })
    const p = normalizeProfile(body)
    const cacheKey = policyKey(p, { verse: verseReference, verseText, storyType: variant, format: STORY_FORMAT })
    const hit = await cacheGet('story', cacheKey)
    if (hit) return Response.json(hit)
    const provider = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! })
    let otherStory = ''
    if(variant==='modern-2'){
      const firstKey=policyKey(p,{verse:verseReference,verseText,storyType:'modern-1',format:STORY_FORMAT})
      let first:any=await cacheGet('story',firstKey)
      if(!first){const response=await POST(new Request(request.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,storyType:'modern-1'})}));if(!response.ok)throw Error('First story unavailable');first=await response.json()}
      otherStory='The other story option is: '+JSON.stringify({title:first.title,text:first.text})+'. Your story must use different characters, a different setting, a different problem and a different resolution while communicating the same verse. Do not retell that plot or reuse names.'
    }
    const perspective = variant === 'modern-1'
      ? 'Use an ordinary present-day interaction in which the meaning becomes clear through what someone does.'
      : 'Use a different present-day situation and a different set of characters. Let an unexpected conversation or small turning point reveal the meaning. Avoid a repetitive work-stress plot.'
    const { text } = await generateText({
      model: provider(process.env.OPENROUTER_MODEL_ID || 'google/gemini-2.5-flash-lite'),
      abortSignal: AbortSignal.timeout(35000), maxOutputTokens: 2400,
      system: `Write a short fictional story for a reader who understands Scripture best through concrete storytelling. BOTH story options are contemporary fiction set in modern day, in the reader's culture. No historical settings, real testimonies, or invented claims about real people. ${perspective}
${otherStory}
Use 350–500 words total, natural dialogue, relatable people, a clear beginning, tension, and a believable resolution. Ground the selected verse's central meaning in the events. Keep faith and the meaning of the passage intact. Do not tack on a sermon or a list of lessons.
Split the continuous story into firstHalf and secondHalf at a natural midpoint turning point. Create TWO different photographic scene prompts: imagePrompt for the opening, midImagePrompt for the midpoint. Describe the same characters consistently in both; no lettering, captions, quotes, signs, labels or watermarks. Image prompts stay in English.${languageInstruction(p.language, 'title, firstHalf and secondHalf must all be in that language.')}${await culturalInstruction(p.language)}${readerInstruction(p)}`,
      prompt: `Bring the meaning of ${verseReference} to life: ${verseText}
Return JSON only: {"title":"...","firstHalf":"first half of the story, paragraphs separated by newlines","secondHalf":"continuous second half","imagePrompt":"opening scene with character appearance details","midImagePrompt":"different midpoint scene with consistent character details"}`,
    })
    const result = validateModernStory(parseLLMJson(text))
    await cacheSet('story', cacheKey, result)
    return Response.json(result)
  } catch {
    return Response.json({ error: 'Unable to create this story. Please retry.' }, { status: 502 })
  }
}
