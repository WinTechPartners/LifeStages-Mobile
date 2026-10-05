import { NextResponse } from 'next/server'
import { getPublishedSermonsForChurch } from '@/lib/church-management/server'
import { publicChurchConfig } from '@/lib/church-public'
import { getLatestImportedSermonForChurch } from '@/lib/sermon-automation/server'
import {
  getChurchBySlug,
  updateChurch,
  verifyChurchAdmin,
  getCustomVerses,
  upsertCustomVerse,
  deleteCustomVerse,
  getTrueTeachingsSermons,
  getLastSermonId,
  getChurchMemberStats,
  getChurchLifelineStats
} from '@/lib/church'

// GET /api/church/[slug] - Get church data
// POST /api/church/[slug] - Update church settings
export async function GET(request: Request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')
  const adminEmail = url.searchParams.get('adminEmail')
  const action = url.searchParams.get('action') || 'info'

  console.log('[Church API] GET request - slug:', slug, 'action:', action)

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  try {
    // Get church info
    console.log('[Church API] Looking up church with slug:', slug)
    const church = await getChurchBySlug(slug)

    console.log('[Church API] Church result:', church ? `Found: ${church.name}` : 'NOT FOUND')

    if (!church) {
      return NextResponse.json({ error: 'Church not found', slug }, { status: 404 })
    }

    // Public info (no admin check needed) - includes sermon data for member app
    if (action === 'info') {
      const published = await getPublishedSermonsForChurch(church.id, 1).catch(() => [])
      const imported = await getLatestImportedSermonForChurch(church.id).catch(() => null)
      const manualIsCurrent = published[0] && (!church.last_sermon_date || published[0].sermon_date >= church.last_sermon_date.slice(0, 10))
      const lastSermonId = manualIsCurrent ? undefined : await getLastSermonId(church).catch(() => undefined)
      return NextResponse.json(publicChurchConfig(church, published[0], lastSermonId, imported), { headers: { 'Cache-Control': 'no-store' } })
    }

    // Admin-only actions require email verification
    if (!adminEmail) {
      return NextResponse.json({ error: 'Admin email required' }, { status: 401 })
    }

    const verified = await verifyChurchAdmin(slug, adminEmail)
    if (!verified) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { admin } = verified

    // Return different data based on action
    switch (action) {
      case 'full':
        // Full church data for admin dashboard
        const memberStats = await getChurchMemberStats(church.id)
        const sermons = await getTrueTeachingsSermons(church.id, 20)

        // Get this week's verses
        const today = new Date()
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)

        const customVerses = await getCustomVerses(
          church.id,
          undefined,
          weekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0]
        )

        return NextResponse.json({
          church,
          admin: {
            email: admin.email,
            name: admin.name,
            role: admin.role,
          },
          memberStats,
          sermons: sermons.slice(0, 10),
          customVerses,
        })

      case 'verses':
        const startDate = url.searchParams.get('startDate')
        const endDate = url.searchParams.get('endDate')
        const verseType = url.searchParams.get('verseType') as any

        const verses = await getCustomVerses(church.id, verseType, startDate || undefined, endDate || undefined)
        return NextResponse.json({ verses })

      case 'sermons':
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const allSermons = await getTrueTeachingsSermons(church.id, limit)
        return NextResponse.json({ sermons: allSermons })

      case 'stats':
        const periodStart = url.searchParams.get('periodStart') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const periodEnd = url.searchParams.get('periodEnd') || new Date().toISOString().split('T')[0]
        const stats = await getChurchLifelineStats(church.id, periodStart, periodEnd)
        const members = await getChurchMemberStats(church.id)
        return NextResponse.json({ stats, members })

      default:
        return NextResponse.json({ church, admin: { role: admin.role } })
    }

  } catch (error) {
    console.error('[Church API] Error:', error)
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { slug, adminEmail, password, action, data } = body

    // Login action doesn't require prior verification (it IS the verification)
    if (action === 'login') {
      if (!slug || !adminEmail || !password) {
        return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
      }

      const verified = await verifyChurchAdmin(slug, adminEmail, password)

      if (!verified) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 403 })
      }

      const { church, admin } = verified

      // Return initial dashboard data on successful login
      const memberStats = await getChurchMemberStats(church.id)
      const sermons = await getTrueTeachingsSermons(church.id, 20)

      // Get this week's verses
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const customVerses = await getCustomVerses(
        church.id,
        undefined,
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0]
      )

      return NextResponse.json({
        success: true,
        church,
        admin: {
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
        memberStats,
        sermons: sermons.slice(0, 10),
        customVerses,
      })
    }

    if (!slug || !adminEmail) {
      return NextResponse.json({ error: 'Missing slug or adminEmail' }, { status: 400 })
    }

    // For other actions, strict authentication (which now implies password check if we passed it? 
    // No, we rely on the client maintaining session? 
    // Wait, the client only stores email.
    // So every request needs ONLY email?
    // That defeats the purpose if I just curl with email.
    // 
    // CRITICAL FIX: Every subsequent request MUST include the password (since we are stateless/JWT-less for now and just using minimal auth)
    // OR we should issue a token.
    // Implementing JWT right now is out of scope of "set up and only accessible by approved username/password".
    // 
    // Easiest "secure" way without full auth rewrite: 
    // The client should send the password with EVERY request.
    // It's not ideal (sending password constantly), but better than email-only.
    // 
    // So I will update the client to store the password in memory (or localStorage if user wants persistence, but memory is safer)
    // and send it with every request.
    // 
    // Update API to verify password on EVERY request.

    // Verify admin access (password required now)
    // Note: I need to update the client to send 'password' in all requests.
    // AND `verifyChurchAdmin` now returns null if password is missing (based on my previous edit plan)
    // But `verifyChurchAdmin` signature was `(slug, email, password?)`.
    // I need to pass password here.

    // BUT wait, `POST` body has `password`? I need to ensure client sends it.

    const verified = await verifyChurchAdmin(slug, adminEmail, password)
    if (!verified) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { church, admin } = verified

    // Check permissions for write actions
    if (admin.role === 'viewer') {
      return NextResponse.json({ error: 'Viewer role cannot make changes' }, { status: 403 })
    }

    switch (action) {
      case 'update_settings':
        // Update church settings
        const allowedFields = [
          'votd_source',
          'sermon_review_enabled',
          'sermon_prep_enabled',
          'current_sermon_title',
          'current_sermon_date',
          'current_sermon_theme',
          'current_sermon_scripture',
          'last_sermon_title',
          'last_sermon_date',
          'last_sermon_youtube_id',
          'last_sermon_youtube_url',
          'last_sermon_summary',
          'trueteachings_enabled',
          'trueteachings_auto_sync',
          'primary_color',
          'secondary_color',
          'logo_url',
        ]

        const updates: any = {}
        for (const field of allowedFields) {
          if (data[field] !== undefined) {
            updates[field] = data[field]
          }
        }

        const updated = await updateChurch(church.id, updates)
        return NextResponse.json({ success: true, church: updated })

      case 'add_verse':
        const newVerse = await upsertCustomVerse({
          church_id: church.id,
          verse_type: data.verse_type,
          target_date: data.target_date,
          verse_reference: data.verse_reference,
          verse_text: data.verse_text,
          verse_translation: data.verse_translation || 'NIV',
          sermon_context: data.sermon_context,
          display_order: data.display_order || 0,
          notes: data.notes,
          created_by: admin.id,
        })
        return NextResponse.json({ success: true, verse: newVerse })

      case 'delete_verse':
        const deleted = await deleteCustomVerse(data.verse_id)
        return NextResponse.json({ success: deleted })

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

  } catch (error) {
    console.error('[Church API] POST Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
