"use client"


import { PremiumGate } from "@/components/premium-gate"
import { apiFetch } from "@/lib/api-base"
import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useDevotional } from "@/context/devotional-context"
import { HeaderDropdown } from "@/components/header-dropdown"
import { useChurch } from "@/context/church-context"
import { useLanguage } from "@/context/language-context"
import { contentCacheKey, optionalUuid } from "@/lib/content-context"
import { isLifeLineId } from "@/lib/lifelines"
import { track } from "@/lib/analytics/client"
import { ContentContextBoundary } from "@/components/content-context-boundary"

interface Message {
  id: number
  sender: string
  text: string
}

interface UserProfile {
  fullName?: string
  ageRange?: string
  gender?: string
  stageSituation?: string
}

function TalkContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { devotional } = useDevotional()
  const { church, isLoading: churchLoading } = useChurch()
  const { language } = useLanguage()
  
  const isSermonMode = searchParams.get('context') === 'sermon'
  const sermonTitle = searchParams.get('title') || ''
  const sermonSummary = searchParams.get('summary') || ''
  const sermonId = isSermonMode ? optionalUuid(searchParams.get('sermonId')) : undefined
  const verseReference = isSermonMode ? sermonTitle : devotional.verse?.reference || "General"
  const verseText = isSermonMode ? sermonSummary : devotional.verse?.text || ""
  
  // Check if this is a Deep Dive conversation
  const isDeepDive = searchParams.get("deepDive") === "true"
  const deepDiveTopic = searchParams.get("topic") || ""
  const selectedLifeLine = searchParams.get('lifelineId')
  const topicId = isLifeLineId(selectedLifeLine) ? selectedLifeLine : undefined
  const storageKey = contentCacheKey('chat', JSON.stringify([
    isSermonMode ? 'sermon' : 'verse', sermonId || verseReference, topicId || deepDiveTopic,
  ]), church?.id, language)

  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loadedHistoryKey, setLoadedHistoryKey] = useState<string | null>(null)
  const requestInFlight = useRef(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load user profile
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("userProfile")
      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile))
      }
    } catch (e) { /* ignore */ }
  }, [])

  // Generate initial message based on context
  const getInitialMessage = useCallback(() => {
    const name = userProfile?.fullName?.split(" ")[0] || ""
    const greeting = name ? `Hey ${name}!` : "Hey!"
    if (isSermonMode) {
      return { id: 1, sender: 'Study Buddy', text: `${greeting} We're reflecting on "${sermonTitle}." What stood out to you, or what would you like to talk through?` }
    }
    
    if (isDeepDive && deepDiveTopic) {
      return {
        id: 1,
        sender: "Study Buddy",
        text: `${greeting} I can see you tapped on "${deepDiveTopic}." I'm here. Whatever's on your heart right now - I'm listening. What's going on?`,
      }
    }
    
    return {
      id: 1,
      sender: "Study Buddy",
      text: `${greeting} So we're looking at ${verseReference} today. I'd love to hear what stands out to you - what's on your mind about this verse?`,
    }
  }, [userProfile, isDeepDive, deepDiveTopic, verseReference, isSermonMode, sermonTitle])

  // Load chat history
  useEffect(() => {
    if (churchLoading) return
    let history: Message[] = [getInitialMessage()]
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
      if (Array.isArray(saved) && saved.every(m => typeof m.text === 'string' && typeof m.sender === 'string')) history = saved
    } catch { /* Ignore damaged or unavailable local history. */ }
    setMessages(history)
    setLoadedHistoryKey(storageKey)
  }, [storageKey, churchLoading, getInitialMessage])

  // Save chat history
  useEffect(() => {
    if (!churchLoading && loadedHistoryKey === storageKey && messages.length > 0) {
      try { localStorage.setItem(storageKey, JSON.stringify(messages)) } catch { /* optional local history */ }
    }
  }, [messages, storageKey, loadedHistoryKey, churchLoading])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  // Send message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || requestInFlight.current || churchLoading) return
    requestInFlight.current = true

    const newUserMsg: Message = {
      id: Date.now(),
      sender: "Me",
      text: inputValue,
    }

    setMessages((prev) => [...prev, newUserMsg])
    setInputValue("")
    setIsTyping(true)
    // This is the selected LifeLine context, never a classification of the private message.
    track('question_sent', { channel: 'chat', topicId, sermonId })

    try {
      const response = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputValue,
          verseReference,
          verseText,
          history: messages.slice(-10),
          userProfile,
          isDeepDive,
          deepDiveTopic,
          sermonId,
          source: isSermonMode ? 'sermon' : 'verse',
          lifelineId: topicId,
        }),
      })

      if (!response.ok) throw new Error("Chat failed")

      const data = await response.json()

      const aiResponse: Message = {
        id: Date.now() + 1,
        sender: "Study Buddy",
        text: data.response,
      }
      setMessages((prev) => [...prev, aiResponse])
    } catch (error) {
      console.error("Chat error", error)
      const errorMsg: Message = {
        id: Date.now() + 1,
        sender: "Study Buddy",
        text: "Oops, something went wrong on my end. Mind trying that again?",
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      requestInFlight.current = false
      setIsTyping(false)
    }
  }

  const clearHistory = () => {
    try { localStorage.removeItem(storageKey) } catch { /* optional local history */ }
    setMessages([getInitialMessage()])
    setDropdownOpen(false)
  }

  const suggestedTopics = isDeepDive ? [
    { icon: "favorite", text: "This is really hard today" },
    { icon: "psychology", text: "I need to process something" },
    { icon: "self_improvement", text: "Help me find peace" },
  ] : [
    { icon: "history_edu", text: "What's the backstory?" },
    { icon: "person_check", text: "How does this apply to me?" },
    { icon: "auto_stories", text: "Any related verses?" },
  ]

  // Header color based on mode
  const headerGradient = isDeepDive 
    ? "from-blue-600 to-purple-600"
    : "from-indigo-500 to-violet-500"

  return (
    <div className="relative flex h-full w-full flex-col bg-[#0c1929] max-w-md mx-auto shadow-2xl overflow-hidden rounded-xl border border-white/10">
      {/* Header */}
      <header className="flex items-center bg-white/5 p-4 pb-3 justify-between border-b border-white/10 z-20 shrink-0">
        <button
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center cursor-pointer text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="flex-1 text-center">
          <h2 className={`text-lg font-bold leading-tight tracking-[-0.015em] ${isDeepDive ? "text-purple-400" : "text-indigo-400"}`}>
            {isDeepDive ? "Lifelines" : "Let's Chat"}
          </h2>
          {isDeepDive && (
            <p className="text-xs text-blue-200/70">{deepDiveTopic}</p>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">more_vert</span>
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-12 w-56 bg-[#1a2a3d] rounded-xl shadow-xl border border-white/10 z-50 p-1">
              <button
                onClick={() => {
                  router.push("/profile")
                  setDropdownOpen(false)
                }}
                className="w-full text-left block px-4 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-base text-indigo-400">person</span>
                Profile
              </button>
              <button
                onClick={() => {
                  router.push("/bible")
                  setDropdownOpen(false)
                }}
                className="w-full text-left block px-4 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-base text-blue-400">menu_book</span>
                Read the Bible
              </button>
              <div className="h-px bg-white/10 my-1 mx-3"></div>
              <button
                onClick={() => {
                  window.open("mailto:info@lifestagesai.com?subject=Church White-Label Inquiry", "_blank")
                  setDropdownOpen(false)
                }}
                className="w-full text-left block px-4 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-base text-rose-400">church</span>
                <div>
                  <span>Get Your Church Involved</span>
                  <p className="text-xs text-white/50">White-label for your congregation</p>
                </div>
              </button>
              <button
                onClick={() => {
                  window.open("mailto:info@lifestagesai.com?subject=Influencer Partnership Inquiry", "_blank")
                  setDropdownOpen(false)
                }}
                className="w-full text-left block px-4 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-base text-pink-400">star</span>
                <div>
                  <span>For Influencers</span>
                  <p className="text-xs text-white/50">50% revenue share</p>
                </div>
              </button>
              <div className="h-px bg-white/10 my-1 mx-3"></div>
              <button
                onClick={clearHistory}
                className="w-full text-left block px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-3"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                Start Fresh
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-blue-200">Voice Chat: Coming Soon — Premium Plus</p>
      </header>

      {/* Messages */}
      <main className="flex-1 flex flex-col overflow-y-auto p-4 space-y-6 pb-24 scroll-smooth">
        <div className="flex justify-center w-full">
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${isDeepDive ? "bg-purple-500/20 text-purple-400" : "bg-indigo-500/20 text-indigo-400"}`}>
            Today
          </span>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-3 ${msg.sender === "Me" ? "justify-end" : ""}`}>
            {msg.sender !== "Me" && (
              <div className={`size-8 rounded-full bg-gradient-to-br ${headerGradient} flex items-center justify-center text-white shrink-0`}>
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
              </div>
            )}

            <div className={`flex flex-1 flex-col gap-1 ${msg.sender === "Me" ? "items-end" : "items-start"}`}>
              <p className="text-blue-200/50 text-[11px] font-medium leading-normal ml-1 mr-1">{msg.sender}</p>
              <div
                className={`relative max-w-[85%] px-4 py-3 shadow-sm ${
                  msg.sender === "Me"
                    ? `bg-gradient-to-br ${headerGradient} text-white rounded-2xl rounded-br-none shadow-md`
                    : `bg-white/10 text-white rounded-2xl rounded-bl-none border border-white/10`
                }`}
              >
                <p className="text-sm sm:text-base font-normal leading-relaxed">{msg.text}</p>
              </div>
            </div>

            {msg.sender === "Me" && (
              <div className="size-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-sm text-white/70">person</span>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-3">
            <div className={`size-8 rounded-full bg-gradient-to-br ${headerGradient} flex items-center justify-center text-white shrink-0`}>
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
            </div>
            <div className={`relative px-4 py-3 bg-white/10 rounded-2xl rounded-bl-none border border-white/10`}>
              <div className="flex gap-1">
                <span className={`w-1.5 h-1.5 ${isDeepDive ? "bg-purple-400" : "bg-indigo-400"} rounded-full animate-bounce`}></span>
                <span className={`w-1.5 h-1.5 ${isDeepDive ? "bg-purple-400" : "bg-indigo-400"} rounded-full animate-bounce [animation-delay:75ms]`}></span>
                <span className={`w-1.5 h-1.5 ${isDeepDive ? "bg-purple-400" : "bg-indigo-400"} rounded-full animate-bounce [animation-delay:150ms]`}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />

        {/* Suggested Topics */}
        <div className="flex flex-col gap-2 pt-2">
          <p className={`text-xs text-center uppercase tracking-wider font-semibold ${isDeepDive ? "text-purple-400" : "text-indigo-400"}`}>
            {isDeepDive ? "You might say..." : "Need inspiration?"}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 px-1 snap-x scrollbar-hide justify-start sm:justify-center">
            {suggestedTopics.map((chip, i) => (
              <button
                key={i}
                onClick={() => setInputValue(chip.text)}
                className={`flex shrink-0 items-center justify-center gap-x-2 rounded-full border bg-white/5 pl-4 pr-4 py-2 hover:bg-white/10 transition-colors snap-center ${isDeepDive ? "border-purple-500/30" : "border-indigo-500/30"}`}
              >
                <span className={`material-symbols-outlined text-[18px] ${isDeepDive ? "text-purple-400" : "text-indigo-400"}`}>{chip.icon}</span>
                <span className="text-xs font-medium text-white">{chip.text}</span>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Input Area */}
      <div className="shrink-0 bg-white/5 border-t border-white/10 p-3 pb-6 sm:pb-3 w-full z-20">
        <div className="flex items-end gap-2 w-full max-w-[480px] mx-auto">
          <div className={`flex-1 min-h-[44px] bg-white/10 rounded-2xl flex items-center px-4 py-2 border border-transparent focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all ${isDeepDive ? "focus-within:border-purple-400 focus-within:ring-purple-400" : ""}`}>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="w-full bg-transparent border-none p-0 placeholder-white/50 text-white focus:ring-0 text-base leading-normal outline-none"
              placeholder="What's on your mind?"
              type="text"
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className={`flex items-center justify-center size-11 rounded-full bg-gradient-to-br ${headerGradient} text-white shadow-lg hover:opacity-90 active:scale-95 transition-all shrink-0 disabled:opacity-50 disabled:active:scale-100`}
          >
            <span className="material-symbols-outlined text-[24px]">send</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="relative flex h-full w-full flex-col bg-[#0c1929] max-w-md mx-auto shadow-2xl overflow-hidden rounded-xl border border-white/10">
      <div className="flex items-center justify-center flex-1">
        <div className="size-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  )
}

export default function TalkPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PremiumGate><ContentContextBoundary><TalkContent /></ContentContextBoundary></PremiumGate>
    </Suspense>
  )
}
