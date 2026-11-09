"use client"

import { useEffect, useState } from "react"
import { useChurch } from "@/context/church-context"
import { useLanguage } from "@/context/language-context"
import { canonicalCareChurchId, readChurchCarePermission, updateChurchCarePermission } from "@/lib/church-care-permissions"

export function ChurchCarePreferences() {
  const { church, isLoading } = useChurch()
  const { language } = useLanguage()
  const vi = language === "vi"
  const churchId = canonicalCareChurchId(church?.id)
  const [loadedChurchId, setLoadedChurchId] = useState<string | null>(null)
  const [allowed, setAllowed] = useState(false)
  const [savedAllowed, setSavedAllowed] = useState(false)
  const [hasSaved, setHasSaved] = useState(false)
  const [message, setMessage] = useState<"saved" | "error" | "">("")

  useEffect(() => {
    const refresh = () => {
      setLoadedChurchId(null)
      setAllowed(false)
      setSavedAllowed(false)
      setHasSaved(false)
      setMessage("")
      if (!churchId || isLoading) return
      try {
        const permission = readChurchCarePermission(localStorage.getItem("userProfile"), churchId)
        setAllowed(permission.allowLeadershipConnection)
        setSavedAllowed(permission.allowLeadershipConnection)
        setHasSaved(!!permission.updatedAt)
        setLoadedChurchId(churchId)
      } catch { setMessage("error") }
    }
    const onStorage = (event: StorageEvent) => { if (event.key === "userProfile" || event.key === null) refresh() }
    refresh()
    window.addEventListener("lifestages-profile-changed", refresh)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("lifestages-profile-changed", refresh)
      window.removeEventListener("storage", onStorage)
    }
  }, [churchId, isLoading])

  const ready = !!churchId && !isLoading && loadedChurchId === churchId
  const save = () => {
    if (!ready || !churchId) return
    try {
      const updated = updateChurchCarePermission(localStorage.getItem("userProfile"), churchId, allowed)
      localStorage.setItem("userProfile", updated)
      window.dispatchEvent(new Event("lifestages-profile-changed"))
      setSavedAllowed(allowed)
      setHasSaved(true)
      setMessage("saved")
    } catch { setMessage("error") }
  }

  return <section className="rounded-xl border border-white/15 bg-white/5 p-4 space-y-3" aria-labelledby="church-care-heading">
    <h2 id="church-care-heading" className="font-semibold text-white">{vi ? "Cho phép kết nối với lãnh đạo hội thánh" : "Permission to connect with church leadership"}</h2>
    <p className="text-sm text-blue-100/80">{vi
      ? "Bạn có thể cho phép LifeStages chia sẻ danh tính của bạn để kết nối bạn với lãnh đạo hội thánh đã chọn khi có lo ngại nghiêm trọng về sự an toàn thể chất, tinh thần hoặc tâm linh của bạn. Đây là lựa chọn tùy ý, mặc định tắt và riêng cho từng hội thánh."
      : "You can give LifeStages permission to identify you to your selected church’s leadership so they can connect with you when there are serious concerns about your physical, mental, or spiritual safety. This is optional, starts off, and applies only to this church."}</p>
    <label className="flex gap-3 items-start cursor-pointer">
      <input type="checkbox" className="mt-1 size-5 accent-amber-400" checked={ready && allowed} disabled={!ready}
        onChange={event => { setAllowed(event.target.checked); setMessage("") }} />
      <span className="text-sm text-white">{vi ? "Cho phép kết nối với lãnh đạo của " : "Allow an identifiable connection with the leadership of "}<strong>{church?.name || (vi ? "hội thánh đã chọn" : "my selected church")}</strong>{vi ? " trong những trường hợp nghiêm trọng này." : " for these serious concerns."}</span>
    </label>
    <p className="text-xs text-blue-100/70">{vi
      ? "Quyền này tách biệt với phân tích sử dụng ứng dụng ẩn danh, tổng hợp. Bạn có thể tắt quyền này và lưu lại bất cứ lúc nào."
      : "This permission is separate from anonymous, aggregate app analytics. You can turn it off and save that choice at any time."}</p>
    <p className="text-xs text-amber-100/85">{vi
      ? "Quyền của bạn chỉ được lưu trên thiết bị này. Phiên bản này chưa kết nối tính năng tự động phát hiện vấn đề an toàn, cảnh báo hoặc chuyển tiếp yêu cầu chăm sóc. Việc lưu lựa chọn này không liên hệ với bất kỳ ai."
      : "Your permission is saved only on this device. Automatic safety detection, alerts, and care referrals are not connected in this version. Saving this choice does not contact anyone."}</p>
    {!churchId && !isLoading && <p className="text-xs text-amber-200">{vi ? "Lưu mã hội thánh hợp lệ trong hồ sơ trước khi chọn quyền này." : "Save a valid church code in your profile before choosing this permission."}</p>}
    {isLoading && <p className="text-xs text-blue-100/70">{vi ? "Đang xác nhận hội thánh…" : "Confirming your church…"}</p>}
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={save} disabled={!ready || (hasSaved && allowed === savedAllowed)} className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">
        {vi ? "Lưu quyền trên thiết bị này" : "Save permission on this device"}
      </button>
      {ready && hasSaved && allowed === savedAllowed && !message && <span className="text-xs text-blue-100/70">{savedAllowed ? (vi ? "Đã lưu: cho phép kết nối" : "Saved: connection permitted") : (vi ? "Đã lưu: không cho phép kết nối" : "Saved: connection not permitted")}</span>}
    </div>
    {message && <p className="text-sm text-amber-200" role={message === "error" ? "alert" : "status"}>{message === "saved"
      ? (vi ? "Đã lưu quyền trên thiết bị này. Không ai được liên hệ." : "Permission saved on this device. No one has been contacted.")
      : (vi ? "Không thể đọc hoặc lưu quyền trên thiết bị này. Chưa lưu thay đổi." : "The permission could not be read or saved on this device. No changes were saved.")}</p>}
  </section>
}
