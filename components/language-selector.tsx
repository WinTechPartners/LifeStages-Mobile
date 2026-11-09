"use client"

import { useLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from "@/context/language-context"

interface Props {
  variant?: "compact" | "full"
}

export function LanguageSelector({ variant = "full" }: Props) {
  const { language, setLanguage } = useLanguage()

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap gap-2">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code as LanguageCode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
              lang.code === language
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.displayCode}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code as LanguageCode)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
            lang.code === language
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-800 border-gray-200 hover:border-blue-400 hover:bg-blue-50"
          }`}
        >
          <span className="text-2xl leading-none">{lang.flag}</span>
          <span className="flex-1 font-medium">{lang.nativeName}</span>
          <span className={`text-xs font-semibold tracking-wider ${lang.code === language ? "text-blue-200" : "text-gray-400"}`}>
            {lang.displayCode}
          </span>
        </button>
      ))}
    </div>
  )
}
