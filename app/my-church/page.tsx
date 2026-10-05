"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useChurch } from "@/context/church-context"
import { useLanguage } from "@/context/language-context"
import { safeEmailHref, safeHttpsUrl, safePhoneHref } from "@/lib/church-branding"

export default function MyChurchPage() {
  const router = useRouter()
  const { church, logo, isLoading, lastSermon, thisSermon } = useChurch()
  const { language } = useLanguage()
  const vi = language === "vi"
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [error, setError] = useState("")

  const disconnect = () => {
    try {
      const stored = JSON.parse(localStorage.getItem("userProfile") || "{}")
      const profile = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}
      localStorage.setItem("userProfile", JSON.stringify({ ...profile, churchId: "" }))
      window.dispatchEvent(new Event("lifestages-profile-changed"))
      router.replace("/")
    } catch { setError(vi ? "Không thể cập nhật hồ sơ. Hãy thử lại." : "We could not update your profile. Please try again.") }
  }
  const email = safeEmailHref(church?.leadership_contact_email)
  const phone = safePhoneHref(church?.leadership_contact_phone)
  const contactUrl = safeHttpsUrl(church?.leadership_contact_url)
  const watchUrl = safeHttpsUrl(lastSermon?.url)
  const sermonDate = lastSermon?.date && /^\d{4}-\d{2}-\d{2}$/.test(lastSermon.date) ? lastSermon.date : undefined
  const bibleLink = thisSermon ? `/bible?verse=${encodeURIComponent(thisSermon.scripture)}${thisSermon.id && church ? `&sermonId=${encodeURIComponent(thisSermon.id)}&churchId=${encodeURIComponent(church.id)}` : ""}` : "/bible"

  return <main className="min-h-screen max-w-md mx-auto bg-[#0c1929] text-white pb-24">
    <header className="church-brand-surface p-5">
      <button onClick={() => router.push("/")} className="flex items-center gap-2 text-sm mb-6"><span className="material-symbols-outlined">arrow_back</span>{vi ? "Trang chủ" : "Home"}</button>
      {logo && <img src={logo} alt="" className="h-16 max-w-full object-contain mb-3" />}
      <p className="text-xs uppercase tracking-wide opacity-75">{vi ? "Hội thánh của tôi" : "My church"}</p>
      <h1 className="text-2xl font-bold mt-1">{isLoading ? (vi ? "Đang tải…" : "Loading…") : church?.name || (vi ? "Kết nối hội thánh của bạn" : "Connect your church")}</h1>
      {church?.welcome_message && <p className="text-sm leading-relaxed mt-3 whitespace-pre-line">{church.welcome_message}</p>}
    </header>
    {!isLoading && !church && <div className="p-5 space-y-4">
      <p className="text-sm text-blue-100/75">{vi ? "Dùng mã hoặc liên kết lời mời từ hội thánh để kết nối ứng dụng." : "Use the code or invitation link from your church to connect the app."}</p>
      <button onClick={() => router.push("/connect")} className="church-brand-button rounded-xl py-3 px-4 w-full font-semibold">{vi ? "Tìm hội thánh của tôi" : "Find my church"}</button>
    </div>}
    {church && <div className="p-5 space-y-5">
      <section className="rounded-2xl border border-white/15 bg-white/5 p-5">
        <h2 className="text-lg font-bold mb-2">{vi ? "Liên hệ ban lãnh đạo" : "Contact church leadership"}</h2>
        {church.leadership_contact_name && <p className="text-sm text-blue-100/80 mb-4">{church.leadership_contact_name}</p>}
        <div className="space-y-3">
          {email && <a href={email} className="church-brand-button flex items-center justify-center gap-2 rounded-xl py-3 px-4 font-semibold"><span className="material-symbols-outlined">mail</span>{vi ? "Gửi email" : "Email leadership"}</a>}
          {phone && <a href={phone} className="flex items-center justify-center gap-2 rounded-xl border border-white/20 py-3 px-4 text-sm"><span className="material-symbols-outlined">call</span>{church.leadership_contact_phone}</a>}
          {contactUrl && <a href={contactUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-white/20 py-3 px-4 text-sm"><span className="material-symbols-outlined">open_in_new</span>{vi ? "Trang liên hệ hội thánh" : "Church contact page"}</a>}
          {!email && !phone && !contactUrl && <p className="text-sm text-blue-100/70">{vi ? "Hội thánh chưa công bố thông tin liên hệ trong ứng dụng." : "Your church has not published a leadership contact in the app yet."}</p>}
        </div>
      </section>
      {lastSermon && <section className="rounded-2xl border border-white/15 bg-white/5 p-5 space-y-3">
        <p className="text-xs uppercase tracking-wide text-blue-100/65">{lastSermon.source === 'imported_recording' ? (vi ? 'Video mới từ hội thánh' : 'Latest church recording') : (vi ? "Bài giảng đã công bố" : "Published sermon")}{sermonDate ? ` · ${sermonDate}` : ""}</p>
        <h2 className="text-xl font-bold">{lastSermon.title}</h2>
        {lastSermon.scripture && <p className="text-sm text-blue-100/80">{lastSermon.scripture}</p>}
        {lastSermon.summary && <p className="text-sm text-blue-100/80 leading-relaxed whitespace-pre-line">{lastSermon.summary}</p>}
        {lastSermon.source === 'imported_recording' && <p className="text-sm text-blue-100/60">{vi ? 'Đã nhập từ kênh của hội thánh. Phần hướng dẫn bài giảng chưa sẵn sàng.' : 'Imported from your church’s source. The sermon companion is not ready yet.'}</p>}
        <button onClick={() => router.push("/sermon/last")} className="church-brand-button w-full rounded-xl py-3 px-4 font-semibold">{lastSermon.source === 'imported_recording' ? (vi ? 'Mở video' : 'Open recording') : (vi ? "Khám phá bài giảng" : "Explore this sermon")}</button>
        {watchUrl && <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="block text-center text-sm underline underline-offset-4">{vi ? "Xem bài giảng" : "Watch sermon"}</a>}
        {lastSermon.transcript && <details className="text-sm"><summary className="cursor-pointer font-semibold">{vi ? "Đọc bản văn bài giảng" : "Read sermon transcript"}</summary><p className="mt-3 text-blue-100/80 whitespace-pre-line leading-relaxed">{lastSermon.transcript}</p></details>}
      </section>}
      {thisSermon && <section className="rounded-2xl border border-white/15 bg-white/5 p-5 space-y-3">
        <p className="text-xs uppercase tracking-wide text-blue-100/65">{vi ? "Chuẩn bị cho bài giảng" : "Sermon preparation"}</p>
        <h2 className="text-xl font-bold">{thisSermon.title}</h2>
        {thisSermon.theme && <p className="text-sm text-blue-100/80">{thisSermon.theme}</p>}
        {thisSermon.scripture && <button onClick={() => router.push(bibleLink)} className="church-brand-button w-full rounded-xl py-3 px-4 font-semibold">{vi ? "Đọc" : "Read"} {thisSermon.scripture}</button>}
      </section>}
      {!lastSermon && !thisSermon && <p className="text-sm text-blue-100/65">{vi ? "Hội thánh chưa công bố bài giảng trong ứng dụng." : "Your church has not published a sermon in the app yet."}</p>}
      <div className="border-t border-white/10 pt-5 space-y-3">
        <button onClick={() => router.push("/connect")} className="block w-full rounded-xl border border-white/20 py-3 text-sm">{vi ? "Đổi hội thánh" : "Change church"}</button>
        {!confirmDisconnect ? <button onClick={() => setConfirmDisconnect(true)} className="block w-full py-3 text-sm text-blue-100/60">{vi ? "Ngắt kết nối hội thánh này" : "Disconnect this church"}</button> : <div className="rounded-xl border border-white/20 p-4 space-y-3">
          <p className="text-sm">{vi ? "Gỡ hội thánh khỏi thiết bị này? Hồ sơ cá nhân của bạn vẫn được giữ lại." : "Remove this church from this device? Your personal profile stays saved."}</p>
          <div className="flex gap-3"><button onClick={disconnect} className="rounded-lg bg-white/10 px-4 py-2 text-sm">{vi ? "Ngắt kết nối" : "Disconnect"}</button><button onClick={() => setConfirmDisconnect(false)} className="rounded-lg px-4 py-2 text-sm">{vi ? "Hủy" : "Cancel"}</button></div>
        </div>}
        {error && <p role="alert" className="text-sm text-amber-100">{error}</p>}
      </div>
    </div>}
  </main>
}
