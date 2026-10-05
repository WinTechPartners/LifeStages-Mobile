"use client"

import { useState, useRef, useEffect } from "react"
import { useLanguage, SUPPORTED_LANGUAGES } from "@/context/language-context"

interface LanguageSelectorProps {
  variant?: "compact" | "full"
}

export function LanguageSelector({ variant = "compact" }: LanguageSelectorProps) {
  const { language, setLanguage, currentLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (variant === "full") {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          aria-label="Choose language"
        onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card h-14 px-4 text-base font-normal shadow-sm transition-all hover:bg-muted"
        >
          <span className="flex items-center gap-3">
            <span className="text-xl">{currentLanguage.flag}</span>
            <span>{currentLanguage.nativeName}</span>
          </span>
          <span className="material-symbols-outlined text-muted-foreground">
            {isOpen ? "expand_less" : "expand_more"}
          </span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-card shadow-lg z-50 max-h-64 overflow-y-auto">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code)
                  setIsOpen(false)
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors ${
                  language === lang.code ? "bg-primary/10 text-primary" : ""
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="flex-1">{lang.nativeName}</span>
                {language === lang.code && <span className="material-symbols-outlined text-primary">check</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Compact version for header
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        aria-label="Choose language"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors border border-white/20"
      >
        <span className="text-base">{currentLanguage.flag}</span>
        <span className="text-xs font-medium">{currentLanguage.code.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 rounded-xl border border-white/20 bg-[#0c1929]/95 backdrop-blur-md shadow-lg z-50 min-w-[180px] max-h-64 overflow-y-auto">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code)
                setIsOpen(false)
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-white hover:bg-white/10 transition-colors ${
                language === lang.code ? "bg-amber-500/20" : ""
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1 text-sm">{lang.nativeName}</span>
              {language === lang.code && (
                <span className="material-symbols-outlined text-amber-400 text-sm">check</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
