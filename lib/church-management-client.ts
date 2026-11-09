import { apiFetch } from './api-base'

export interface ManagedChurch {
  id: string
  slug: string
  name: string
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  welcome_message?: string | null
  leadership_contact_name?: string | null
  leadership_contact_email?: string | null
  leadership_contact_phone?: string | null
  leadership_contact_url?: string | null
  last_sermon_id?: string | null
}

export interface ManagedSermon {
  id: string
  title: string
  sermon_date?: string | null
  scripture?: string | null
  summary?: string | null
  video_url?: string | null
  transcript?: string | null
}

export interface ChurchManagementResult {
  token?: string
  church: ManagedChurch
  sermons?: ManagedSermon[]
  sermon?: ManagedSermon
  automation?: SermonAutomation
}

export interface SermonAutomation {
  source: null | {
    id: string; kind: 'youtube_channel' | 'youtube_playlist'; source_url: string; enabled: boolean
    last_checked_at: string | null; next_check_at: string | null
    backfill_complete: boolean; backfill_count: number
    sync_status: 'idle' | 'pending' | 'syncing' | 'waiting_configuration' | 'error'
    last_error_code: string | null
  }
  counts: { discovered: number; transcript_pending: number; analysis_pending: number }
  capabilities: { discovery_enabled: boolean; youtube_configured: boolean; processor_configured: boolean }
}

export class ChurchManagementError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export function sermonPublishRequest(draft: Record<string, string>): Record<string, unknown> {
  const sermon = Object.fromEntries(Object.entries(draft)
    .filter(([key, value]) => key !== 'source_sermon_id' || !!value.trim())
    .map(([key, value]) => [key, value.trim()]))
  return { action: 'publish_sermon', sermon }
}

/** A leader token stays in component memory and is sent only to the management endpoint. */
export async function requestChurchManagement(body: Record<string, unknown>, token?: string): Promise<ChurchManagementResult> {
  const reading = body.action === 'read'
  const response = await apiFetch('/api/church/manage', {
    method: reading ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: 'no-store',
    body: reading ? undefined : JSON.stringify(body),
  })
  let data: any
  try { data = await response.json() } catch { throw new ChurchManagementError('The church service did not return a usable response. Please try again.', response.status) }
  if (!response.ok) throw new ChurchManagementError(typeof data?.error === 'string' ? data.error : 'Unable to complete this change. Please try again.', response.status)
  if (!data?.church?.id || !data?.church?.slug || !data?.church?.name) throw new ChurchManagementError('The saved church could not be confirmed. Reload before making another change.', response.status)
  return data as ChurchManagementResult
}

export function memberConnectionUrl(slug: string, origin: string, configuredOrigin?: string): string {
  try {
    const url = new URL('/connect', configuredOrigin || origin)
    if (!['https:', 'http:'].includes(url.protocol)) return ''
    url.searchParams.set('church', slug)
    return url.toString()
  } catch { return '' }
}

/** Consume an invitation once, returning a URL with the secret removed from both supported locations. */
export function consumeManagementInvitation(href: string): { token: string; cleanUrl: string; hadToken: boolean } {
  const url = new URL(href)
  const fragment = new URLSearchParams(url.hash.slice(1))
  const hadFragmentToken = fragment.has('invite')
  const hadToken = hadFragmentToken || url.searchParams.has('invite')
  const token = fragment.get('invite') || url.searchParams.get('invite') || ''
  url.searchParams.delete('invite')
  if (hadFragmentToken) {
    fragment.delete('invite')
    url.hash = fragment.toString()
  }
  return { token, cleanUrl: url.pathname + url.search + url.hash, hadToken }
}
