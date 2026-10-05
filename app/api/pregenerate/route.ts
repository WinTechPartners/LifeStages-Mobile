import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { saveCachedDevotional, getCachedDevotional } from '@/lib/supabase/cache'
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

const MODEL_ID = process.env.OPENROUTER_MODEL_ID || "google/gemini-2.0-flash-001"

// Pre-generate these combinations for tomorrow's verse
const PREGENERATE_PROFILES = [
  // Adult Male - all 4 life stages
  { age_range: '24-64', gender: 'male', life_stage: 'general' },
  { age_range: '24-64', gender: 'male', life_stage: 'new_beginnings' },
  { age_range: '24-64', gender: 'male', life_stage: 'struggling' },
  { age_range: '24-64', gender: 'male', life_stage: 'transitions' },
  // Adult Female - all 4 life stages
  { age_range: '24-64', gender: 'female', life_stage: 'general' },
  { age_range: '24-64', gender: 'female', life_stage: 'new_beginnings' },
  { age_range: '24-64', gender: 'female', life_stage: 'struggling' },
  { age_range: '24-64', gender: 'female', life_stage: 'transitions' },
]

// Generate hero image using Runware
async function generateHeroImage(prompt: string): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    
    const response = await fetch(`${baseUrl}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: `${prompt}. Warm lighting, inspirational, photorealistic, no text or words.`,
        width: 1024, 
        height: 768,
        ageRange: '24-64'
      }),
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.imageUrl || null
    }
  } catch (error) {
    console.error('[Pregenerate] Image generation failed:', error)
  }
  return null
}

// Generate devotional content
async function generateDevotionalContent(
  verse_reference: string,
  verse_text: string,
  profile: { age_range: string; gender: string; life_stage: string }
) {
  const genderContext = profile.gender === 'female' ? 'her' : 'his'
  const genderPronoun = profile.gender === 'female' ? 'she' : 'he'
  
  const lifeStageContexts: Record<string, string> = {
    'general': 'everyday life with its normal rhythms, joys, and challenges',
    'new_beginnings': 'an exciting but uncertain new chapter - perhaps a new job, marriage, baby, move, or fresh start',
    'struggling': 'a difficult season - facing health issues, financial stress, relationship problems, loneliness, or loss',
    'transitions': 'a major life transition - empty nest, retirement, divorce, career change, or significant shift'
  }

  const prompt = `You are creating a personalized devotional for someone who is:
- Age: an adult (24-64) balancing work, relationships, family, and life responsibilities
- Gender: ${profile.gender}
- Life Stage: ${lifeStageContexts[profile.life_stage]}

Write in a warm, conversational style like a caring friend sharing wisdom over coffee.

Based on this verse: "${verse_text}" (${verse_reference})

Generate a devotional with these sections:

1. REFLECTION: A 2-3 paragraph reflection on what this verse means, personalized for ${genderContext} life stage and situation. Make it deeply relevant to what ${genderPronoun} might be experiencing right now. Connect the ancient wisdom to modern daily life.

2. APPLICATION: A practical, specific way to apply this verse today. Give 2-3 concrete examples relevant to someone in ${lifeStageContexts[profile.life_stage]}. Be specific - not generic advice.

3. PRAYER: A heartfelt prayer based on this verse, written in first person ("Lord, I..."), that speaks to ${genderContext} current life circumstances. Make it personal and authentic.

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "reflection": "...",
  "application": "...",
  "prayer": "...",
  "heroImagePrompt": "A brief, vivid description for an inspirational image that captures the essence of this verse and devotional"
}`

  const { text } = await generateText({
    model: openrouter(MODEL_ID),
    prompt,
    maxOutputTokens: 2500,
  })

  const cleanJson = text.replace(/```json|```/g, '').trim()
  return JSON.parse(cleanJson)
}

export async function POST(request: NextRequest) {
  try {
    const { secret, date } = await request.json()
    
    // Validate secret
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const expectedSecret = serviceRoleKey.slice(-10)
    
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get target date (default: tomorrow)
    const targetDate = date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    console.log(`[Pregenerate] Starting pre-generation for ${targetDate}`)

    // Get tomorrow's verse from database
    const { data: verseData, error: verseError } = await supabaseAdmin
      .from('verses')
      .select('verse_reference, verse_text')
      .eq('date', targetDate)
      .is('church_id', null)
      .single()

    if (verseError || !verseData) {
      return NextResponse.json({ 
        error: 'No verse found for target date',
        date: targetDate 
      }, { status: 404 })
    }

    const { verse_reference, verse_text } = verseData
    console.log(`[Pregenerate] Verse for ${targetDate}: ${verse_reference}`)

    const results: any[] = []
    let generated = 0
    let skipped = 0

    // Generate for each profile combination
    for (const profile of PREGENERATE_PROFILES) {
      const cacheKey = {
        verse_reference,
        age_range: profile.age_range,
        gender: profile.gender,
        life_stage: profile.life_stage,
        language: 'en',
        church_id: null
      }

      // Check if already cached
      const existing = await getCachedDevotional(cacheKey)
      if (existing) {
        console.log(`[Pregenerate] Already cached: ${profile.gender}/${profile.life_stage}`)
        skipped++
        results.push({
          profile: `${profile.gender}/${profile.life_stage}`,
          status: 'skipped',
          reason: 'already cached'
        })
        continue
      }

      try {
        console.log(`[Pregenerate] Generating: ${profile.gender}/${profile.life_stage}`)
        
        // Generate content
        const content = await generateDevotionalContent(verse_reference, verse_text, profile)
        
        // Generate hero image
        let image_url: string | null = null
        if (content.heroImagePrompt) {
          image_url = await generateHeroImage(content.heroImagePrompt)
        }

        // Save to cache
        await saveCachedDevotional(
          cacheKey,
          {
            verse_text,
            reflection: content.reflection,
            application: content.application,
            prayer: content.prayer,
            image_url,
            audio_url: null
          },
          MODEL_ID
        )

        generated++
        results.push({
          profile: `${profile.gender}/${profile.life_stage}`,
          status: 'generated',
          has_image: !!image_url
        })

        console.log(`[Pregenerate] Completed: ${profile.gender}/${profile.life_stage}`)
        
      } catch (error) {
        console.error(`[Pregenerate] Failed: ${profile.gender}/${profile.life_stage}`, error)
        results.push({
          profile: `${profile.gender}/${profile.life_stage}`,
          status: 'failed',
          error: String(error)
        })
      }
    }

    return NextResponse.json({
      success: true,
      date: targetDate,
      verse: verse_reference,
      summary: {
        total: PREGENERATE_PROFILES.length,
        generated,
        skipped,
        failed: PREGENERATE_PROFILES.length - generated - skipped
      },
      results
    })

  } catch (error) {
    console.error('[Pregenerate] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// GET endpoint to check pre-generation status for a date
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  try {
    // Get verse for that date
    const { data: verseData } = await supabaseAdmin
      .from('verses')
      .select('verse_reference, verse_text')
      .eq('date', date)
      .is('church_id', null)
      .single()

    if (!verseData) {
      return NextResponse.json({ 
        date,
        verse: null,
        cached_count: 0,
        profiles_checked: 0
      })
    }

    // Check how many profiles are cached
    let cached = 0
    for (const profile of PREGENERATE_PROFILES) {
      const existing = await getCachedDevotional({
        verse_reference: verseData.verse_reference,
        age_range: profile.age_range,
        gender: profile.gender,
        life_stage: profile.life_stage,
        language: 'en',
        church_id: null
      })
      if (existing) cached++
    }

    return NextResponse.json({
      date,
      verse: verseData.verse_reference,
      cached_count: cached,
      total_profiles: PREGENERATE_PROFILES.length,
      ready: cached === PREGENERATE_PROFILES.length
    })

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
