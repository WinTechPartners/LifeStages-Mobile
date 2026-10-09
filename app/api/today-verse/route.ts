import { webPassage, scheduledFallback } from '@/lib/web-scripture'
import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'

// Get today's verse directly from database - FAST, no LLM needed
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const churchId = searchParams.get('church_id') || null
    const dateParam = searchParams.get('date') || null

    // Support fetching a specific date (for swipe history) or default to today
    const today = dateParam || new Date().toISOString().split('T')[0]
    if(!/^\d{4}-\d{2}-\d{2}$/.test(today)||!Number.isFinite(Date.parse(today+'T00:00:00Z'))||new Date(today+'T00:00:00Z').toISOString().slice(0,10)!==today)return NextResponse.json({error:'Invalid date'},{status:400})
    console.log('[Today Verse] Looking up date:', today)

    // Try church-specific verse first
    if (churchId) {
      const churchVerse = await queryOne<{ verse_reference: string; verse_text: string; bible_url: string | null }>(
        'SELECT verse_reference, verse_text, bible_url FROM verses WHERE date = $1 AND church_id = $2 LIMIT 1',
        [today, churchId]
      )
      if (churchVerse) {
        return NextResponse.json({
          reference: churchVerse.verse_reference,
          text: (await webPassage(churchVerse.verse_reference)).text,
          version: 'WEB',
          bible_url: null,
          source: 'church'
        })
      }
    }

    // Fall back to default schedule
    const defaultVerse = await queryOne<{ verse_reference: string; verse_text: string; bible_url: string | null }>(
      'SELECT verse_reference, verse_text, bible_url FROM verses WHERE date = $1 AND church_id IS NULL LIMIT 1',
      [today]
    )

    if (defaultVerse) {
      return NextResponse.json({
        reference: defaultVerse.verse_reference,
        text: (await webPassage(defaultVerse.verse_reference)).text,
        version: 'WEB',
        bible_url: null,
        source: 'database'
      })
    }

    console.log('[Today Verse] No verse in database for', today, '- returning null to trigger fallback')

    // Return null so the frontend knows to use generate-verse API instead
    return NextResponse.json(scheduledFallback(today))

  } catch (error) {
    console.error('[Today Verse] Error:', error)
    return NextResponse.json(scheduledFallback(new Date().toISOString().slice(0,10)))
  }
}
