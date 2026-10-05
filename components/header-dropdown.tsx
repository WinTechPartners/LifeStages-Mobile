"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useChurch } from "@/context/church-context"
import { useLanguage } from "@/context/language-context"

interface HeaderDropdownProps {
  verseReference?: string
}

export function HeaderDropdown({ verseReference }: HeaderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { church } = useChurch()
  const { language } = useLanguage()
  const vi = language === "vi"

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleShare = async () => {
    if (navigator.share && verseReference) {
      try {
        await navigator.share({
          title: `Bible for Life Stages - ${verseReference}`,
          text: `Check out this devotional on ${verseReference}`,
          url: window.location.href,
        })
      } catch (err) {
        console.log("Share cancelled or failed")
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
    setIsOpen(false)
  }

  const handleProfile = () => {
    router.push("/profile")
    setIsOpen(false)
  }

  const handleChurchInquiry = () => {
    window.open("mailto:info@lifestagesai.com?subject=Church White-Label Inquiry&body=I'm interested in bringing Bible for Life Stages to my church.%0A%0AChurch Name:%0ACity/State:%0AApproximate Congregation Size:%0A%0APlease tell me more about the white-label program.", "_blank")
    setIsOpen(false)
  }

  const handleInfluencerInquiry = () => {
    window.open("mailto:info@lifestagesai.com?subject=Influencer Partnership Inquiry&body=I'm interested in the influencer partnership program for Bible for Life Stages.%0A%0AName:%0APlatform (YouTube/Instagram/TikTok/etc):%0AFollower Count:%0A%0APlease tell me more about the revenue share program.", "_blank")
    setIsOpen(false)
  }

  const handleReportIssue = () => {
    window.open("mailto:info@lifestagesai.com?subject=Bible for Life Stages - Issue Report", "_blank")
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        aria-label={vi ? "Mở menu" : "Open menu"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
      >
        <span className="material-symbols-outlined">more_vert</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-xl bg-card text-card-foreground border border-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="py-2">
            {church && <p className="px-4 pt-2 pb-1 text-xs text-muted-foreground break-words">{church.name}</p>}
            <button onClick={() => { router.push(church ? "/my-church" : "/connect"); setIsOpen(false) }} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors">
              <span className="material-symbols-outlined text-primary">church</span>
              <span className="font-medium">{church ? (vi ? "Hội thánh & liên hệ lãnh đạo" : "My church & leadership") : (vi ? "Kết nối hội thánh" : "Connect my church")}</span>
            </button>
            <button
              onClick={handleProfile}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-indigo-500">person</span>
              <span className="font-medium">Profile</span>
            </button>

            <button
              onClick={() => {
                router.push("/bible")
                setIsOpen(false)
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-blue-500">menu_book</span>
              <span className="font-medium">Read the Bible</span>
            </button>

            <button
              onClick={handleShare}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-primary">share</span>
              <span className="font-medium">Share</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false)
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-amber-500">bookmark_add</span>
              <span className="font-medium">Save to Favorites</span>
            </button>

            <div className="h-px bg-border my-1 mx-4"></div>

            <button
              onClick={handleChurchInquiry}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-rose-500">church</span>
              <div>
                <span className="font-medium">Get Your Church Involved</span>
                <p className="text-xs text-muted-foreground">White-label for your congregation</p>
              </div>
            </button>

            <button
              onClick={handleInfluencerInquiry}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-pink-500">star</span>
              <div>
                <span className="font-medium">For Influencers</span>
                <p className="text-xs text-muted-foreground">50% revenue share</p>
              </div>
            </button>

            <div className="h-px bg-border my-1 mx-4"></div>

            <button
              onClick={handleReportIssue}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-muted-foreground">flag</span>
              <span className="font-medium">Report Issue</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
