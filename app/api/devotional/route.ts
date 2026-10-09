import { entitlementProfile, hasPremium } from '@/lib/entitlements'
import { cacheGet, cacheSet } from '@/lib/content-cache'
import { preserveImage } from '@/lib/stored-images'
import { NextRequest, NextResponse } from 'next/server'
import { getCachedDevotional, saveCachedDevotional, getTodaysVerse } from '@/lib/supabase/cache'
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"
import { culturalInstruction } from "@/lib/cultural-context"
import { normalizeProfile, policyKey, readerInstruction, POLICY } from "@/lib/content-policy"

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

const MODEL_ID = process.env.OPENROUTER_MODEL_ID || "google/gemini-2.0-flash-001"

interface RequestBody {
  verse_reference?: string
  verse_text?: string
  age_range: string
  gender: string
  life_stage: string
  language: string
  church_id?: string | null
  content_style?: 'casual' | 'academic'
}

// Map frontend values to database values
function normalizeLifeStage(stage: string): string {
  const mapping: Record<string, string> = {
    'General': 'general',
    'New beginnings': 'new_beginnings',
    'New Beginnings': 'new_beginnings',
    'Struggling': 'struggling',
    'Transitions': 'transitions',
  }
  return mapping[stage] || stage.toLowerCase().replace(/\s+/g, '_')
}

function normalizeAgeRange(age: string): string {
  const mapping: Record<string, string> = {
    'teens': '13-17',
    'university': '18-23',
    'adult': '24-64',
    'senior': '65+',
  }
  return mapping[age] || age
}

export async function POST(request: NextRequest) {
  try {
    const body = await entitlementProfile(await request.json())
    
    // Normalize values
    // Content policy: Language + Country + Adult + Gender + General + Casual
    const policyProfile = normalizeProfile(body as unknown as Record<string, unknown>)
    await cacheSet("warmup-profile",policyKey(policyProfile),{profile:policyProfile})
    const age_range = normalizeAgeRange(policyProfile.ageRange)
    const life_stage = normalizeLifeStage(policyProfile.stageSituation)
    const gender = policyProfile.gender
    const language = policyProfile.language
    const church_id = body.church_id || null
    const content_style: string = policyProfile.contentStyle

    // Get verse - either from request or from today's schedule
    let verse_reference = body.verse_reference
    let verse_text = body.verse_text

    if (!verse_reference) {
      const todaysVerse = await getTodaysVerse(church_id)
      if (todaysVerse) {
        verse_reference = todaysVerse.verse_reference
        verse_text = todaysVerse.verse_text
      } else {
        return NextResponse.json(
          { error: 'No verse available for today' },
          { status: 404 }
        )
      }
    }

    // Build cache key
    const cacheKey = {
      verse_reference,
      age_range,
      gender,
      life_stage,
      language,
      church_id
    }

    console.log('[API] Checking cache for:', JSON.stringify(cacheKey))

    // Check cache first
    const accessCacheKey = {...cacheKey, country:policyProfile.country, content_style, personalized:policyProfile.personalized, circumstances:policyProfile.lifeCircumstances.join("|")}
    const cached = await cacheGet<any>('devotional-v3', accessCacheKey)
    
    if (cached) {
      const originalImage = cached.image_url
      const approved = originalImage ? await cacheGet<{approved:boolean; verse_reference?:string}>("image-policy", {url:originalImage}) : null
      cached.image_url = approved?.approved && approved.verse_reference === cached.verse_reference ? await preserveImage(originalImage) : null
      if (cached.image_url && cached.image_url !== originalImage) await saveCachedDevotional(cacheKey, { verse_text: cached.verse_text, reflection: cached.reflection, application: cached.application, prayer: cached.prayer, image_url: cached.image_url, audio_url: cached.audio_url }, MODEL_ID)

      console.log('[API] ⚡ CACHE HIT - returning cached devotional')
      return NextResponse.json({
        cache_hit: true,
        devotional: {
          verse: {
            reference: cached.verse_reference,
            text: cached.verse_text,
            version: 'NIV'
          },
          reflection: cached.reflection,
          application: cached.application,
          prayer: cached.prayer,
          image_url: cached.image_url,
          audio_url: cached.audio_url
        }
      })
    }

    console.log('[API] Cache MISS - generating new devotional for:', verse_reference)

    // Generate new content
    const styleInstruction = content_style === 'academic' 
      ? 'Write in a scholarly, theological style with depth and nuance. Use proper theological terminology.'
      : 'Write in a warm, conversational style like a caring friend sharing wisdom over coffee.'

    const ageContext = getAgeContext(age_range)
    const genderContext = gender === 'female' ? 'her' : 'his'
    const genderPronoun = gender === 'female' ? 'she' : 'he'
    const lifeStageContext = getLifeStageContext(life_stage)

    const languageInstruction = language !== 'en' 
      ? `IMPORTANT: Write the ENTIRE response in ${getLanguageName(language)}. Do not use English.`
      : ''
    const culturalNote = (await culturalInstruction(language)) + readerInstruction(policyProfile)

    const prompt = policyProfile.personalized ? `You are creating a personalized devotional for someone who is:
- Age: ${ageContext}
- Gender: ${gender}
- Life Stage: ${lifeStageContext}

${styleInstruction}
${languageInstruction}${culturalNote}

Based on this verse: "${verse_text}" (${verse_reference})

Generate a devotional with these sections:

1. REFLECTION: A 2-3 paragraph reflection on what this verse means, personalized for ${genderContext} life stage and situation. Make it deeply relevant to what ${genderPronoun} might be experiencing right now. Connect the ancient wisdom to modern daily life.

2. APPLICATION: A practical, specific way to apply this verse today. Give 2-3 concrete examples relevant to someone in ${lifeStageContext}. Be specific - not generic advice.

3. PRAYER: A heartfelt prayer based on this verse, written in first person ("Lord, I..."), that speaks to ${genderContext} current life circumstances. Make it personal and authentic.

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "reflection": "...",
  "application": "...",
  "prayer": "...",
  "heroImagePrompt": "A brief, vivid description for an inspirational image that captures the essence of this verse and devotional"
}` : `Explain this Bible verse for a general audience: "${verse_text}" (${verse_reference}).
${styleInstruction}
${languageInstruction}
${culturalNote}
Do not personalize to age, gender, name, or life situation. Do not assume the reader's family, work, health, feelings, or beliefs. Use ordinary everyday examples and preserve the meaning of the verse.
Return JSON only: reflection (2-3 paragraphs of Friendly Breakdown), application (general examples), prayer (short optional general prayer), heroImagePrompt (a visual scene that communicates this specific verse, with no lettering).`

    const { text } = await generateText({
      model: openrouter(MODEL_ID),
      prompt,
      maxOutputTokens: 2500,
      abortSignal: AbortSignal.timeout(30000),
    })

    // Parse the response
    let content
    try {
      const cleanJson = text.replace(/```json|```/g, '').trim()
      content = JSON.parse(cleanJson)
    } catch (parseError) {
      console.error('[API] Failed to parse LLM response:', text.substring(0, 500))
      return NextResponse.json(
        { error: 'Failed to generate devotional content' },
        { status: 500 }
      )
    }

    // Images load independently so provider delays cannot block the breakdown.
    const image_url: string | null = null

    // Save to cache
    const savedDevotional = await saveCachedDevotional(
      cacheKey,
      {
        verse_text: verse_text || '',
        reflection: content.reflection,
        application: content.application,
        prayer: content.prayer,
        image_url,
        audio_url: null
      },
      MODEL_ID
    )

    console.log('[API] New devotional saved to Supabase cache:', savedDevotional?.id)

    await cacheSet('devotional-v3', accessCacheKey, {verse_reference, verse_text, reflection:content.reflection, application:content.application, prayer:content.prayer, image_url, audio_url:null})
    return NextResponse.json({
      cache_hit: false,
      devotional: {
        verse: {
          reference: verse_reference,
          text: verse_text,
          version: 'NIV'
        },
        reflection: content.reflection,
        application: content.application,
        prayer: content.prayer,
        image_url,
        audio_url: null
      }
    })

  } catch (error) {
    console.error('[API] Devotional generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getAgeContext(age_range: string): string {
  const contexts: Record<string, string> = {
    '13-17': 'a teenager navigating school, friendships, identity questions, and growing independence',
    '18-23': 'a young adult in college or starting their career, making big decisions about their future',
    '24-64': 'an adult balancing work, relationships, family, and life responsibilities',
    '65+': 'a senior with decades of life experience, perhaps retired, reflecting on legacy and purpose'
  }
  return contexts[age_range] || 'an adult'
}

function getLifeStageContext(life_stage: string): string {
  const contexts: Record<string, string> = {
    'general': 'everyday life with its normal rhythms, joys, and challenges',
    'new_beginnings': 'an exciting but uncertain new chapter - perhaps a new job, marriage, baby, move, or fresh start',
    'struggling': 'a difficult season - facing health issues, financial stress, relationship problems, loneliness, or loss',
    'transitions': 'a major life transition - empty nest, retirement, divorce, career change, or significant shift'
  }
  return contexts[life_stage] || 'their current life circumstances'
}

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'pt': 'Portuguese',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'tl': 'Tagalog',
    'vi': 'Vietnamese',
  }
  return languages[code] || 'English'
}
