"use client"

import { useState, useRef, useEffect } from "react"
import { useLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from "@/context/language-context"

interface Props {
  variant?: "light" | "dark"
  className?: string
}

export function LanguageDropdown({ variant = "dark", className = "" }: Props) {
  const { language, setLanguage, currentLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const isDark = variant === "dark"
  const btnBg = isDark
    ? "bg-white/10 hover:bg-white/20 text-white border-white/20"
    : "bg-black/5 hover:bg-black/10 text-gray-800 border-gray-200"
  const menuBg = isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
  const itemHover = isDark ? "hover:bg-white/10 text-white" : "hover:bg-gray-50 text-gray-800"
  const activeItem = isDark ? "bg-white/15 text-white" : "bg-blue-50 text-blue-700"

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm font-medium transition-colors ${btnBg}`}
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-base leading-none">{currentLanguage.flag}</span>
        <span className="font-semibold tracking-wide text-xs">{currentLanguage.displayCode}</span>
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute right-0 mt-1.5 w-52 rounded-xl border shadow-xl z-50 overflow-hidden ${menuBg}`}
          role="listbox"
          aria-label="Language options"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              role="option"
              aria-selected={lang.code === language}
              onClick={() => {
                setLanguage(lang.code as LanguageCode)
                setOpen(false)
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                lang.code === language ? activeItem : itemHover
              }`}
            >
              <span className="text-lg leading-none w-6 text-center">{lang.flag}</span>
              <span className="flex-1 text-left font-medium">{lang.nativeName}</span>
              <span className="text-xs font-semibold tracking-wider opacity-60">{lang.displayCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
