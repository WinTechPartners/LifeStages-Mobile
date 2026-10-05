import { supabaseAdmin } from './supabase'
import crypto from 'node:crypto'

// =====================================================
// TYPES
// =====================================================

export interface Church {
  id: string
  slug: string
  name: string
  welcome_message?: string | null
  leadership_contact_name?: string | null
  leadership_contact_email?: string | null
  leadership_contact_phone?: string | null
  leadership_contact_url?: string | null
  logo_url: string | null
  primary_color: string
  secondary_color: string
  denomination: string | null
  website_url: string | null
  youtube_channel_url: string | null
  youtube_channel_id: string | null
  tier: 'starter' | 'weekly_sermon' | 'church_voice'

  // VOTD Settings
  votd_source: 'bible_com' | 'custom' | 'hybrid'

  // Sermon Settings
  sermon_review_enabled: boolean
  sermon_prep_enabled: boolean
  current_sermon_title: string | null
  current_sermon_date: string | null
  current_sermon_theme: string | null
  current_sermon_scripture: string | null
  last_sermon_title: string | null
  // Resolved from an exact archive source match; not a churches-table column.
  last_sermon_id?: string
  last_sermon_date: string | null
  last_sermon_youtube_id: string | null
  last_sermon_youtube_url: string | null
  last_sermon_summary: string | null
  last_sermon_key_points: any[]

  // TrueTeachings
  trueteachings_enabled: boolean
  trueteachings_sermons_indexed: number
  trueteachings_total_hours: number
  trueteachings_last_sync: string | null
  trueteachings_auto_sync: boolean
  trueteachings_top_themes: any[]
  trueteachings_top_verses: any[]

  // Stats
  total_members: number
  active_members_7d: number
  active_members_30d: number

  created_at: string
  updated_at: string
}

export interface ChurchAdmin {
  id: string
  church_id: string
  email: string
  name: string | null
  role: 'owner' | 'pastor' | 'admin' | 'viewer'
  last_login: string | null
  created_at: string
}

export interface ChurchCustomVerse {
  id: string
  church_id: string
  verse_type: 'votd_override' | 'sermon_verse' | 'sermon_prep'
  target_date: string
  verse_reference: string
  verse_text: string | null
  verse_translation: string
  sermon_context: string | null
  display_order: number
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface TrueTeachingsSermon {
  id: string
  church_id: string
  youtube_id: string
  youtube_url: string
  title: string
  description: string | null
  duration_seconds: number | null
  published_at: string | null
  thumbnail_url: string | null
  transcript_status: 'pending' | 'processing' | 'completed' | 'failed'
  summary: string | null
  key_points: any[]
  themes: any[]
  scripture_references: any[]
  chunks_count: number
  pastor_name: string | null
  sermon_series: string | null
  sermon_date: string | null
  created_at: string
  updated_at: string
}

// =====================================================
// AUTH HELPERS
// =====================================================

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const iterations = 10000
  const keylen = 64
  const digest = 'sha512'

  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest)
  return `${salt}:${derivedKey.toString('hex')}`
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    const [salt, key] = hash.split(':')
    const iterations = 10000
    const keylen = 64
    const digest = 'sha512'

    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest)
    return key === derivedKey.toString('hex')
  } catch (err) {
    return false
  }
}

// =====================================================
// CHURCH FUNCTIONS
// =====================================================

export async function getChurchBySlug(slug: string): Promise<Church | null> {
  const { data, error } = await supabaseAdmin
    .from('churches')
    .select('*')
    .eq('slug', slug.toLowerCase())
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching church:', error)
  }

  return data
}

export async function updateChurch(
  churchId: string,
  updates: Partial<Church>
): Promise<Church | null> {
  const { data, error } = await supabaseAdmin
    .from('churches')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', churchId)
    .select()
    .single()

  if (error) {
    console.error('Error updating church:', error)
    return null
  }

  return data
}

// =====================================================
// ADMIN FUNCTIONS
// =====================================================

export async function getChurchAdmin(
  churchId: string,
  email: string
): Promise<ChurchAdmin | null> {
  const { data, error } = await supabaseAdmin
    .from('church_admins')
    .select('*')
    .eq('church_id', churchId)
    .eq('email', email.toLowerCase())
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching church admin:', error)
  }

  return data
}

export async function verifyChurchAdmin(
  slug: string,
  email: string,
  password?: string
): Promise<{ church: Church; admin: ChurchAdmin } | null> {
  const church = await getChurchBySlug(slug)
  if (!church) return null

  // Get admin with password_hash
  const { data: admin, error } = await supabaseAdmin
    .from('church_admins')
    .select('*')
    .eq('church_id', church.id)
    .eq('email', email.toLowerCase())
    .single()

  if (error || !admin) return null

  // If password is provided, verify it
  if (password) {
    if (!admin.password_hash) {
      // Allow login if no password set yet?
      // Security decision: NO. Must have password set.
      // BUT for migration ease, maybe?
      // The plan said: "Existing admins will need to have a password set"
      return null
    }

    const isValid = verifyPassword(password, admin.password_hash)
    if (!isValid) return null
  } else {
    // If no password provided, it's an old-style check?
    // The plan said: "replacing the current email-only check"
    // So we should fail if no password provided.
    // However, existing calls might break.
    // I should make password MANDATORY for `verifyChurchAdmin` if I update callers.
    // Current callers: app/api/church/route.ts

    // For safety, I'll allow it ONLY if password_hash is NOT set on the user yet?
    // No, that leaves it open.
    // I will enforce password check if password argument is passed.
    // And I will update the API route to PASS the password.

    // Wait, the API route calls this in GET (no password) and POST (no password currently).
    // I need to update those calls.
    // If I change the signature now, I might break the app temporarily.
    // But `password?` is optional.

    // Crucial: The `GET` route currently does `verifyChurchAdmin` to simply check existence/role.
    // If I enforce password, `GET` needs password?
    // `GET` action=full calls this.
    // If I remove `action=full` from GET as planned, then GET won't need full auth.
    // But `POST` will.

    // For now, I'll return null if password is NOT provided but user HAS a hash.
    // If user has NO hash, maybe allow (legacy)?
    // Let's stick to the plan: enforce password.

    // But if I make checking optional based on argument presence,
    // I must ensure the API CALLS it with password.

    // Let's modify the function to:
    // 1. If password provided, verify it.
    // 2. If password NOT provided, return null (fail securely).
    // EXCEPT: I need to handle the transition where `app/api/church/route.ts` hasn't been updated yet.
    // But I'm updating it next.

    if (admin.password_hash) {
      // If they have a password, they MUST provide it.
      return null
    }
    // If they don't have a password set, we might allow legacy access
    // OR we just block them until they have one.
    // I will BLOCK them. The migration script will set a password.
    return null
  }

  // Update last login
  await supabaseAdmin
    .from('church_admins')
    .update({ last_login: new Date().toISOString() })
    .eq('id', admin.id)

  return { church, admin }
}

export async function getAllChurchAdmins(churchId: string): Promise<ChurchAdmin[]> {
  const { data, error } = await supabaseAdmin
    .from('church_admins')
    .select('*')
    .eq('church_id', churchId)
    .order('role', { ascending: true })

  if (error) {
    console.error('Error fetching church admins:', error)
    return []
  }

  return data || []
}

// =====================================================
// CUSTOM VERSES FUNCTIONS
// =====================================================

export async function getCustomVerses(
  churchId: string,
  verseType?: ChurchCustomVerse['verse_type'],
  startDate?: string,
  endDate?: string
): Promise<ChurchCustomVerse[]> {
  let query = supabaseAdmin
    .from('church_custom_verses')
    .select('*')
    .eq('church_id', churchId)

  if (verseType) {
    query = query.eq('verse_type', verseType)
  }

  if (startDate) {
    query = query.gte('target_date', startDate)
  }

  if (endDate) {
    query = query.lte('target_date', endDate)
  }

  const { data, error } = await query.order('target_date', { ascending: true })

  if (error) {
    console.error('Error fetching custom verses:', error)
    return []
  }

  return data || []
}

export async function upsertCustomVerse(
  verse: Omit<ChurchCustomVerse, 'id' | 'created_at'>
): Promise<ChurchCustomVerse | null> {
  const { data, error } = await supabaseAdmin
    .from('church_custom_verses')
    .upsert({
      ...verse,
      verse_translation: verse.verse_translation || 'NIV',
    }, {
      onConflict: 'church_id,verse_type,target_date,verse_reference'
    })
    .select()
    .single()

  if (error) {
    console.error('Error upserting custom verse:', error)
    return null
  }

  return data
}

export async function deleteCustomVerse(verseId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('church_custom_verses')
    .delete()
    .eq('id', verseId)

  if (error) {
    console.error('Error deleting custom verse:', error)
    return false
  }

  return true
}

// =====================================================
// TRUETEACHINGS FUNCTIONS
// =====================================================

export async function getTrueTeachingsSermons(
  churchId: string,
  limit: number = 50
): Promise<TrueTeachingsSermon[]> {
  const { data, error } = await supabaseAdmin
    .from('trueteachings_sermons')
    .select('*')
    .eq('church_id', churchId)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching TrueTeachings sermons:', error)
    return []
  }

  return data || []
}

/** Resolve only the archive record for the configured sermon, never an arbitrary latest row. */
export async function getLastSermonId(church: Church): Promise<string | undefined> {
  let youtubeId = church.last_sermon_youtube_id || undefined
  if (!youtubeId && church.last_sermon_youtube_url) {
    try {
      const url = new URL(church.last_sermon_youtube_url)
      const host = url.hostname.replace(/^www\./, '')
      if (host === 'youtu.be') youtubeId = url.pathname.split('/')[1]
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        youtubeId = url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]
      }
    } catch { /* A malformed source cannot identify an archive record. */ }
  }
  let query = supabaseAdmin.from('trueteachings_sermons').select('id').eq('church_id', church.id)
  if (youtubeId && /^[\w-]{11}$/.test(youtubeId)) {
    query = query.eq('youtube_id', youtubeId)
  } else if (!youtubeId && !church.last_sermon_youtube_url && church.last_sermon_date && church.last_sermon_title) {
    query = query.eq('sermon_date', church.last_sermon_date).eq('title', church.last_sermon_title)
  } else {
    return undefined
  }
  const { data, error } = await query.limit(2)
  if (error || data?.length !== 1) return undefined
  const id = data[0].id
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : undefined
}

export async function addTrueTeachingsSermon(
  sermon: Omit<TrueTeachingsSermon, 'id' | 'created_at' | 'updated_at'>
): Promise<TrueTeachingsSermon | null> {
  const { data, error } = await supabaseAdmin
    .from('trueteachings_sermons')
    .insert(sermon)
    .select()
    .single()

  if (error) {
    console.error('Error adding TrueTeachings sermon:', error)
    return null
  }

  return data
}

export async function searchTrueTeachings(
  churchId: string,
  query: string,
  limit: number = 10
): Promise<any[]> {
  // This is a simplified text search
  // For production, you'd use pgvector for semantic search
  const { data, error } = await supabaseAdmin
    .from('trueteachings_chunks')
    .select(`
      *,
      trueteachings_sermons (
        title,
        youtube_url,
        pastor_name,
        sermon_date
      )
    `)
    .eq('church_id', churchId)
    .textSearch('chunk_text', query)
    .limit(limit)

  if (error) {
    console.error('Error searching TrueTeachings:', error)
    return []
  }

  return data || []
}

// =====================================================
// STATS FUNCTIONS
// =====================================================

export async function getChurchLifelineStats(
  churchId: string,
  periodStart: string,
  periodEnd: string
): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('church_lifeline_stats')
    .select('*')
    .eq('church_id', churchId)
    .gte('period_start', periodStart)
    .lte('period_end', periodEnd)
    .order('access_count', { ascending: false })

  if (error) {
    console.error('Error fetching lifeline stats:', error)
    return []
  }

  return data || []
}

export async function getChurchMemberStats(churchId: string): Promise<{
  total: number
  active7d: number
  active30d: number
  byAgeGroup: Record<string, number>
  byGender: Record<string, number>
  byLifeStage: Record<string, number>
}> {
  // Get member counts
  const { data: members, error } = await supabaseAdmin
    .from('church_members')
    .select('age_group, gender, life_stage, last_active')
    .eq('church_id', churchId)

  if (error || !members) {
    return {
      total: 0,
      active7d: 0,
      active30d: 0,
      byAgeGroup: {},
      byGender: {},
      byLifeStage: {}
    }
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const stats = {
    total: members.length,
    active7d: 0,
    active30d: 0,
    byAgeGroup: {} as Record<string, number>,
    byGender: {} as Record<string, number>,
    byLifeStage: {} as Record<string, number>
  }

  members.forEach(m => {
    if (m.last_active) {
      const lastActive = new Date(m.last_active)
      if (lastActive >= sevenDaysAgo) stats.active7d++
      if (lastActive >= thirtyDaysAgo) stats.active30d++
    }

    if (m.age_group) {
      stats.byAgeGroup[m.age_group] = (stats.byAgeGroup[m.age_group] || 0) + 1
    }
    if (m.gender) {
      stats.byGender[m.gender] = (stats.byGender[m.gender] || 0) + 1
    }
    if (m.life_stage) {
      stats.byLifeStage[m.life_stage] = (stats.byLifeStage[m.life_stage] || 0) + 1
    }
  })

  return stats
}
