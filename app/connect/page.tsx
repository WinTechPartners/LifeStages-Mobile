"use client"

import { Suspense, useEffect, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { apiUrl } from "@/lib/api-base"
import { isChurchConfig, type ChurchConfig, useChurch } from "@/context/church-context"
import { useLanguage } from "@/context/language-context"
import { contrastingText, safeLogoUrl, validChurchCode, validHexColor, DEFAULT_CHURCH_SECONDARY } from "@/lib/church-branding"

function ConnectChurch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { church: connectedChurch } = useChurch()
  const { language } = useLanguage()
  const vi = language === "vi"
  const [code, setCode] = useState("")
  const [lookup, setLookup] = useState({ code: "", attempt: 0 })
  const [preview, setPreview] = useState<ChurchConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const requestedChurch = searchParams.get("church") || ""

  useEffect(() => {
    const next = requestedChurch.trim().toLowerCase()
    setCode(next)
    setLookup(previous => ({ code: next, attempt: previous.attempt + 1 }))
  }, [requestedChurch])

  useEffect(() => {
    setPreview(null)
    setError("")
    setLoading(false)
    if (!lookup.code) return
    if (!validChurchCode(lookup.code)) {
      setError(vi ? "Hãy kiểm tra mã hội thánh trong lời mời của bạn." : "Check the church code in your invitation.")
      return
    }
    const controller = new AbortController()
    let disposed = false
    setLoading(true)
    const timeout = window.setTimeout(() => controller.abort(), 15_000)
    void (async () => {
      try {
        const response = await fetch(apiUrl(`/api/church?slug=${encodeURIComponent(lookup.code)}&action=info`), { signal: controller.signal, cache: "no-store" })
        if (!response.ok) throw new Error("unavailable")
        const data = await response.json()
        if (!isChurchConfig(data, lookup.code)) throw new Error("invalid")
        if (!disposed) setPreview(data)
      } catch {
        if (!disposed) setError(vi ? "Chưa tìm được hội thánh này. Kiểm tra mã và kết nối, rồi thử lại." : "We could not load this church. Check the code and your connection, then try again.")
      } finally {
        window.clearTimeout(timeout)
        if (!disposed) setLoading(false)
      }
    })()
    return () => { disposed = true; controller.abort(); window.clearTimeout(timeout) }
  }, [lookup, vi])

  const search = (event: FormEvent) => {
    event.preventDefault()
    setLookup(previous => ({ code: code.trim().toLowerCase(), attempt: previous.attempt + 1 }))
  }
  const connect = () => {
    if (!preview || loading || code.trim().toLowerCase() !== preview.slug.toLowerCase()) return
    try {
      let profile: Record<string, unknown> = {}
      try {
        const saved = JSON.parse(localStorage.getItem("userProfile") || "{}")
        if (saved && typeof saved === "object" && !Array.isArray(saved)) profile = saved
      } catch { /* Preserve any readable profile; the church code alone is sufficient. */ }
      localStorage.setItem("userProfile", JSON.stringify({ ...profile, churchId: preview.slug.toUpperCase() }))
      window.dispatchEvent(new Event("lifestages-profile-changed"))
      router.replace("/my-church")
    } catch {
      setError(vi ? "Không thể lưu kết nối trên thiết bị này. Hãy cho phép lưu dữ liệu rồi thử lại." : "This device could not save the connection. Allow app storage and try again.")
    }
  }
  const primary = validHexColor(preview?.primary_color)
  const secondary = validHexColor(preview?.secondary_color, DEFAULT_CHURCH_SECONDARY)
  const logo = safeLogoUrl(preview?.logo_url)

  return <main className="min-h-screen max-w-md mx-auto px-5 py-6 pb-24 bg-[#0c1929] text-white">
    <button onClick={() => router.push("/")} className="flex items-center gap-2 mb-8 text-sm text-blue-100/80"><span className="material-symbols-outlined">arrow_back</span>{vi ? "Trang chủ" : "Home"}</button>
    <h1 className="text-2xl font-bold mb-2">{vi ? "Kết nối hội thánh của bạn" : "Connect your church"}</h1>
    <p className="text-sm text-blue-100/75 mb-6">{vi ? "Nhập mã từ hội thánh để xem trước giao diện, bài giảng và thông tin liên hệ." : "Enter your church's code to preview its app, sermons, and contact information."}</p>
    <form onSubmit={search} className="space-y-3 mb-6">
      <label className="block text-sm font-semibold" htmlFor="church-code">{vi ? "Mã hội thánh" : "Church code"}</label>
      <input id="church-code" value={code} autoCapitalize="none" autoCorrect="off" maxLength={80} onChange={event => { setCode(event.target.value); setPreview(null); setError("") }} placeholder="your-church" required className="w-full rounded-xl p-3 bg-white/5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary" />
      <button disabled={loading || !code.trim()} className="church-brand-button w-full rounded-xl py-3 px-4 font-semibold disabled:opacity-50">{loading ? (vi ? "Đang tải…" : "Loading…") : (vi ? "Xem trước hội thánh" : "Preview church")}</button>
    </form>
    {error && <p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">{error}</p>}
    {preview && code.trim().toLowerCase() === preview.slug.toLowerCase() && <section className="rounded-2xl overflow-hidden border border-white/15" aria-label={vi ? "Xem trước hội thánh" : "Church preview"}>
      <div className="p-6" style={{ backgroundColor: secondary, color: contrastingText(secondary) }}>
        {logo ? <img src={logo} alt="" className="h-16 max-w-full object-contain mb-4" /> : <span className="material-symbols-outlined text-4xl mb-3">church</span>}
        <p className="text-xs uppercase tracking-wide opacity-75 mb-1">{vi ? "Hội thánh của bạn trong LifeStages" : "Your church in LifeStages"}</p>
        <h2 className="text-2xl font-bold">{preview.name}</h2>
        {preview.welcome_message && <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{preview.welcome_message}</p>}
      </div>
      <div className="p-5 bg-white/5 space-y-4">
        {connectedChurch && connectedChurch.id !== preview.id && <p className="text-sm text-blue-100/80">{vi ? `Kết nối này sẽ thay thế ${connectedChurch.name} trên thiết bị này.` : `This will replace ${connectedChurch.name} on this device.`}</p>}
        <p className="text-sm text-blue-100/80">{vi ? "Kết nối để nhận giao diện và nội dung của hội thánh. Quyền kết nối bạn với lãnh đạo để được chăm sóc là lựa chọn riêng trong Hồ sơ." : "Connect to use this church's name, colors, and content. Permission to connect you with leadership for care is a separate choice in Profile."}</p>
        <button onClick={connect} className="w-full rounded-xl py-3 px-4 font-semibold" style={{ backgroundColor: primary, color: contrastingText(primary) }}>{vi ? `Kết nối với ${preview.name}` : `Connect to ${preview.name}`}</button>
      </div>
    </section>}
  </main>
}

export default function ConnectPage() {
  return <Suspense fallback={<p className="p-6 text-white">Loading church…</p>}><ConnectChurch /></Suspense>
}
