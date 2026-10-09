"use client"
import Link from "next/link"
import { AppImage } from "@/components/app-image"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDevotional } from "@/context/devotional-context"
import { useSubscription } from "@/context/subscription-context"
import { useChurch } from "@/context/church-context"
import { HeaderDropdown } from "@/components/header-dropdown"
import { LIFELINE_TOPICS, LIFELINE_CATEGORIES, lifeLineUrl } from "@/lib/lifelines"
import { track } from "@/lib/analytics/client"



export default function VersePageContent() {
  const router = useRouter()
  const { devotional } = useDevotional()
  const { canAccessCore, tier } = useSubscription()
  const { hasChurch, logo, church, isLoading: churchLoading } = useChurch()
  const [showLifelinesModal, setShowLifelinesModal] = useState(false)

  const features = [
    { label: "Context", sub: "The backstory", icon: "history_edu", path: "/context", iconBg: "bg-orange-500", textColor: "text-orange-600" },
    { label: "Stories", sub: "Real-life moments", icon: "auto_stories", path: "/stories", iconBg: "bg-emerald-500", textColor: "text-emerald-600" },
    { label: "Poetry", sub: "Beautiful verses", icon: "edit_note", path: "/poetry", iconBg: "bg-fuchsia-500", textColor: "text-fuchsia-600" },
    { label: "Imagery", sub: "Visual symbols", icon: "image", path: "/imagery", iconBg: "bg-cyan-500", textColor: "text-cyan-600" },
    { label: "Songs", sub: "Worship music", icon: "music_note", path: "/songs", iconBg: "bg-rose-500", textColor: "text-rose-600" },
    { label: "Lifelines", sub: "Help for hard times", icon: "explore", path: "", iconBg: "bg-violet-500", textColor: "text-violet-600", isLifelines: true },
  ]

  const handleLifelinesSelect = (topicId: string) => {
    const topic = LIFELINE_TOPICS.find(t => t.id === topicId)
    if (topic) {
      setShowLifelinesModal(false)
      track("lifeline_selected", { topicId: topic.id })
      router.push(lifeLineUrl(topic))
    }
  }

  const lifelinesLimitText = tier === "free" ? "Free with email" : "Personalized with Premium"
  const showChurchBranding = hasChurch && !churchLoading

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-[#0c1929] shadow-2xl">
      <Link href="/personalization" className="block px-6 pt-5 pr-16 text-sm text-amber-300 underline underline-offset-4">See examples of personalized Premium content</Link>
      {/* Three Dots Menu */}
      <div className="absolute top-4 right-4 z-20">
        <HeaderDropdown verseReference={devotional.verse?.reference} />
      </div>

      {/* Lifelines Modal */}
      {showLifelinesModal && (
        <div className="fixed inset-0 z-[100] bg-[#0c1929] overflow-hidden">
          <div className="flex flex-col h-full max-w-md mx-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-violet-600 to-purple-600 text-white shrink-0">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">explore</span>
                <div>
                  <h3 className="font-bold">Lifelines</h3>
                  <p className="text-xs text-white/80">{lifelinesLimitText}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLifelinesModal(false)}
                className="size-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-[#0c1929]">
              <p className="text-sm text-blue-200/70 mb-4">Select a topic to explore today's verse through that lens:</p>
              
              {tier === "free" ? (
                <div className="text-center py-8">
                  <div className="size-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-white/50">lock</span>
                  </div>
                  <h4 className="font-bold mb-2 text-white">Upgrade to Access Lifelines</h4>
                  <p className="text-sm text-blue-200/70 mb-4">Get personalized reflections for life's hardest moments.</p>
                  <button onClick={() => { setShowLifelinesModal(false); router.push("/subscription") }} className="px-6 py-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold">
                    View Plans
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {LIFELINE_CATEGORIES.map(({ id: cat, name: title, color }) => (
                    <div key={cat}>
                      <h4 className={`text-xs font-bold text-${color}-400 uppercase tracking-wider mb-3`}>{title}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {LIFELINE_TOPICS.filter(t => t.category === cat).map((topic) => (
                          <button
                            key={topic.id}
                            onClick={() => handleLifelinesSelect(topic.id)}
                            className={`flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5 hover:border-${color}-500/50 hover:bg-${color}-500/10 transition-all text-left`}
                          >
                            <span className={`material-symbols-outlined text-${color}-400`}>{topic.icon}</span>
                            <span className="text-sm font-medium text-white">{topic.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto">
        
        {/* Header with Logo - Church Aware */}
        <div className="flex flex-col items-center text-center px-6 pt-8 pb-4">
          {showChurchBranding && logo ? (
            <>
              <AppImage src={logo} alt={church?.name || "Church"} className="h-20 w-auto mb-3" />
              <h1 className="text-xl font-bold tracking-tight text-white">{church?.name}</h1>
              <p className="text-xs text-blue-200/80 mt-1">Scripture that speaks to where you are</p>
            </>
          ) : showChurchBranding && church ? (
            <>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl border-2 border-amber-400/50 bg-amber-400/20 mb-3">
                <span className="material-symbols-outlined text-4xl text-amber-400">church</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">{church.name}</h1>
              <p className="text-xs text-blue-200/80 mt-1">Scripture that speaks to where you are</p>
            </>
          ) : (
            <>
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-xl border-2 border-amber-400/30 mb-3">
                <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                  <source src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Book%20of%20Life%20-%20Christian%20-%20Video-uZ0vBJPjlZIbPlSRaiqQ0zfvwyuxsh.mp4" type="video/mp4" />
                </video>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">Bible for Life Stages</h1>
              <p className="text-xs text-blue-200/80 mt-1">Scripture that speaks to where you are</p>
            </>
          )}
        </div>

        {/* Verse of the Day Section */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-10 bg-amber-400/40"></div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Verse of the Day</span>
            <div className="h-px w-10 bg-amber-400/40"></div>
          </div>

          {devotional.verse ? (
            <div className="text-center">
              <p className="font-serif text-xl leading-relaxed text-white mb-4">&ldquo;{devotional.verse.text}&rdquo;</p>
              <div className="flex items-center justify-center gap-3">
                <div className="h-px w-6 bg-blue-200/30"></div>
                <p className="text-sm text-blue-200/70 font-medium">{devotional.verse.reference} ({devotional.verse.version})</p>
                <div className="h-px w-6 bg-blue-200/30"></div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-blue-200/70">Loading verse...</p>
            </div>
          )}
        </div>

        {/* Dive Deeper Section */}
        <div className="px-4 pb-4">
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Dive Deeper</h2>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              {features.map((item, idx) => {
                const isLocked = false
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (isLocked) { router.push("/subscription"); return }
                      if (item.isLifelines) { setShowLifelinesModal(true) } 
                      else { router.push(item.path) }
                    }}
                    className="flex flex-col items-start p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all active:scale-[0.98] hover:shadow-md text-left"
                  >
                    <div className={`size-10 rounded-full ${item.iconBg} text-white flex items-center justify-center mb-3`}>
                      <span className="material-symbols-outlined">{isLocked ? "lock" : item.icon}</span>
                    </div>
                    <span className="font-bold text-gray-900">{item.label}</span>
                    <span className={`text-xs ${item.textColor} mt-0.5 font-medium`}>{item.sub}</span>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => router.push("/talk")}
              className="w-full flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all active:scale-[0.98] hover:shadow-md"
            >
              <div className="size-10 rounded-full bg-indigo-500 text-white flex items-center justify-center mr-3">
                <span className="material-symbols-outlined">forum</span>
              </div>
              <div className="flex-1 text-left">
                <span className="font-bold text-gray-900 block">Text Chat — Premium</span>
                <span className="text-xs text-indigo-600 font-medium">Voice Chat: Coming Soon — Premium Plus</span>
              </div>
              <span className="material-symbols-outlined text-gray-400">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Find a Verse */}
        <div className="px-4 pb-4">
          <button
            disabled
            aria-label="Find a Verse — Coming soon"
            className="w-full flex items-center p-4 bg-gray-900/50 backdrop-blur rounded-xl border border-amber-400/20 opacity-60 cursor-not-allowed"
          >
            <div className="size-10 rounded-full bg-amber-500 text-white flex items-center justify-center mr-3">
              <span className="material-symbols-outlined">search</span>
            </div>
            <div className="flex-1 text-left">
              <span className="font-bold text-white block">Find a Verse</span>
              <span className="text-xs text-blue-200/70 font-medium">Coming soon</span>
            </div>
            <span className="material-symbols-outlined text-amber-400">schedule</span>
          </button>
        </div>

      </main>
    </div>
  )
}
