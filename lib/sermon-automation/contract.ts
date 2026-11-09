export interface SermonSourceInput { kind: 'youtube_channel' | 'youtube_playlist'; source_url: string; enabled: boolean }
export interface SermonSource extends SermonSourceInput {
  id: string; church_id: string; source_key: string; resolved_playlist_id: string | null
  last_checked_at: string | null; next_check_at: string | null; backfill_complete: boolean; backfill_count: number
  sync_status: 'idle' | 'pending' | 'syncing' | 'waiting_configuration' | 'error'; last_error_code: string | null
  lease_id?: string | null
}
export interface SermonAutomationState {
  source: SermonSource | null
  counts: { discovered: number; transcript_pending: number; analysis_pending: number }
  capabilities: { discovery_enabled: boolean; youtube_configured: boolean; processor_configured: false }
}
export interface ImportedSermon {
  id: string; church_id: string; source_id: string | null; external_id: string
  title: string; published_at: string; video_url: string; source_description: string
  transcript_status: 'pending'; analysis_status: 'pending'; discovered_at: string
}
export function validateSermonSource(input: unknown): { ok: true; value: SermonSourceInput; sourceKey: string } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Invalid sermon source' }
  const value = input as Record<string, unknown>
  if (Object.keys(value).some(key => !['kind', 'source_url', 'enabled'].includes(key)) || !['youtube_channel', 'youtube_playlist'].includes(value.kind as string) || typeof value.source_url !== 'string' || value.source_url.length > 2048 || typeof value.enabled !== 'boolean') return { ok: false, error: 'Choose a YouTube channel or playlist and a valid HTTPS link' }
  try {
    const url = new URL(value.source_url)
    if (url.protocol !== 'https:' || !['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname) || url.port || url.username || url.password) throw new Error()
    let sourceKey: string, sourceUrl: string
    if (value.kind === 'youtube_playlist') {
      const id = url.searchParams.get('list') || ''
      if (!/^[A-Za-z0-9_-]{10,100}$/.test(id)) throw new Error()
      sourceKey = id; sourceUrl = `https://www.youtube.com/playlist?list=${id}`
    } else {
      const channel = url.pathname.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})\/?$/)
      const handle = url.pathname.match(/^\/(@[A-Za-z0-9_.-]{3,30})(?:\/(?:videos|streams|featured))?\/?$/)
      if (!channel && !handle) throw new Error()
      sourceKey = channel?.[1] || handle![1]
      sourceUrl = `https://www.youtube.com/${channel ? `channel/${sourceKey}` : sourceKey}`
    }
    return { ok: true, value: { kind: value.kind as SermonSourceInput['kind'], source_url: sourceUrl, enabled: value.enabled }, sourceKey }
  } catch { return { ok: false, error: 'Use a YouTube /channel/UC… link, /@handle, or a playlist link containing list=' } }
}
