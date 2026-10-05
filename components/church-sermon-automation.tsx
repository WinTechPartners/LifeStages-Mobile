"use client"

import { useEffect, useState, type FormEvent } from 'react'
import { requestChurchManagement, type ChurchManagementResult, type SermonAutomation } from '@/lib/church-management-client'

const fieldClass = 'w-full rounded-xl border border-white/15 bg-[#142338] px-3.5 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/70 disabled:opacity-50'

function timeLabel(value: string | null | undefined, fallback: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return fallback
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function automationStatus(automation: SermonAutomation | null): string {
  if (!automation) return 'Status unavailable'
  const source = automation.source
  if (!source) return 'Connect your source'
  if (!source.enabled) return 'Automatic checks paused'
  if (source.sync_status === 'error') return 'Source needs attention'
  if (!automation.capabilities.discovery_enabled || !automation.capabilities.youtube_configured || source.sync_status === 'waiting_configuration') return 'Saved · setup pending'
  if (source.sync_status === 'syncing') return 'Finding sermons'
  if (source.sync_status === 'pending') return 'Queued for a check'
  return 'Automatic checks enabled'
}

export function ChurchSermonAutomation({ token, automation, disabled, onSavingChange, onSaved, onError }: {
  token: string; automation: SermonAutomation | null; disabled: boolean
  onSavingChange: (saving: boolean) => void
  onSaved: (result: ChurchManagementResult) => void
  onError: (error: unknown) => void
}) {
  const [kind, setKind] = useState<'youtube_channel' | 'youtube_playlist'>('youtube_playlist')
  const [sourceUrl, setSourceUrl] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (automation?.source) {
      setKind(automation.source.kind)
      setSourceUrl(automation.source.source_url)
      setEnabled(automation.source.enabled)
    }
  }, [automation?.source?.id, automation?.source?.kind, automation?.source?.source_url, automation?.source?.enabled])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled || saving || !automation) return
    setSaving(true); onSavingChange(true); setMessage('')
    try {
      const result = await requestChurchManagement({ action: 'save_sermon_source', source: { kind, source_url: sourceUrl.trim(), enabled } }, token)
      if (!result.automation?.source?.id) throw new Error('The source could not be confirmed as saved. Refresh before trying again.')
      onSaved(result)
      setMessage(enabled ? 'Connected source saved. Its next check is queued; the status below shows what is ready.' : 'Source saved. Automatic checks are paused.')
    } catch (error) { onError(error) } finally { setSaving(false); onSavingChange(false) }
  }

  const source = automation?.source
  const ready = !!automation?.capabilities.discovery_enabled && !!automation?.capabilities.youtube_configured
  const counts = automation?.counts

  return <section className="mb-8 overflow-hidden rounded-2xl border border-amber-400/25 bg-amber-400/[0.04]">
    <div className="border-b border-white/10 px-5 py-6 md:px-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Set it up once</p><h2 className="text-xl font-bold">Connect where your sermons already live.</h2></div><span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">{automationStatus(automation)}</span></div><p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">Connect a YouTube sermon playlist or channel. Scheduled discovery can build the initial history from up to 100 messages and find future messages from the same source.</p></div>
    <div className="grid gap-7 p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(250px,.8fr)]">
      <form onSubmit={save}><fieldset disabled={disabled || !automation} className="space-y-4">
        <label className="block"><span className="mb-2 block text-sm font-semibold">Source type</span><select className={fieldClass} value={kind} onChange={event => setKind(event.target.value as typeof kind)}><option value="youtube_playlist">YouTube sermon playlist</option><option value="youtube_channel">YouTube channel</option></select></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">{kind === 'youtube_playlist' ? 'Playlist link' : 'Channel link'}</span><input className={fieldClass} type="url" pattern="https://.*" required maxLength={2048} placeholder={kind === 'youtube_playlist' ? 'https://www.youtube.com/playlist?list=…' : 'https://www.youtube.com/@yourchurch'} value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} /><span className="mt-2 block text-xs leading-relaxed text-slate-400">A dedicated sermon playlist keeps announcements and other church videos out of the sermon history. The source must be publicly accessible.</span></label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white/5 p-4"><input className="mt-1 size-4 accent-amber-400" type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} /><span><span className="block text-sm font-semibold">Keep checking for new sermons</span><span className="mt-1 block text-xs leading-relaxed text-slate-400">When automatic discovery is enabled for this app, the source is checked hourly.</span></span></label>
        <button className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-50" type="submit">{saving ? 'Saving source…' : source ? 'Save source settings' : 'Save sermon source'}</button>
      </fieldset><div aria-live="polite">{message && <p className="mt-4 text-sm leading-relaxed text-emerald-200">{message}</p>}</div></form>
      <div className="rounded-xl border border-white/10 bg-[#0c1929]/60 p-5"><h3 className="font-bold">What happens next</h3><ol className="mt-4 space-y-4 text-sm">
        <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs">1</span><div><p className="font-semibold">Find your messages</p><p className="mt-1 text-xs leading-relaxed text-slate-400">{!source ? 'Save the playlist or channel once to queue the first check.' : !source.enabled ? 'Checks are paused. Your saved source remains available.' : !ready ? 'The source is saved. Automatic discovery is waiting for service setup.' : source.backfill_complete ? 'The initial source check is complete. Scheduled checks look for new messages.' : 'The initial discovery pass is queued or in progress.'}</p></div></li>
        <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs">2</span><div><p className="font-semibold">Prepare transcripts</p><p className="mt-1 text-xs leading-relaxed text-slate-400">{!automation ? 'Refresh to see transcript processing status.' : automation.capabilities.processor_configured ? 'Available transcripts can move into processing.' : 'Automatic transcript processing is awaiting setup.'}</p></div></li>
        <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs">3</span><div><p className="font-semibold">Analyze and prepare for the app</p><p className="mt-1 text-xs leading-relaxed text-slate-400">{!automation ? 'Refresh to see analysis and publication status.' : automation.capabilities.processor_configured ? 'Prepared content follows the configured publication workflow.' : 'Sermon analysis and automatic publication are pending. Finding a video alone does not publish a sermon.'}</p></div></li>
      </ol>{source?.sync_status === 'error' && <p role="alert" className="mt-4 rounded-lg bg-rose-400/10 p-3 text-xs leading-relaxed text-rose-200">The last source check failed. Check that the channel or playlist is public, then save the source again.</p>}{!automation && <p className="mt-4 text-xs leading-relaxed text-amber-200">Source status is unavailable. Refresh the saved details to try again.</p>}</div>
    </div>
    {source && automation && counts && <div className="border-t border-white/10 px-5 py-5 md:px-6"><div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400"><span>Last check: {timeLabel(source.last_checked_at, 'Not checked yet')}</span><span>Next check: {source.enabled && ready ? timeLabel(source.next_check_at, 'Waiting to be scheduled') : source.enabled ? 'Waiting for setup' : 'Paused'}</span></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Imported for this church</p><p className="mt-2 text-xl font-bold">{counts.discovered.toLocaleString()} <span className="text-sm font-normal text-slate-300">videos</span></p></div><div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Waiting for transcripts</p><p className="mt-2 text-xl font-bold">{counts.transcript_pending.toLocaleString()} <span className="text-sm font-normal text-slate-300">of {counts.discovered.toLocaleString()} discovered</span></p></div><div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Waiting for analysis</p><p className="mt-2 text-xl font-bold">{counts.analysis_pending.toLocaleString()} <span className="text-sm font-normal text-slate-300">of {counts.discovered.toLocaleString()} discovered</span></p></div></div></div>}
  </section>
}
