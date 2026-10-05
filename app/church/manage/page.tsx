"use client"

import { Suspense, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ChurchManagementError, memberConnectionUrl, requestChurchManagement, sermonPublishRequest, consumeManagementInvitation,
  type ManagedChurch, type ManagedSermon, type ChurchManagementResult, type SermonAutomation,
} from '@/lib/church-management-client'
import { validHexColor, contrastingText, safeHttpsUrl } from '@/lib/church-branding'
import { ChurchSermonAutomation } from '@/components/church-sermon-automation'

type Appearance = {
  name: string; logo_url: string; primary_color: string; secondary_color: string; welcome_message: string
  leadership_contact_name: string; leadership_contact_email: string; leadership_contact_phone: string; leadership_contact_url: string
}
type SermonDraft = { title: string; sermon_date: string; scripture: string; summary: string; video_url: string; transcript: string; source_sermon_id: string }
const emptySermon: SermonDraft = { title: '', sermon_date: '', scripture: '', summary: '', video_url: '', transcript: '', source_sermon_id: '' }
const input = 'w-full rounded-xl border border-white/15 bg-[#142338] px-3.5 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/70 disabled:opacity-50'
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-50'
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50'

function appearanceOf(church: ManagedChurch): Appearance {
  return {
    name: church.name, logo_url: church.logo_url || '', primary_color: church.primary_color || '#f59e0b',
    secondary_color: church.secondary_color || '#0c1929', welcome_message: church.welcome_message || '',
    leadership_contact_name: church.leadership_contact_name || '', leadership_contact_email: church.leadership_contact_email || '',
    leadership_contact_phone: church.leadership_contact_phone || '', leadership_contact_url: church.leadership_contact_url || '',
  }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-200">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs leading-relaxed text-slate-400">{hint}</span>}</label>
}

function Icon({ children }: { children: string }) {
  return <span className="material-symbols-outlined" aria-hidden="true">{children}</span>
}

function ChurchManageContent() {
  const params = useSearchParams()
  const [inviteToken, setInviteToken] = useState('')
  const [mode, setMode] = useState<'login' | 'invite'>('login')
  const [credentials, setCredentials] = useState({ slug: params.get('church') || '', email: '', password: '', name: '', churchName: '' })
  const [session, setSession] = useState<{ token: string; church: ManagedChurch } | null>(null)
  const [appearance, setAppearance] = useState<Appearance | null>(null)
  const [sermons, setSermons] = useState<ManagedSermon[]>([])
  const [automation, setAutomation] = useState<SermonAutomation | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [sermon, setSermon] = useState<SermonDraft>({ ...emptySermon })
  const [section, setSection] = useState<'appearance' | 'sermons'>('appearance')
  const [pending, setPending] = useState<'login' | 'appearance' | 'sermon' | 'source' | 'refresh' | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
    const invitation = consumeManagementInvitation(window.location.href)
    if (invitation.hadToken) window.history.replaceState(window.history.state, '', invitation.cleanUrl)
    if (invitation.token) {
      setInviteToken(invitation.token)
      setMode('invite')
    }
  }, [])
  useEffect(() => { setLogoFailed(false) }, [appearance?.logo_url])

  const applyResult = (result: ChurchManagementResult, token = session?.token) => {
    if (!token) throw new Error('Your sign-in could not be confirmed. Please sign in again.')
    setSession({ token, church: result.church })
    setAppearance(appearanceOf(result.church))
    setAutomation(result.automation || null)
    if (result.sermons) setSermons(result.sermons)
  }

  const showError = (reason: unknown) => {
    if (reason instanceof ChurchManagementError && reason.status === 401 && session) {
      setSession(null)
      setAppearance(null)
      setSermons([])
      setError('Your session has expired. Sign in again to continue.')
    } else setError(reason instanceof Error ? reason.message : 'Something went wrong. Please try again.')
  }

  const authenticate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setPending('login'); setError(''); setNotice('')
    try {
      const result = await requestChurchManagement(mode === 'invite'
        ? { action: 'accept_invite', inviteToken, slug: credentials.slug.trim().toLowerCase(), name: credentials.name.trim(), churchName: credentials.churchName.trim(), email: credentials.email.trim(), password: credentials.password }
        : { action: 'login', slug: credentials.slug.trim().toLowerCase(), email: credentials.email.trim(), password: credentials.password })
      if (!result.token) throw new Error('Your sign-in could not be confirmed. Please try again.')
      applyResult(result, result.token)
      setInviteToken('')
      setCredentials(current => ({ ...current, password: '' }))
      setNotice(mode === 'invite' ? 'Your church is ready. Add its appearance and leadership contact below.' : '')
    } catch (reason) { showError(reason) } finally { setPending(null) }
  }

  const saveAppearance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session || !appearance || pending) return
    setPending('appearance'); setError(''); setNotice('')
    try {
      const updates = Object.fromEntries(Object.entries(appearance).map(([key, value]) => [key, value.trim()]))
      const result = await requestChurchManagement({ action: 'update_church', updates }, session.token)
      applyResult(result)
      setNotice('Saved. People connected to your church will see the updated appearance and contact details.')
    } catch (reason) { showError(reason) } finally { setPending(null) }
  }

  const publishSermon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session || pending) return
    setPending('sermon'); setError(''); setNotice('')
    try {
      const result = await requestChurchManagement(sermonPublishRequest(sermon), session.token)
      if (!result.sermon?.id) throw new Error('Publication could not be confirmed. Refresh the sermon history before trying again.')
      applyResult(result)
      setSermon({ ...emptySermon })
      setNotice('Sermon published to your church’s app and saved in its history.')
    } catch (reason) { showError(reason) } finally { setPending(null) }
  }

  const refresh = async () => {
    if (!session || pending) return
    setPending('refresh'); setError(''); setNotice('')
    try { applyResult(await requestChurchManagement({ action: 'read' }, session.token)) }
    catch (reason) { showError(reason) } finally { setPending(null) }
  }

  const memberLink = session && origin ? memberConnectionUrl(session.church.slug, origin, process.env.NEXT_PUBLIC_APP_URL) : ''
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(memberLink); setCopied(true); setTimeout(() => setCopied(false), 2500) }
    catch { setError('The link could not be copied automatically. Select and copy the connection link below.') }
  }
  const updateAppearance = (key: keyof Appearance, value: string) => setAppearance(current => current ? { ...current, [key]: value } : current)
  const updateSermon = (key: keyof SermonDraft, value: string) => setSermon(current => ({ ...current, [key]: value }))
  const reviseSermon = (saved: ManagedSermon) => {
    setManualOpen(true)
    setSermon({ title: saved.title, sermon_date: saved.sermon_date?.slice(0, 10) || '', scripture: saved.scripture || '', summary: saved.summary || '', video_url: saved.video_url || '', transcript: saved.transcript || '', source_sermon_id: saved.id })
    setNotice('Editing a new edition. The original sermon will remain in the history.')
    setError('')
    requestAnimationFrame(() => document.getElementById('sermon-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const previewPrimary = validHexColor(appearance?.primary_color)
  const previewBackground = validHexColor(appearance?.secondary_color, '#0c1929')
  const previewLogo = safeHttpsUrl(appearance?.logo_url)

  return <div className="min-h-screen bg-[#0c1929] text-white">
    <header className="border-b border-white/10 bg-[#0c1929]/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <a href="/" className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300"><Icon>church</Icon></span><span><span className="block text-base font-bold">LifeStages</span><span className="block text-xs text-slate-400">Church setup</span></span></a>
        {session && <button className={secondaryButton} disabled={!!pending} onClick={() => { setSession(null); setAppearance(null); setSermons([]); setNotice(''); setError('') }}>Sign out</button>}
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-5 py-8 md:py-12">
      <div aria-live="polite" aria-atomic="true">
        {error && <div role="alert" className="mb-6 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm leading-relaxed text-rose-100">{error}</div>}
        {notice && <div className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm leading-relaxed text-emerald-100">{notice}</div>}
      </div>
      {!session || !appearance ? <div className="mx-auto grid max-w-4xl items-start gap-10 md:grid-cols-2 md:gap-16">
        <div className="pt-3"><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Your church, throughout the week</p><h1 className="text-3xl font-bold leading-tight md:text-4xl">Make LifeStages feel like home.</h1><p className="mt-5 leading-relaxed text-slate-300">Choose your church’s name, colors, and welcome. Give people a clear way to reach your leadership, and bring each Sunday’s sermon into their daily experience.</p>
          <div className="mt-8 space-y-5">{[['palette', 'Your identity', 'A familiar name, logo, and colors.'], ['contact_support', 'A real connection', 'Leadership contact details people can find.'], ['menu_book', 'Your sermons', 'A weekly message, its Scripture, and a growing history.']].map(([icon, title, description]) => <div key={title} className="flex gap-3"><span className="mt-1 text-amber-300"><Icon>{icon}</Icon></span><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-400">{description}</p></div></div>)}</div>
        </div>
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-xl font-bold">{mode === 'invite' ? 'Activate your church' : 'Leader sign in'}</h2><p className="mb-6 mt-2 text-sm leading-relaxed text-slate-400">{mode === 'invite' ? 'Use your invitation to create your church and leader account.' : 'Use your church code and leader account to manage the app.'}</p>
          <form onSubmit={authenticate} className="space-y-4">
            <fieldset disabled={!!pending} className="space-y-4">
              {mode === 'invite' && <Field label="Church name"><input className={input} required maxLength={100} autoComplete="organization" value={credentials.churchName} onChange={e => setCredentials({ ...credentials, churchName: e.target.value })} placeholder="Your church name" /></Field>}
              <Field label="Church code" hint={mode === 'invite' ? 'A short code people can use to connect. Use lowercase letters, numbers, and hyphens.' : undefined}><input className={input} required pattern="[a-z0-9][a-z0-9-]{1,58}[a-z0-9]" maxLength={60} autoCapitalize="none" autoCorrect="off" value={credentials.slug} onChange={e => setCredentials({ ...credentials, slug: e.target.value.toLowerCase() })} placeholder="your-church" /></Field>
              {mode === 'invite' && <Field label="Your name"><input className={input} required maxLength={100} autoComplete="name" value={credentials.name} onChange={e => setCredentials({ ...credentials, name: e.target.value })} /></Field>}
              <Field label="Leader email"><input className={input} required type="email" autoComplete="username" maxLength={254} value={credentials.email} onChange={e => setCredentials({ ...credentials, email: e.target.value })} /></Field>
              <Field label="Password" hint={mode === 'invite' ? 'Use at least 12 characters.' : undefined}><input className={input} required type="password" minLength={mode === 'invite' ? 12 : 1} maxLength={128} autoComplete={mode === 'invite' ? 'new-password' : 'current-password'} value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })} /></Field>
              <button className={`${primaryButton} w-full`} type="submit">{pending === 'login' ? 'Please wait…' : mode === 'invite' ? 'Create church account' : 'Sign in'}</button>
            </fieldset>
          </form>
          {inviteToken && <button className="mt-5 text-sm text-amber-300 underline underline-offset-4" onClick={() => { setMode(mode === 'login' ? 'invite' : 'login'); setError('') }} disabled={!!pending}>{mode === 'invite' ? 'Already have an account? Sign in' : 'Use this invitation to create a church'}</button>}
          {!inviteToken && <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-relaxed text-slate-400">Setting up a new church? After approval, you’ll receive a private invitation link to create its leader account.</p>}
        </section>
      </div> : <>
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Church workspace</p><h1 className="text-3xl font-bold">{session.church.name}</h1><p className="mt-2 text-sm text-slate-400">The details and messages people will see in your church’s app.</p></div><button className={secondaryButton} onClick={refresh} disabled={!!pending}><Icon>refresh</Icon>{pending === 'refresh' ? 'Refreshing…' : 'Refresh saved details'}</button></div>
        <section className="mb-8 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5">
          <div className="min-w-0"><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-300">Invite people to connect</p><p className="text-lg font-bold">Church code: <span className="font-mono">{session.church.slug}</span></p><a className="mt-1 block break-all text-sm text-slate-300 underline underline-offset-4" href={memberLink || undefined}>{memberLink}</a><p className="mt-2 text-xs text-slate-400">Share this with your church so each person can choose to connect.</p></div>
          <button className={secondaryButton} onClick={copyLink} disabled={!memberLink}><Icon>{copied ? 'check' : 'content_copy'}</Icon>{copied ? 'Copied' : 'Copy connection link'}</button>
        </section>
        <nav aria-label="Church setup sections" className="mb-7 flex gap-2 border-b border-white/10 pb-4">{([['appearance', 'Appearance & contact', 'palette'], ['sermons', 'Sermons', 'menu_book']] as const).map(([key, label, icon]) => <button key={key} onClick={() => { setSection(key); setError(''); setNotice('') }} disabled={!!pending} aria-current={section === key ? 'page' : undefined} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${section === key ? 'bg-white/10 text-amber-300' : 'text-slate-400 hover:bg-white/5'}`}><Icon>{icon}</Icon>{label}</button>)}</nav>
        {section === 'appearance' ? <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form onSubmit={saveAppearance} className="space-y-6"><fieldset disabled={!!pending} className="space-y-6">
            <section className="rounded-2xl border border-white/10 p-5 md:p-6"><h2 className="mb-5 text-lg font-bold">Your church’s appearance</h2><div className="space-y-5">
              <Field label="Name in the app"><input className={input} required maxLength={100} value={appearance.name} onChange={e => updateAppearance('name', e.target.value)} /></Field>
              <Field label="Logo image link" hint="Use a publicly accessible HTTPS image link."><input className={input} type="url" pattern="https://.*" maxLength={2048} placeholder="https://…" value={appearance.logo_url} onChange={e => updateAppearance('logo_url', e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-4">{([['primary_color', 'Accent color'], ['secondary_color', 'Background color']] as const).map(([key, label]) => <Field key={key} label={label}><div className="flex items-center gap-2"><input aria-label={`${label} picker`} type="color" className="size-12 shrink-0 cursor-pointer rounded-lg border border-white/20 bg-transparent" value={/^#[0-9a-f]{6}$/i.test(appearance[key]) ? appearance[key] : '#0c1929'} onChange={e => updateAppearance(key, e.target.value)} /><input aria-label={`${label} hex code`} className={input} pattern="#[0-9a-fA-F]{6}" maxLength={7} required value={appearance[key]} onChange={e => updateAppearance(key, e.target.value)} /></div></Field>)}</div>
              <Field label="Welcome message" hint="A short greeting people will see when they open your church’s page."><textarea className={input} rows={3} maxLength={2000} value={appearance.welcome_message} onChange={e => updateAppearance('welcome_message', e.target.value)} placeholder="Welcome. We’re glad to walk with you through the week." /></Field>
            </div></section>
            <section className="rounded-2xl border border-white/10 p-5 md:p-6"><h2 className="text-lg font-bold">Reach your leadership</h2><p className="mb-5 mt-1 text-sm leading-relaxed text-slate-400">These contact details are visible to people who connect to your church.</p><div className="space-y-5">
              <Field label="Contact name or team"><input className={input} maxLength={100} placeholder="Pastoral care team" value={appearance.leadership_contact_name} onChange={e => updateAppearance('leadership_contact_name', e.target.value)} /></Field>
              <div className="grid gap-5 md:grid-cols-2"><Field label="Contact email"><input className={input} type="email" maxLength={254} value={appearance.leadership_contact_email} onChange={e => updateAppearance('leadership_contact_email', e.target.value)} /></Field><Field label="Contact phone"><input className={input} type="tel" maxLength={40} value={appearance.leadership_contact_phone} onChange={e => updateAppearance('leadership_contact_phone', e.target.value)} /></Field></div>
              <Field label="Contact page or request form" hint="Optional HTTPS link to a care request or contact page."><input className={input} type="url" pattern="https://.*" maxLength={2048} placeholder="https://…" value={appearance.leadership_contact_url} onChange={e => updateAppearance('leadership_contact_url', e.target.value)} /></Field>
            </div></section>
            <div className="flex flex-wrap items-center gap-3"><button className={primaryButton} type="submit">{pending === 'appearance' ? 'Saving…' : 'Save appearance & contact'}</button><button className={secondaryButton} type="button" onClick={() => setAppearance(appearanceOf(session.church))}>Reset to saved</button></div>
          </fieldset></form>
          <aside className="lg:sticky lg:top-6"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">App preview</h2><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">Unsaved changes shown</span></div>
            <div className="overflow-hidden rounded-[2rem] border-4 border-white/15 shadow-2xl" style={{ backgroundColor: previewBackground, color: contrastingText(previewBackground) }}><div className="p-6"><div className="mx-auto mb-7 h-1.5 w-16 rounded-full bg-white/20" /><div className="flex items-center gap-3">{previewLogo && !logoFailed ? <img alt="Church logo preview" src={previewLogo} className="size-12 rounded-xl bg-white/10 object-contain" onError={() => setLogoFailed(true)} /> : <span className="flex size-12 items-center justify-center rounded-xl bg-white/10" style={{ color: previewPrimary }}><Icon>church</Icon></span>}<h3 className="text-lg font-bold">{appearance.name || 'Your church'}</h3></div><p className="mb-7 mt-5 text-sm leading-relaxed opacity-80">{appearance.welcome_message || 'Your welcome message will appear here.'}</p><div className="rounded-2xl bg-white/10 p-4"><p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: previewPrimary }}>Throughout the week</p><p className="font-semibold">Scripture for your life</p><p className="mt-2 text-xs leading-relaxed opacity-75">Explore the Bible, reflect on your church’s message, and find support for your life stage.</p></div><div className="mt-4 rounded-2xl bg-white/10 p-4"><p className="font-semibold">{appearance.leadership_contact_name || 'Church leadership'}</p><p className="mt-2 break-all text-xs opacity-80">{appearance.leadership_contact_email || appearance.leadership_contact_phone || 'Your contact details will appear here.'}</p><div className="mt-4 rounded-lg px-3 py-2 text-center text-xs font-bold text-slate-950" style={{ backgroundColor: previewPrimary, color: contrastingText(previewPrimary) }}>Contact your church</div></div></div></div>
            {logoFailed && <p className="mt-3 text-xs text-amber-200">The logo could not be loaded. Check its image link before saving.</p>}
          </aside>
        </div> : <>
          <ChurchSermonAutomation token={session.token} automation={automation} disabled={!!pending} onSavingChange={saving => setPending(saving ? 'source' : null)} onSaved={result => { applyResult(result); setError(''); setNotice('') }} onError={showError} />
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <details open={manualOpen} onToggle={event => setManualOpen(event.currentTarget.open)} className="rounded-2xl border border-white/10"><summary className="cursor-pointer px-5 py-5 text-sm font-semibold text-slate-200">Optional: add or correct a sermon manually</summary>
          <form id="sermon-editor" onSubmit={publishSermon} className="rounded-2xl border border-white/10 p-5 md:p-6"><h2 className="text-xl font-bold">{sermon.source_sermon_id ? "Publish a revised edition" : "Publish a sermon"}</h2><p className="mb-6 mt-2 text-sm leading-relaxed text-slate-400">Add the message people will find in the church’s app. Earlier sermons remain in the church’s history.</p><fieldset disabled={!!pending} className="space-y-5">
            <Field label="Sermon title"><input className={input} required maxLength={200} value={sermon.title} onChange={e => updateSermon('title', e.target.value)} /></Field>
            <div className="grid gap-5 md:grid-cols-[180px_1fr]"><Field label="Date preached"><input className={input} type="date" required value={sermon.sermon_date} onChange={e => updateSermon('sermon_date', e.target.value)} /></Field><Field label="Scripture"><input className={input} maxLength={300} placeholder="John 15:1–8" value={sermon.scripture} onChange={e => updateSermon('scripture', e.target.value)} /></Field></div>
            <Field label="Summary" hint="The summary appears in the app and gives its sermon reflections their context."><textarea className={input} required rows={6} maxLength={10000} value={sermon.summary} onChange={e => updateSermon('summary', e.target.value)} /></Field>
            <Field label="Video link" hint="Optional HTTPS link to the sermon. YouTube links can be played inside the app."><input className={input} type="url" pattern="https://.*" maxLength={2048} placeholder="https://www.youtube.com/watch?v=…" value={sermon.video_url} onChange={e => updateSermon('video_url', e.target.value)} /></Field>
            <details className="rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-200">Add a transcript <span className="font-normal text-slate-400">(optional)</span></summary><div className="mt-4"><Field label="Sermon transcript" hint="Paste a transcript you already have. Publishing saves it with the sermon."><textarea className={input} rows={8} maxLength={100000} value={sermon.transcript} onChange={e => updateSermon('transcript', e.target.value)} /></Field></div></details>
            <div className="flex flex-wrap gap-3"><button type="submit" className={primaryButton}><Icon>publish</Icon>{pending === 'sermon' ? 'Publishing…' : 'Publish to church app'}</button>{sermon.source_sermon_id && <button type="button" className={secondaryButton} onClick={() => { setSermon({ ...emptySermon }); setNotice('') }}>Cancel revision</button>}</div>
          </fieldset></form></details>
          <aside className="rounded-2xl border border-white/10 p-5"><h2 className="text-lg font-bold">Sermon history</h2><p className="mb-5 mt-1 text-sm text-slate-400">Recent published messages for this church.</p>{sermons.length === 0 ? <div className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-sm leading-relaxed text-slate-400">No sermons have been published yet. Published messages will appear here.</div> : <ol className="space-y-3">{sermons.map(item => <li key={item.id} className="rounded-xl bg-white/5 p-4"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="text-xs text-slate-400">{item.sermon_date ? item.sermon_date.slice(0, 10) : 'Date not supplied'}</span>{item.id === session.church.last_sermon_id && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">In the app</span>}</div><h3 className="font-semibold leading-snug">{item.title}</h3>{item.scripture && <p className="mt-1 text-xs text-amber-200">{item.scripture}</p>}{item.summary && <details className="mt-3 text-xs text-slate-300"><summary className="cursor-pointer">Read summary</summary><p className="mt-2 whitespace-pre-wrap leading-relaxed">{item.summary}</p></details>}<button type="button" className="mt-3 text-xs font-semibold text-amber-200 underline underline-offset-4 disabled:opacity-50" disabled={!!pending} onClick={() => reviseSermon(item)}>Revise as a new edition</button></li>)}</ol>}</aside>
        </div></>}
      </>}
    </main>
  </div>
}

export default function ChurchManagePage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0c1929] p-8 text-slate-300">Loading church setup…</div>}><ChurchManageContent /></Suspense>
}
