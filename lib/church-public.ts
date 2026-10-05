import type { Church } from './church'
import type { PublishedSermon } from './church-management/contract'
import type { ImportedSermon } from './sermon-automation/contract'

/** Explicit member-visible allowlist. Never return admin records or uploaded transcripts. */
export function publicChurchConfig(church: Church, publishedCandidate?: PublishedSermon, legacySermonId?: string, imported?: ImportedSermon | null) {
  const published = publishedCandidate && (!church.last_sermon_date || publishedCandidate.sermon_date >= church.last_sermon_date.slice(0, 10)) ? publishedCandidate : undefined
  const configuredDate = published?.sermon_date || church.last_sermon_date || ''
  const useImported = !!imported && (!configuredDate || imported.published_at.slice(0, 10) > configuredDate.slice(0, 10))
  return {
    id: church.id, slug: church.slug, name: church.name,
    logo_url: church.logo_url, primary_color: church.primary_color, secondary_color: church.secondary_color,
    denomination: church.denomination,
    welcome_message: church.welcome_message || null,
    leadership_contact_name: church.leadership_contact_name || null,
    leadership_contact_email: church.leadership_contact_email || null,
    leadership_contact_phone: church.leadership_contact_phone || null,
    leadership_contact_url: church.leadership_contact_url || null,
    sermon_review_enabled: church.sermon_review_enabled || !!published || useImported,
    sermon_prep_enabled: church.sermon_prep_enabled,
    last_sermon_id: useImported ? imported.id : published?.id || legacySermonId,
    last_sermon_title: useImported ? imported.title : published?.title ?? church.last_sermon_title,
    last_sermon_date: useImported ? imported.published_at.slice(0, 10) : published?.sermon_date ?? church.last_sermon_date,
    last_sermon_scripture: useImported ? null : published?.scripture ?? null,
    last_sermon_youtube_url: useImported ? imported.video_url : published?.video_url ?? (published ? null : church.last_sermon_youtube_url),
    last_sermon_summary: useImported ? null : published?.summary ?? church.last_sermon_summary,
    last_sermon_source: useImported ? 'imported_recording' : published ? 'manual_edition' : 'configured',
    last_sermon_source_description: useImported ? imported.source_description : null,
    last_sermon_analysis_status: useImported ? imported.analysis_status : published ? published.analysis_status : null,
    current_sermon_title: church.current_sermon_title,
    current_sermon_scripture: church.current_sermon_scripture,
    current_sermon_theme: church.current_sermon_theme,
  }
}
