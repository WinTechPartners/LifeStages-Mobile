"use client"

import { useEffect, useState } from "react"
import { useChurch } from "@/context/church-context"
import { useLanguage } from "@/context/language-context"
import { analyticsStatus, subscribeAnalytics, setAnalyticsConsent, eraseAnalytics } from "@/lib/analytics/client"

export function ChurchAnalyticsPreferences() {
  const { church } = useChurch()
  const { language } = useLanguage()
  const [status, setStatus] = useState({ available: false, churchId: null as string | null, enabled: false, hasData: false })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const vi = language === "vi"
  useEffect(() => {
    const refresh = () => setStatus(analyticsStatus())
    refresh(); return subscribeAnalytics(refresh)
  }, [])
  const erase = async () => {
    setBusy(true); setMessage("")
    try { await eraseAnalytics(); setMessage(vi ? "Đã xóa hoạt động đã chia sẻ từ thiết bị này." : "Shared activity from this app installation has been erased.") }
    catch { setMessage(vi ? "Chia sẻ đã tắt. Chưa thể xóa dữ liệu; hãy thử lại khi có kết nối." : "Sharing is off. Erasing could not finish; please retry when connected.") }
    finally { setBusy(false) }
  }
  return <section className="rounded-xl border border-white/15 bg-white/5 p-4 space-y-3" aria-labelledby="church-analytics-heading">
    <h2 id="church-analytics-heading" className="font-semibold text-white">{vi ? "Chia sẻ thông tin tổng hợp với hội thánh" : "Help your church understand app use"}</h2>
    <p className="text-sm text-blue-100/80">{vi
      ? "Tùy chọn này chia sẻ chủ đề LifeLine bạn chọn, tương tác Kinh Thánh, việc yêu cầu AI giải thích và nhóm tuổi/giai đoạn sống bạn cung cấp. Không gửi tên, email, nội dung trò chuyện hay bản ghi âm vào dữ liệu phân tích."
      : "Optionally share your selected LifeLine topics, Bible interactions, explanation requests, and the age band and life situation you choose to provide. Names, email, chat messages, and recordings are excluded from this analytics stream."}</p>
    <p className="text-xs text-blue-100/65">{vi
      ? "Hoạt động được gắn với mã ngẫu nhiên cho ứng dụng trên thiết bị này. Thông tin có thể góp vào các mẫu tổng hợp trên toàn LifeStages để gợi ý LifeLine tiếp theo. Báo cáo chỉ dùng nhóm đủ lớn; hội thánh khác không thấy hoạt động cá nhân của bạn. Bạn có thể tắt hoặc xóa dữ liệu đã chia sẻ."
      : "Activity is linked over time by a random identifier for this app installation. It may also contribute to patterns across LifeStages that inform Next Logical LifeLine suggestions. Reports must use groups large enough to protect privacy; other churches cannot see your individual activity. You can turn sharing off or erase the shared activity."}</p>
    <label className="flex gap-3 items-start cursor-pointer">
      <input type="checkbox" className="mt-1 size-5 accent-amber-400" checked={status.enabled} disabled={(!status.available && !status.enabled) || !church || busy}
        onChange={event => { setAnalyticsConsent(event.target.checked); setMessage("") }} />
      <span className="text-sm">{vi ? "Cho phép chia sẻ tùy chọn với " : "Allow optional sharing for "}<strong>{church?.name || (vi ? "hội thánh đã chọn" : "your selected church")}</strong>{vi ? " và các mẫu tổng hợp trên toàn LifeStages" : " and patterns across LifeStages"}</span>
    </label>
    {!church && <p className="text-xs text-amber-200">{vi ? "Nhập mã hội thánh trong hồ sơ trước." : "Enter your church code in your profile first."}</p>}
    {church && !status.available && <p className="text-xs text-amber-200">{vi ? "Chia sẻ chưa khả dụng cho kết nối này. Không thu thập hoạt động mới." : "Sharing is not available on this connection yet. New activity is not being collected."}</p>}
    {status.hasData && <button type="button" disabled={busy} onClick={erase} className="text-sm underline text-blue-100 disabled:opacity-50">{busy ? (vi ? "Đang xóa…" : "Erasing…") : (vi ? "Xóa hoạt động tôi đã chia sẻ" : "Erase my shared activity")}</button>}
    {message && <p className="text-sm text-amber-200" role="status">{message}</p>}
  </section>
}
