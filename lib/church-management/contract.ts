import { validateSermonSource, type SermonSourceInput } from '../sermon-automation/contract'
export type ChurchAdminRole = 'owner' | 'pastor' | 'admin' | 'viewer'
export interface ChurchBranding {
  name: string; logo_url: string | null; primary_color: string; secondary_color: string
  welcome_message: string | null; leadership_contact_name: string | null
  leadership_contact_email: string | null; leadership_contact_phone: string | null; leadership_contact_url: string | null
}
export interface ManagedChurch extends ChurchBranding { id: string; slug: string }
export interface SermonDraft {
  title: string; sermon_date: string; scripture: string; summary: string
  video_url: string | null; transcript?: string | null; source_sermon_id?: string | null
}
export interface PublishedSermon extends SermonDraft {
  id: string; church_id: string; published_at: string; published_by: string | null
  analysis_status: 'not_analyzed'
}
export type ChurchManagementRequest =
  | { action: 'login'; slug: string; email: string; password: string }
  | { action: 'accept_invite'; inviteToken: string; email: string; password: string; name: string; slug: string; churchName: string }
  | { action: 'update_church'; updates: Partial<ChurchBranding> }
  | { action: 'publish_sermon'; sermon: SermonDraft }
  | { action: 'save_sermon_source'; source: SermonSourceInput }
export type ManagementValidation<T> = { ok: true; value: T } | { ok: false; error: string }
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const keys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every(key => allowed.includes(key))
const text = (value: unknown, max: number, min = 0): value is string => typeof value === 'string' && value.trim().length >= min && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)
export const isChurchSlug = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/.test(value)
export const isManagementEmail = (value: unknown): value is string => text(value, 254, 3) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
function https(value: unknown) {
  if (!text(value, 2048, 1)) return false
  try { const url = new URL(value); return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password } catch { return false }
}
const bad = (error: string): { ok: false; error: string } => ({ ok: false, error })
export function validateChurchManagementRequest(input: unknown): ManagementValidation<ChurchManagementRequest> {
  if (!object(input)) return bad('Invalid request')
  if (input.action === 'save_sermon_source') {
    if (!keys(input, ['action', 'source'])) return bad('Invalid source settings')
    const checked = validateSermonSource(input.source)
    return checked.ok ? { ok: true, value: { action: 'save_sermon_source', source: checked.value } } : checked
  }
  if (input.action === 'login') {
    if (!keys(input, ['action', 'slug', 'email', 'password']) || !isChurchSlug(input.slug) || !isManagementEmail(input.email) || !text(input.password, 128, 1)) return bad('Church code, email and password are required')
    return { ok: true, value: { action: 'login', slug: input.slug, email: input.email.toLowerCase().trim(), password: input.password } }
  }
  if (input.action === 'accept_invite') {
    if (!keys(input, ['action', 'inviteToken', 'email', 'password', 'name', 'slug', 'churchName']) || !isChurchSlug(input.slug) || !isManagementEmail(input.email) || !text(input.password, 128, 12) || !text(input.name, 120, 1) || !text(input.churchName, 160, 1) || typeof input.inviteToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(input.inviteToken)) return bad('A valid invitation, email, name, church name/code and password of at least 12 characters are required')
    return { ok: true, value: { action: 'accept_invite', inviteToken: input.inviteToken, email: input.email.toLowerCase().trim(), password: input.password, name: input.name.trim(), slug: input.slug, churchName: input.churchName.trim() } }
  }
  if (input.action === 'update_church') {
    const fields = ['name', 'logo_url', 'primary_color', 'secondary_color', 'welcome_message', 'leadership_contact_name', 'leadership_contact_email', 'leadership_contact_phone', 'leadership_contact_url']
    if (!keys(input, ['action', 'updates']) || !object(input.updates) || !keys(input.updates, fields) || !Object.keys(input.updates).length) return bad('Invalid church settings')
    const updates: Record<string, string | null> = {}
    for (const [key, value] of Object.entries(input.updates)) {
      if (key === 'name') { if (!text(value, 160, 1)) return bad('Church name is required'); updates[key] = value.trim(); continue }
      if (key.endsWith('_color')) { if (typeof value !== 'string' || !/^#[a-f0-9]{6}$/i.test(value)) return bad('Colors must use six-digit hex values'); updates[key] = value; continue }
      if (value === null || value === '') { updates[key] = null; continue }
      if (key.endsWith('_url') && !https(value)) return bad('Links must be HTTPS URLs without embedded credentials')
      if (key.endsWith('_email') && !isManagementEmail(value)) return bad('Invalid contact email')
      if (key.endsWith('_phone') && (!text(value, 64, 1) || !/^[+()0-9\s.\-xext]+$/i.test(value))) return bad('Invalid contact phone')
      if (key === 'welcome_message' && !text(value, 2000)) return bad('Welcome message is too long')
      if (key === 'leadership_contact_name' && !text(value, 120)) return bad('Contact name is too long')
      if (typeof value !== 'string') return bad('Invalid setting value')
      updates[key] = value.trim()
    }
    return { ok: true, value: { action: 'update_church', updates: updates as Partial<ChurchBranding> } }
  }
  if (input.action === 'publish_sermon') {
    const s = input.sermon
    if (!keys(input, ['action', 'sermon']) || !object(s) || !keys(s, ['title', 'sermon_date', 'scripture', 'summary', 'video_url', 'transcript', 'source_sermon_id'])) return bad('Invalid sermon fields')
    if (!text(s.title, 200, 1) || !text(s.scripture, 300) || !text(s.summary, 10000) || typeof s.sermon_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.sermon_date) || !Number.isFinite(Date.parse(s.sermon_date + 'T00:00:00Z')) || new Date(s.sermon_date + 'T00:00:00Z').toISOString().slice(0, 10) !== s.sermon_date) return bad('Title, valid sermon date, Scripture and summary fields are required')
    if (s.video_url !== undefined && s.video_url !== null && s.video_url !== '' && !https(s.video_url)) return bad('Video link must be an HTTPS URL')
    if (s.transcript !== undefined && s.transcript !== null && !text(s.transcript, 100000)) return bad('Transcript exceeds 100,000 characters')
    if (s.source_sermon_id !== undefined && s.source_sermon_id !== null && !uuid(s.source_sermon_id)) return bad('Invalid original sermon ID')
    return { ok: true, value: { action: 'publish_sermon', sermon: { title: s.title.trim(), sermon_date: s.sermon_date, scripture: s.scripture.trim(), summary: s.summary.trim(), video_url: s.video_url ? (s.video_url as string).trim() : null, ...(s.transcript !== undefined ? { transcript: s.transcript as string | null } : {}), ...(s.source_sermon_id ? { source_sermon_id: (s.source_sermon_id as string).toLowerCase() } : {}) } } }
  }
  return bad('Unsupported action')
}
