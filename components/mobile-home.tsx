"use client"
import Link from "next/link"
import { AppImage } from "@/components/app-image"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useDevotional } from "@/context/devotional-context"
import { useSubscription } from "@/context/subscription-context"
import { useLanguage } from "@/context/language-context"
import { useChurch } from "@/context/church-context"
import { HeaderDropdown } from "@/components/header-dropdown"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { VOTDCarousel } from "@/components/votd-carousel"
import {
  hapticTap, hapticSuccess, hideSplash,
  setStatusBarDark, cacheVerseForOffline, getOfflineVerse,
  isOnline, onNetworkChange, requestPushPermission, setupPushListeners, isNative
} from "@/lib/native-features"

export default function MobileHome() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { devotional, userName, isLoading, loadingStates, generateDevotional } = useDevotional()
  const { canAccessPremium, canStartTrial } = useSubscription()
  const { t, language } = useLanguage()
  const { hasChurch, church, lastSermon, thisSermon, logo, showSermonRow, isLoading: churchLoading } = useChurch()
  const [hasGenerated, setHasGenerated] = useState(false)
  const [showProfileHint, setShowProfileHint] = useState(false)
  const [networkOnline, setNetworkOnline] = useState(true)
  const [offlineVerse, setOfflineVerse] = useState<any>(null)
  const [pushAsked, setPushAsked] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  // Initialize native features
  useEffect(() => {
    setStatusBarDark()
    hideSplash()

    setNetworkOnline(isOnline())
    if (!isOnline()) {
      setOfflineVerse(getOfflineVerse())
    }
    const cleanup = onNetworkChange((online) => {
      setNetworkOnline(online)
      if (!online) setOfflineVerse(getOfflineVerse())
    })

    return cleanup
  }, [])

  // Ask for push notification permission and register token (once)
  useEffect(() => {
    if (isNative() && !pushAsked) {
      const asked = localStorage.getItem('push_permission_asked')
      if (!asked) {
        const timer = setTimeout(async () => {
          const granted = await requestPushPermission()
          localStorage.setItem('push_permission_asked', 'true')
          setPushAsked(true)

          if (granted) {
            // Listen for token and save it to the server
            setupPushListeners(
              async (token) => {
                try {
                  const profile = localStorage.getItem("userProfile")
                  const email = profile ? JSON.parse(profile).email : null
                  const platform = /android/i.test(navigator.userAgent) ? 'android' : 'ios'
                  await fetch('/api/push/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, platform, email }),
                  })
                } catch (e) {
                  console.error('[Push] Failed to register token:', e)
                }
              },
              (notification) => {
                // When user taps a VOTD notification, go to the verse page
                if (notification?.data?.type === 'votd') {
                  router.push('/verse')
                }
              }
            )
          }
        }, 5000)
        return () => clearTimeout(timer)
      }
    }
  }, [pushAsked, router])

  // Invitation links open a preview; joining always requires the user's Connect action.
  useEffect(() => {
    const churchParam = searchParams.get('church')
    if (churchParam) router.replace(`/connect?church=${encodeURIComponent(churchParam)}`)
  }, [searchParams, router])

  // Check if profile exists
  useEffect(() => {
    const readProfile = () => {
      try {
        const profile = JSON.parse(localStorage.getItem("userProfile") || "null")
        setUserProfile(profile)
        setShowProfileHint(!profile || !(profile.ageRange || profile.ageBand || profile.age) || !profile.gender)
      } catch { setUserProfile(null); setShowProfileHint(true) }
    }
    const onStorage = (event: StorageEvent) => { if (event.key === "userProfile" || event.key === null) readProfile() }
    readProfile()
    window.addEventListener("lifestages-profile-changed", readProfile)
    window.addEventListener("storage", onStorage)
    return () => { window.removeEventListener("lifestages-profile-changed", readProfile); window.removeEventListener("storage", onStorage) }
  }, [])

  // Auto-generate verse
  useEffect(() => {
    if (!churchLoading && !devotional.verse && !isLoading && !hasGenerated && networkOnline) {
      setHasGenerated(true)
      generateDevotional("YouVersion")
    }
  }, [churchLoading, devotional.verse, isLoading, hasGenerated, generateDevotional, networkOnline])

  // Cache verse for offline access when new verse loads
  useEffect(() => {
    if (devotional.verse && devotional.interpretation) {
      cacheVerseForOffline({
        reference: devotional.verse.reference,
        text: devotional.verse.text,
        interpretation: devotional.interpretation,
        heroImage: devotional.heroImage,
      })
    }
  }, [devotional.verse, devotional.interpretation, devotional.heroImage])

  const handleRetry = () => { hapticTap(); setHasGenerated(false) }

  const showChurchBranding = hasChurch && !churchLoading

  // Use offline cached verse when offline
  const hasVerse = !!devotional.verse
  const displayVerse = hasVerse ? devotional.verse : (offlineVerse ? { reference: offlineVerse.reference, text: offlineVerse.text, version: '' } : null)
  const displayInterpretation = devotional.interpretation || offlineVerse?.interpretation
  const displayImage = devotional.heroImage || offlineVerse?.heroImage

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-[#0c1929] shadow-2xl">

      {/* Safe area top spacer */}
      <div className="h-[env(safe-area-inset-top,0px)]" />

      {/* Offline Banner */}
      {!networkOnline && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-sm">cloud_off</span>
          <span className="text-xs text-amber-300 font-medium">You&apos;re offline — showing cached verse</span>
        </div>
      )}

      {/* ========================================================
          BLOCK 1 & 2: Logo + Title (or Church)
          ======================================================== */}
      <header className="church-brand-surface relative z-30 flex flex-col items-center px-4 pt-16 pb-5 backdrop-blur-xl border-b border-white/5">
        <div className="flex min-w-0 flex-col items-center gap-3 text-center">
          {/* BLOCK 1: Logo */}
          {showChurchBranding && logo ? (
            <AppImage src={logo} alt="" className="h-24 max-w-48 object-contain" />
          ) : showChurchBranding ? (
            <span className="material-symbols-outlined text-3xl">church</span>
          ) : (
            <video autoPlay loop muted playsInline aria-label="LifeStages tree of life and book" className="size-28 rounded-2xl object-cover"><source src="/images/lifestages-book-of-life.mp4" type="video/mp4" /></video>
          )}
          {/* BLOCK 2: Title */}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight break-words">
              {showChurchBranding && church ? church.name : "LifeStages"}
            </h1>
            <p className="text-[10px] opacity-70 font-medium tracking-wide">{showChurchBranding ? "POWERED BY LIFESTAGES" : "BIBLE FOR LIFE STAGES"}</p>
          </div>
        </div>
        <div className="absolute top-3 right-4 flex items-center gap-1"><HeaderDropdown verseReference={devotional.verse?.reference} /></div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto pb-24">

        {showChurchBranding && church && <div className="px-5 pt-4 pb-1">
          {church.welcome_message && <p className="text-sm text-blue-100/80 leading-relaxed whitespace-pre-line mb-3">{church.welcome_message}</p>}
          <button onClick={() => { hapticTap(); router.push("/my-church") }} className="church-brand-button w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold">
            <span className="material-symbols-outlined text-lg">church</span>{language === "vi" ? "Hội thánh & liên hệ lãnh đạo" : "My church & leadership"}
          </button>
        </div>}

        {/* ========================================================
            BLOCK 3: Note (AI+Secure or Church's Last Week's Sermon)
            ======================================================== */}
        {showChurchBranding && showSermonRow && lastSermon ? (
          /* Church variant: Last Week's Sermon */
          <div className="px-5 pt-3 pb-2">
            <button
              onClick={() => { hapticTap(); router.push("/sermon/last") }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/20 active:scale-[0.98] transition-transform"
            >
              <div className="size-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-400">podium</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-white text-sm font-semibold">{lastSermon.source === 'imported_recording' ? 'Latest church recording' : 'Latest sermon'}</p>
                <p className="text-blue-200/50 text-xs truncate">{lastSermon.title}</p>
              </div>
              <span className="material-symbols-outlined text-amber-400/50 text-lg">chevron_right</span>
            </button>
          </div>
        ) : null}

        {/* ========================================================
            BLOCK 4: Read the Bible
            Same for everyone. Church: option to add this week's
            sermon verses at the top.
            ======================================================== */}
        <div className="px-5 pb-3 pt-2">
          {/* This Week's Sermon Verses (Church only) */}
          {showChurchBranding && thisSermon && (
            <button
              onClick={() => { hapticTap(); router.push(`/bible?verse=${encodeURIComponent(thisSermon.scripture)}${thisSermon.id && church ? `&sermonId=${encodeURIComponent(thisSermon.id)}&churchId=${encodeURIComponent(church.id)}` : ""}`) }}
              className="w-full flex items-center gap-3 p-2.5 mb-2.5 rounded-xl bg-purple-500/10 border border-purple-400/20 active:scale-[0.98] transition-transform"
            >
              <span className="material-symbols-outlined text-purple-400">church</span>
              <div className="flex-1 text-left">
                <p className="text-white text-xs font-semibold">This Week: {thisSermon.scripture}</p>
                <p className="text-blue-200/40 text-[10px]">{thisSermon.title}</p>
              </div>
              <span className="material-symbols-outlined text-purple-400/50 text-sm">chevron_right</span>
            </button>
          )}
          <button
            onClick={() => { hapticTap(); router.push("/bible") }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] active:scale-[0.98] transition-transform hover:bg-white/[0.07]"
          >
            <div className="size-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-400">menu_book</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-white text-sm font-semibold">Read the Bible</p>
              <p className="text-blue-200/40 text-xs">66 Books of Scripture</p>
            </div>
            <span className="material-symbols-outlined text-white/20 text-lg">chevron_right</span>
          </button>
        </div>

        {/* ========================================================
            BLOCK 5: Lifelines (personalized by profile)
            ======================================================== */}
        <div className="px-5 pb-3">
          <button
            onClick={() => { hapticTap(); router.push("/lifelines") }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] active:scale-[0.98] transition-transform hover:bg-white/[0.07]"
          >
            <div className="size-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-violet-400">explore</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-white text-sm font-semibold">Lifelines</p>
              <p className="text-blue-200/40 text-xs">
                {userProfile?.stageSituation && userProfile.stageSituation !== "General"
                  ? `Scripture for ${userProfile.stageSituation.toLowerCase()}`
                  : "Scripture for moments of need"
                }
              </p>
            </div>
            <span className="material-symbols-outlined text-white/20 text-lg">chevron_right</span>
          </button>
        </div>

        {/* ========================================================
            BLOCK 6 & 7: Welcome Friend + Profile Button
            ======================================================== */}
        <div className="px-5 pb-4 pt-1">
          <div className="flex items-center justify-between">
            {/* BLOCK 6: Welcome Friend (personalized by profile) */}
            <div>
              <p className="text-blue-200/50 text-xs font-medium uppercase tracking-wider">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h2 className="text-xl font-bold text-white mt-0.5">
                {t("welcome")}{userName ? `, ${userName}` : ""}
              </h2>
            </div>
            {/* BLOCK 7: Profile Button */}
            {showProfileHint ? (
              <button
                onClick={() => { hapticTap(); router.push("/profile") }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-semibold animate-pulse hover:animate-none hover:bg-amber-500/25 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">person_add</span>
                Set Profile
              </button>
            ) : (
              <button
                onClick={() => { hapticTap(); router.push("/profile") }}
                className="size-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-blue-200/60 hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">person</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================
            BLOCKS 8, 9, 10: VOTD Carousel (swipeable)
            8. Verse of Day image (or personalized for paying)
            9. Verse of the Day (or church-defined)
            10. Friendly Breakdown (or personalized for paying)
            ======================================================== */}
        <VOTDCarousel
          todayVerse={displayVerse ? { reference: displayVerse.reference, text: displayVerse.text } : undefined}
          todayInterpretation={displayInterpretation}
          todayHeroImage={displayImage}
          todayIsLoading={loadingStates.verse || isLoading}
          interpretationLoading={loadingStates.interpretation}
          canAccessPremium={canAccessPremium}
          churchId={church?.id}
          onRetry={handleRetry}
        />

        {/* Go Deeper CTA (for premium users) */}
        {displayVerse && canAccessPremium && (
          <div className="px-5 pt-2 pb-4">
            <button
              onClick={() => { hapticSuccess(); router.push("/verse") }}
              className="w-full relative overflow-hidden py-4 rounded-2xl font-bold text-lg text-white shadow-xl active:scale-[0.97] transition-transform"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 animate-gradient-x" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%)]" />
              <div className="relative flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-xl">auto_awesome</span>
                Go Deeper
              </div>
            </button>
          </div>
        )}

        {/* ========================================================
            BLOCK 11: Bringing Scripture to Life
            (for free users, not shown for paying customers)
            ======================================================== */}
        {!canAccessPremium && displayVerse && (
          <div className="px-5 pb-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/80 via-purple-900/80 to-fuchsia-900/80 border-2 border-amber-400/30">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl" />

              <div className="relative p-5">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 mb-3">
                    <span className="material-symbols-outlined text-amber-400 text-sm">star</span>
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Premium</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Premium Makes It Personal</h3>
                  <Link href="/personalization" className="mt-2 block text-sm text-amber-300 underline underline-offset-4">See examples of personalized Premium content</Link>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { icon: "history_edu", label: "Context", desc: "Backstory", color: "text-orange-400" },
                    { icon: "auto_stories", label: "Stories", desc: "Narratives", color: "text-emerald-400" },
                    { icon: "edit_note", label: "Poetry", desc: "Verses", color: "text-fuchsia-400" },
                    { icon: "image", label: "Imagery", desc: "Visuals", color: "text-cyan-400" },
                    { icon: "music_note", label: "Songs", desc: "Worship", color: "text-rose-400" },
                    { icon: "explore", label: "Lifelines", desc: "Guidance", color: "text-violet-400" },
                  ].map((feature) => (
                    <div key={feature.label} className="flex flex-col items-center p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <span className={`material-symbols-outlined ${feature.color} text-2xl mb-1`}>{feature.icon}</span>
                      <span className="text-xs font-semibold text-white">{feature.label}</span>
                      <span className="text-[10px] text-blue-200/50">{feature.desc}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-white/10 rounded-xl p-3 mb-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold">What You Get:</p>
                      <p className="text-xs text-blue-200/60">Personalized breakdowns, Lifelines, all content, and Text Chat</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-amber-400">$4.99<span className="text-sm text-blue-200/60">/mo</span></p>
                      <p className="text-xs text-green-400">or $49.99/year (save 16%)</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => { hapticTap(); router.push("/subscription") }}
                  className="w-full py-4 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 text-gray-900 rounded-xl font-bold text-lg shadow-xl active:scale-[0.98] transition-transform animate-pulse hover:animate-none"
                >
                  {canStartTrial ? "Try Personalization Free for 7 Days" : "Make It Personal with Premium"}
                </button>
                <div className="flex items-center justify-center gap-4 mt-3">
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {canStartTrial ? "Free for 7 days" : "Choose monthly or yearly"}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Cancel anytime
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            BLOCK 12: Quote from Sarah
            (for free users, not shown for paying customers)
            ======================================================== */}
        {!canAccessPremium && displayVerse && (
          <div className="px-5 pb-8">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-400 text-2xl shrink-0">format_quote</span>
                <div>
                  <p className="text-blue-100/80 text-sm italic">
                    &ldquo;Finally, a Bible app that speaks directly to where I am in life. The personalized stories have transformed my daily devotional time.&rdquo;
                  </p>
                  <p className="text-xs text-blue-200/50 mt-2">— Sarah M., Young Professional</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />

      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 3s ease infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
