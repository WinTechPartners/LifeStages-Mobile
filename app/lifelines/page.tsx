"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSubscription } from "@/context/subscription-context"
import { LIFELINE_CATEGORIES, LIFELINE_TOPICS, lifeLineUrl } from "@/lib/lifelines"
import { track } from "@/lib/analytics/client"

export default function LifelinesPage() {
  const router = useRouter()
  const { canAccessCore } = useSubscription()
  const [expandedCategory, setExpandedCategory] = useState<string | null>("family")

  const lifelineCategories = LIFELINE_CATEGORIES.map(category => ({
    ...category, lifelines: LIFELINE_TOPICS.filter(topic => topic.category === category.id),
  }))

  const colorClasses: Record<string, { bg: string; border: string; text: string; icon: string; gradient: string }> = {
    rose: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-300", icon: "text-rose-400", gradient: "from-rose-500/20" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-300", icon: "text-emerald-400", gradient: "from-emerald-500/20" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-300", icon: "text-blue-400", gradient: "from-blue-500/20" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-300", icon: "text-amber-400", gradient: "from-amber-500/20" },
    purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-300", icon: "text-purple-400", gradient: "from-purple-500/20" },
    cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-300", icon: "text-cyan-400", gradient: "from-cyan-500/20" },
    orange: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-300", icon: "text-orange-400", gradient: "from-orange-500/20" },
  }

  const totalLifelines = lifelineCategories.reduce((sum, cat) => sum + cat.lifelines.length, 0)

  return (
    <div className="min-h-screen bg-[#0c1929]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-900/20 via-purple-900/10 to-blue-900/20"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-rose-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-6xl mx-auto px-6 py-12">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-12">
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="text-sm">Back</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-amber-400/30">
                <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                  <source src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Book%20of%20Life%20-%20Christian%20-%20Video-uZ0vBJPjlZIbPlSRaiqQ0zfvwyuxsh.mp4" type="video/mp4" />
                </video>
              </div>
              <span className="text-white font-bold">Life Stages</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-400/20 border border-rose-400/30 mb-6">
              <span className="material-symbols-outlined text-rose-400">favorite</span>
              <span className="text-sm font-bold text-rose-300 uppercase tracking-wider">{totalLifelines} Lifelines</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Scripture for Your <span className="text-rose-400">Moment of Need</span>
            </h1>
            
            <p className="text-lg text-blue-200/70 mb-8">
              At 3am when you can't sleep. In the hospital waiting room. Before the hard conversation. 
              Lifelines meet you exactly where you are with Scripture that speaks to <em>your</em> situation.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                <span className="material-symbols-outlined text-cyan-400 text-lg">chat</span>
                <span className="text-cyan-300 text-sm">Text Chat — Premium</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30">
                <span className="material-symbols-outlined text-green-400 text-lg">call</span>
                <span className="text-green-300 text-sm">Voice — Coming Soon · Premium Plus</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span className="material-symbols-outlined text-amber-400 text-lg">highlight</span>
                <span className="text-amber-300 text-sm">Verse Highlight</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Lifelines */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="space-y-4">
            {lifelineCategories.map((category) => {
              const colors = colorClasses[category.color]
              const isExpanded = expandedCategory === category.id

              return (
                <div key={category.id} className={`rounded-2xl border ${colors.border} overflow-hidden`}>
                  {/* Category Header */}
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                    className={`w-full flex items-center justify-between p-5 bg-gradient-to-r ${colors.gradient} to-transparent hover:bg-white/5 transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                        <span className={`material-symbols-outlined ${colors.icon}`}>{category.icon}</span>
                      </div>
                      <div className="text-left">
                        <h3 className="text-white font-bold">{category.name}</h3>
                        <p className="text-sm text-blue-200/50">{category.tagline}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-blue-200/40">{category.lifelines.length} topics</span>
                      <span className={`material-symbols-outlined ${colors.icon} transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </div>
                  </button>

                  {/* Lifelines Grid */}
                  {isExpanded && (
                    <div className="p-5 bg-white/[0.02] grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {category.lifelines.map((lifeline) => (
                        <button
                          type="button"
                          key={lifeline.id}
                          onClick={() => {
                            
                            track("lifeline_selected", { topicId: lifeline.id })
                            router.push(lifeLineUrl(lifeline))
                          }}
                          className={`rounded-xl p-4 ${colors.bg} border ${colors.border} hover:bg-white/10 transition-all cursor-pointer group text-left`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`material-symbols-outlined ${colors.icon} group-hover:scale-110 transition-transform`}>
                              {lifeline.icon}
                            </span>
                            <div>
                              <h4 className="text-white font-semibold text-sm mb-1">{lifeline.label}</h4>
                              <p className="text-xs text-blue-200/60 leading-relaxed">{lifeline.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* For Churches CTA */}
      <section className="py-16 bg-gradient-to-b from-transparent to-indigo-950/30">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/20 border border-amber-400/30 mb-6">
            <span className="material-symbols-outlined text-amber-400">church</span>
            <span className="text-sm font-bold text-amber-300 uppercase tracking-wider">For Churches</span>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">
            Your Voice. Your Theology. 24/7.
          </h2>
          
          <p className="text-blue-200/70 mb-8">
            When you partner with Life Stages, every Lifeline speaks with your pastoral voice. 
            Your congregation gets Scripture-based support that sounds like <em>you</em> — 
            available whenever they need it, even at 3am.
          </p>

          <button
            onClick={() => router.push("/church")}
            className="px-8 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 rounded-xl font-bold text-lg shadow-xl hover:shadow-amber-500/25 transition-all hover:scale-105"
          >
            Partner With Life Stages
          </button>
        </div>
      </section>

      {/* Crisis Support Notice */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-blue-900/40 rounded-2xl p-6 border border-blue-400/30">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-xl bg-blue-400/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-blue-400 text-2xl">support</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-3">Important Notice</h3>
                <p className="text-blue-200/80 leading-relaxed mb-4">
                  Life Stages provides Scripture-based encouragement and spiritual support. 
                  It is <strong className="text-white">not a substitute for professional mental health care, 
                  medical treatment, or crisis intervention</strong>.
                </p>
                <p className="text-blue-200/80 leading-relaxed mb-5">
                  If you or someone you know is experiencing a mental health crisis or thoughts of 
                  self-harm, please reach out immediately:
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mb-5">
                  <a 
                    href="tel:988" 
                    className="flex items-center gap-3 bg-white/10 rounded-xl p-4 hover:bg-white/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-green-400 text-2xl">call</span>
                    <div>
                      <p className="text-white font-bold">Call or Text 988</p>
                      <p className="text-sm text-blue-200/60">Suicide & Crisis Lifeline</p>
                    </div>
                  </a>
                  <a 
                    href="https://988lifeline.org/chat/" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-white/10 rounded-xl p-4 hover:bg-white/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-cyan-400 text-2xl">chat</span>
                    <div>
                      <p className="text-white font-bold">Chat Online</p>
                      <p className="text-sm text-blue-200/60">988lifeline.org/chat</p>
                    </div>
                  </a>
                </div>
                <p className="text-blue-200/50 text-sm">
                  You can also contact your pastor, a licensed counselor, or call 911 in an emergency. 
                  You are not alone, and help is available.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-blue-200/40 text-sm">
              © 2026 Life Stages AI · A WinTech Partners Venture
            </p>
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push("/church")}
                className="text-amber-400/70 hover:text-amber-400 transition-colors text-sm"
              >
                For Churches
              </button>
              <button
                onClick={() => router.push("/")}
                className="text-blue-400/70 hover:text-blue-400 transition-colors text-sm"
              >
                Try Life Stages
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
