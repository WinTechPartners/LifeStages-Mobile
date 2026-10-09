"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/language-context"
import { useSubscription } from "@/context/subscription-context"
import { ChurchCarePreferences } from "@/components/church-care-preferences"
import { AGE_BANDS, isAgeBand, isKnownAgeBand, isPersonalizationAgeRange, resolveAgeDeclaration, toPersonalizationAgeRange } from "@/lib/age-bands"
import { CIRCUMSTANCE_GROUPS, LIFE_CIRCUMSTANCES, normalizeLifeCircumstances, recordDeclarationChange, type LifeCircumstanceId, type DeclarationSnapshot } from "@/lib/life-circumstances"

interface ProfileData {
  fullName: string
  email: string
  ageRange: string
  ageBand: string
  ageTaxonomyVersion?: number
  ageDeclaredAt?: string
  lifeCircumstances: LifeCircumstanceId[]
  circumstanceTaxonomyVersion?: number
  circumstancesDeclaredAt?: string
  declarationsUpdatedAt?: string
  declarationHistory?: DeclarationSnapshot[]
  gender: string
  stageSituation: string
  contentStyle: "casual" | "academic"
  churchId: string
  country: string
  bibleTranslation: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { canAccessPremium } = useSubscription()
  const vi = language === "vi"
  const [formData, setFormData] = useState<ProfileData>({
    fullName: "",
    email: "",
    ageRange: "",
    ageBand: "",
    lifeCircumstances: [],
    gender: "",
    stageSituation: "",
    contentStyle: "casual",
    churchId: "",
    country: "",
    bibleTranslation: "WEB",
  })

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem("userProfile")
      if (!savedData) return
      const parsed = JSON.parse(savedData)
      if (!parsed || typeof parsed !== "object") return
      setFormData({
        fullName: parsed.fullName || "",
        email: parsed.email || "",
        ageRange: isPersonalizationAgeRange(parsed.ageRange) ? parsed.ageRange : "",
        ageBand: isKnownAgeBand(parsed.ageBand) ? parsed.ageBand : "",
        ageTaxonomyVersion: parsed.ageTaxonomyVersion,
        ageDeclaredAt: parsed.ageDeclaredAt,
        lifeCircumstances: normalizeLifeCircumstances(parsed.lifeCircumstances),
        circumstanceTaxonomyVersion: parsed.circumstanceTaxonomyVersion,
        circumstancesDeclaredAt: parsed.circumstancesDeclaredAt,
        declarationsUpdatedAt: parsed.declarationsUpdatedAt,
        declarationHistory: parsed.declarationHistory,
        gender: parsed.gender || "",
        stageSituation: parsed.stageSituation || "",
        contentStyle: parsed.contentStyle || "casual",
        churchId: parsed.churchId || "",
        country: parsed.country || "",
        bibleTranslation: "WEB",
      })
    } catch { /* Keep the editable empty form if a local profile cannot be read. */ }
  }, [])

  // Save to localStorage whenever data changes
  const persistChanges = (changes: Partial<ProfileData>, kind?: "age" | "circumstances") => {
    let stored: Record<string, unknown> = {}
    try {
      const parsed = JSON.parse(localStorage.getItem("userProfile") || "{}")
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) stored = parsed
    } catch { /* Replace an unreadable profile with the user's current selections. */ }
    const next = { ...stored, ...formData, ...changes }
    const updated = kind ? recordDeclarationChange(stored, next, kind) : next
    localStorage.setItem("userProfile", JSON.stringify(updated))
    setFormData(updated)
    window.dispatchEvent(new Event("lifestages-profile-changed"))
  }

  const handleChange = (field: "fullName" | "email" | "ageBand" | "gender" | "contentStyle" | "churchId" | "country" | "bibleTranslation", value: string) => {
    if (field === "ageBand") {
      if (value === "__legacy" || (value !== "" && !isAgeBand(value))) return
      persistChanges({ ageBand: value, ageRange: value ? toPersonalizationAgeRange({ ...formData, ageBand: value }) || "" : "" }, "age")
    } else if (field === "contentStyle") {
      if (value === "casual" || value === "academic") persistChanges({ contentStyle: value })
    } else persistChanges({ [field]: value })
  }
  const toggleCircumstance = (id: LifeCircumstanceId) => {
    const next = formData.lifeCircumstances.includes(id) ? formData.lifeCircumstances.filter(item => item !== id) : [...formData.lifeCircumstances, id]
    persistChanges({ lifeCircumstances: normalizeLifeCircumstances(next) }, "circumstances")
  }
  const ageDeclaration = resolveAgeDeclaration(formData)

  const handleSave = () => {
    router.push("/")
  }

  const handleLogout = () => {
    localStorage.removeItem("bible_user_email")
    localStorage.removeItem("userProfile")
    window.dispatchEvent(new Event("lifestages-profile-changed"))
    localStorage.removeItem("selectedLanguage")
    // Clear any cached devotionals
    const keys = Object.keys(localStorage).filter(k => k.startsWith("bible3_cache_"))
    keys.forEach(k => localStorage.removeItem(k))
    window.location.href = "/"
  }

  const genderOptions = [
    { value: "male", label: "Male", icon: "male" },
    { value: "female", label: "Female", icon: "female" },
  ]

  // Common countries - can be expanded
  const countries = [
    { value: "", label: "Select country (optional)" },
    { value: "US", label: "United States" },
    { value: "CA", label: "Canada" },
    { value: "GB", label: "United Kingdom" },
    { value: "AU", label: "Australia" },
    { value: "NZ", label: "New Zealand" },
    { value: "PH", label: "Philippines" },
    { value: "NG", label: "Nigeria" },
    { value: "KE", label: "Kenya" },
    { value: "ZA", label: "South Africa" },
    { value: "GH", label: "Ghana" },
    { value: "IN", label: "India" },
    { value: "SG", label: "Singapore" },
    { value: "MY", label: "Malaysia" },
    { value: "MX", label: "Mexico" },
    { value: "BR", label: "Brazil" },
    { value: "CO", label: "Colombia" },
    { value: "AR", label: "Argentina" },
    { value: "DE", label: "Germany" },
    { value: "FR", label: "France" },
    { value: "NL", label: "Netherlands" },
    { value: "KR", label: "South Korea" },
    { value: "JP", label: "Japan" },
    { value: "VN", label: "Vietnam" },
    { value: "OTHER", label: "Other" },
  ]

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-24 mx-auto max-w-md shadow-2xl bg-[#0c1929]">
      {/* Header */}
      <div className="flex items-center px-4 py-4 justify-between sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <button
          onClick={() => router.push("/")}
          className="flex size-10 items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
            arrow_back_ios_new
          </span>
        </button>
        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{t("profile")}</h2>
        <div className="w-10"></div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col px-6 pt-4">
        <h1 className="text-[28px] font-bold leading-tight text-left pb-2">{t("letsGetToKnow")}</h1>
        <p className="text-base font-normal leading-normal text-muted-foreground">{t("personalizeDesc")}</p>
      </div>

      {/* Form Section */}
      <div className="flex flex-col gap-5 px-6 py-6">
{/* Name Input */}
        <label className="flex flex-col gap-1.5 w-full">
          <p className="text-sm font-medium leading-normal">{t("fullName")}</p>
          <input
            value={formData.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            className="flex w-full resize-none overflow-hidden rounded-xl focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-border bg-card h-14 placeholder:text-muted-foreground px-4 text-base font-normal leading-normal shadow-sm transition-all"
            placeholder="Enter your full name"
          />
        </label>

        {/* Email Input */}
        <label className="flex flex-col gap-1.5 w-full">
          <p className="text-sm font-medium leading-normal">{t("email")}</p>
          <input
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="flex w-full resize-none overflow-hidden rounded-xl focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-border bg-card h-14 placeholder:text-muted-foreground px-4 text-base font-normal leading-normal shadow-sm transition-all"
            placeholder="name@example.com"
            type="email"
          />
        </label>

        {/* Age Range */}
        <fieldset className="w-full" aria-label={vi ? "Khoảng tuổi" : "Age range"}>
          <legend className="mb-2 text-sm font-medium">{t("ageRange")} <span className="text-muted-foreground font-normal">{vi ? "(không bắt buộc)" : "(optional)"}</span></legend>
          <div className="grid grid-cols-4 gap-2">
            {AGE_BANDS.map(range => <button key={range} type="button" aria-pressed={formData.ageBand === range} onClick={() => handleChange("ageBand", range)}
              className={"min-h-12 rounded-xl border px-2 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary " + (formData.ageBand === range ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-foreground hover:border-primary/50")}>
              {range.replace("-", "–")}
            </button>)}
          </div>
          <button type="button" aria-pressed={!ageDeclaration} onClick={() => handleChange("ageBand", "")} className={"mt-2 min-h-11 rounded-xl border px-3 py-2 text-sm " + (!ageDeclaration ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground")}>{vi ? "Không muốn chia sẻ" : "Prefer not to share"}</button>
          {ageDeclaration?.legacy && <p className="mt-2 text-xs text-muted-foreground">{vi ? "Khoảng tuổi đã lưu là " + ageDeclaration.label + ". Bạn có thể giữ nguyên hoặc tự chọn khoảng mới." : "Your saved range is " + ageDeclaration.label + ". Keep it or choose a new range yourself."}</p>}
        </fieldset>

        {/* Country Select */}
        <label className="flex flex-col gap-1.5 w-full">
          <p className="text-sm font-medium leading-normal">Country <span className="text-muted-foreground font-normal">(optional)</span></p>
          <div className="relative">
            <select
              value={formData.country}
              onChange={(e) => handleChange("country", e.target.value)}
              className="flex w-full resize-none overflow-hidden rounded-xl focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-border bg-card h-14 px-4 text-base font-normal leading-normal shadow-sm appearance-none transition-all"
            >
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
              <span className="material-symbols-outlined">expand_more</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Helps personalize cultural references in your devotionals
          </p>
        </label>

        {/* Church ID Input */}
        <label className="flex flex-col gap-1.5 w-full">
          <p className="text-sm font-medium leading-normal">Church ID <span className="text-muted-foreground font-normal">(optional)</span></p>
          <input
            value={formData.churchId}
            onChange={(e) => handleChange("churchId", e.target.value.toUpperCase())}
            className="flex w-full resize-none overflow-hidden rounded-xl focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-border bg-card h-14 placeholder:text-muted-foreground px-4 text-base font-normal leading-normal shadow-sm transition-all"
            placeholder="Enter your church code"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Contact <span className="text-primary">AddMyChurch@LifeStagesAI.com</span> to get your church involved with custom verse schedules.
          </p>
        </label>

          <ChurchCarePreferences />

        {/* Gender Selection */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary">wc</span>
            <h3 className="text-lg font-bold leading-tight">Gender</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Helps personalize content to resonate with you
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            {genderOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleChange("gender", option.value)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                  formData.gender === option.value
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className={`size-12 rounded-full flex items-center justify-center mb-2 ${
                  formData.gender === option.value
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <span className="material-symbols-outlined text-2xl">{option.icon}</span>
                </div>
                <span className={`font-semibold text-sm ${
                  formData.gender === option.value ? "text-primary" : "text-foreground"
                }`}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Explicit circumstances may overlap; age never chooses them. */}
        <section className="pt-2" aria-labelledby="circumstances-heading">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary">spa</span>
            <h3 id="circumstances-heading" className="text-lg font-bold leading-tight">{vi ? "Hoàn cảnh hiện tại" : "Life circumstances"}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {vi ? "Không bắt buộc. Chọn tất cả điều phù hợp với bạn lúc này. Các lựa chọn có thể trùng nhau; độ tuổi không quyết định hoàn cảnh của bạn." : "Optional. Select everything that fits your life right now. Choices can overlap; your age does not determine your circumstances."}
          </p>
          
          <div className="space-y-5">
            {CIRCUMSTANCE_GROUPS.map(group => (
              <fieldset key={group.id}>
                <legend className="text-sm font-semibold mb-2">{vi ? group.labelVi : group.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {LIFE_CIRCUMSTANCES.filter(item => item.group === group.id).map(item => {
                    const selected = formData.lifeCircumstances.includes(item.id)
                    return <button key={item.id} type="button" aria-pressed={selected} onClick={() => toggleCircumstance(item.id)}
                      className={`min-h-11 px-3 py-2 rounded-xl text-sm border transition-colors ${selected ? "border-primary bg-primary/15 text-primary" : "border-border bg-card hover:border-primary/50"}`}>
                      {selected && <span aria-hidden="true" className="mr-1">✓</span>}{vi ? item.labelVi : item.label}
                    </button>
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          {formData.lifeCircumstances.length > 0 && <button type="button" className="text-sm text-muted-foreground underline mt-4" onClick={() => persistChanges({ lifeCircumstances: [] }, "circumstances")}>{vi ? "Bỏ tất cả lựa chọn" : "Clear selections"}</button>}
          {formData.stageSituation && <p className="text-xs text-muted-foreground mt-4">
            {vi ? `Câu trả lời trước đây: “${formData.stageSituation}”. Được giữ riêng; không tự chuyển thành các lựa chọn ở trên.` : `Earlier broad response: “${formData.stageSituation}”. Kept separately; it does not select any circumstances above.`}
          </p>}
        </section>

        {/* Preferences may be saved by anyone; verified paid plans apply personalization. */}
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary">style</span>
              <h3 className="text-lg font-bold leading-tight">{vi ? "Phong cách nội dung" : "Content style"}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {vi ? "Bạn muốn nội dung suy ngẫm được viết theo phong cách nào?" : "How would you like your devotional content written?"}
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleChange("contentStyle", "casual")}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all ${
                  formData.contentStyle === "casual"
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className={`size-10 rounded-full flex items-center justify-center mb-2 ${
                  formData.contentStyle === "casual"
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <span className="material-symbols-outlined">chat_bubble</span>
                </div>
                <span className={`font-semibold text-sm ${
                  formData.contentStyle === "casual" ? "text-primary" : "text-foreground"
                }`}>
                  {vi ? "Gần gũi" : "Casual"}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  {vi ? "Ấm áp, tự nhiên như một người bạn" : "Warm, conversational, like a friend"}
                </span>
              </button>

              <button
                onClick={() => handleChange("contentStyle", "academic")}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all ${
                  formData.contentStyle === "academic"
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className={`size-10 rounded-full flex items-center justify-center mb-2 ${
                  formData.contentStyle === "academic"
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <span className="material-symbols-outlined">school</span>
                </div>
                <span className={`font-semibold text-sm ${
                  formData.contentStyle === "academic" ? "text-primary" : "text-foreground"
                }`}>
                  {vi ? "Học thuật" : "Academic"}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  {vi ? "Chuyên sâu về học thuật và thần học" : "Scholarly, in-depth, theological"}
                </span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {canAccessPremium
                ? (vi ? "Gói trả phí của bạn có thể dùng những lựa chọn này để cá nhân hóa nội dung." : "Your paid plan can use these preferences to personalize content.")
                : (vi ? "Bạn có thể lưu tùy chọn ngay bây giờ. Nội dung miễn phí dùng một phiên bản chung; cá nhân hóa được áp dụng khi có gói trả phí." : "Save your preferences now. Free content uses a shared edition; personalization applies with a paid plan.")}
            </p>
          </div>

        {/* Lifelines Info - FIXED: Dark background with light text */}
        <div className="pt-4 rounded-xl border border-primary/30 bg-primary/10 p-4">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined">explore</span>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground mb-1">Lifelines Available</h3>
              <p className="text-xs text-muted-foreground">
                When viewing your daily devotional, tap "Lifelines" to access reflections for specific situations like caregiving, grief, health challenges, and more.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-start gap-3">
          <span className="material-symbols-outlined text-muted-foreground mt-0.5" style={{ fontSize: "20px" }}>
            lock
          </span>
          <p className="text-xs text-muted-foreground leading-relaxed">{t("privacyNote")}</p>
        </div>

        {/* Legal & Support Links */}
        <div className="pt-6 border-t border-border mt-4">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push("/support")}
              className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-muted-foreground">help</span>
                <span className="text-sm font-medium">Help & Support</span>
              </div>
              <span className="material-symbols-outlined text-muted-foreground">chevron_right</span>
            </button>
            <button
              onClick={() => router.push("/privacy")}
              className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-muted-foreground">shield</span>
                <span className="text-sm font-medium">Privacy Policy</span>
              </div>
              <span className="material-symbols-outlined text-muted-foreground">chevron_right</span>
            </button>
            <button
              onClick={() => router.push("/terms")}
              className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-muted-foreground">description</span>
                <span className="text-sm font-medium">Terms of Service</span>
              </div>
              <span className="material-symbols-outlined text-muted-foreground">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 p-3 rounded-xl bg-red-600/10 border border-red-600/20 hover:bg-red-600/20 transition-colors"
          >
            <span className="material-symbols-outlined text-red-600">logout</span>
            <span className="text-sm font-medium text-red-600">Logout & Clear Data</span>
          </button>
        </div>

        {/* Delete Account */}
        <div className="pt-2 pb-4">
          <button
            onClick={() => router.push("/account/delete")}
            className="flex w-full items-center justify-center gap-2 p-3 rounded-xl hover:bg-red-600/10 transition-colors"
          >
            <span className="material-symbols-outlined text-red-400/50 text-sm">delete_forever</span>
            <span className="text-xs text-red-400/50">Delete Account</span>
          </button>
        </div>
      </div>

      {/* Sticky Footer Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-20 mx-auto max-w-md">
        <button
          onClick={handleSave}
          className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 bg-primary text-primary-foreground text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors shadow-lg"
        >
          <span className="truncate">{t("save")}</span>
        </button>
      </div>
    </div>
  )
}
