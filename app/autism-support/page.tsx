"use client"


import { apiFetch } from "@/lib/api-base"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDevotional } from "@/context/devotional-context"

export default function AutismSupportPage() {
  const router = useRouter()
  const { devotional } = useDevotional()
  const [reflection, setReflection] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const verse = devotional.verse
    if (!verse) {
      router.push("/")
      return
    }

    const generateReflection = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Get profile data
        let ageRange = "adult"
        let gender = ""
        let stageSituation = ""
        
        try {
          const savedProfile = localStorage.getItem("userProfile")
          if (savedProfile) {
            const parsed = JSON.parse(savedProfile)
            ageRange = parsed.ageRange || "adult"
            gender = parsed.gender || ""
            stageSituation = parsed.stageSituation || ""
          }
        } catch (e) { /* ignore */ }

        const response = await apiFetch("/api/generate-autism-support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verseReference: verse.reference,
            verseText: verse.text,
            ageRange,
            gender,
            stageSituation,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to generate reflection")
        }

        const data = await response.json()
        setReflection(data.reflection)
      } catch (err) {
        console.error("Error generating autism support reflection:", err)
        setError("Unable to generate reflection. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    generateReflection()
  }, [devotional.verse, router])

  const handleTalkAboutThis = () => {
    router.push("/talk?deepDive=true&topic=Autism Family Support")
  }

  if (!devotional.verse) {
    return null
  }

  const reflectionParagraphs = reflection
    ? reflection.split(/\n\n+/).filter((p) => p.trim().length > 0)
    : []

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-gradient-to-b from-blue-50 via-background to-background shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-background/95 backdrop-blur-md p-4 justify-between border-b border-border">
        <button
          onClick={() => router.push("/verse")}
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-base font-bold">Deep Dive</h2>
        <div className="w-10" />
      </div>

      {/* Content */}
      <main className="flex-1 pb-10 px-5 pt-6">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-12 rounded-full bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">family_restroom</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">Autism Family Support</h1>
              <p className="text-sm text-white/80">For your unique journey</p>
            </div>
          </div>
        </div>

        {/* Verse Reference */}
        <div className="bg-card rounded-xl p-4 mb-6 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground mb-2">Today&apos;s Verse</p>
          <p className="font-serif text-lg leading-relaxed mb-2">&ldquo;{devotional.verse.text}&rdquo;</p>
          <p className="text-sm font-semibold text-primary">{devotional.verse.reference}</p>
        </div>

        {/* Reflection */}
        <div className="bg-card rounded-2xl p-6 shadow-lg border border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-lg">favorite</span>
            </div>
            <h2 className="text-lg font-bold">For Your Family</h2>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3 py-4">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-primary/20 animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Creating a reflection just for you...
              </p>
            </div>
          ) : error ? (
            <div className="py-4">
              <p className="text-destructive text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-primary text-sm font-semibold hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="prose max-w-none text-muted-foreground leading-relaxed text-[17px]">
              {reflectionParagraphs.map((paragraph, i) => (
                <p key={i} className="mb-4 last:mb-0">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Encouragement Footer */}
        <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
          <p className="text-sm text-muted-foreground text-center">
            <span className="text-primary font-semibold">You are seen.</span> Your family&apos;s journey matters. 
            God is with you in every moment - the hard ones and the beautiful ones. 💙
          </p>
        </div>

        {/* Do you want to talk about this? Button */}
        <div className="mt-8 mb-4">
          <button
            onClick={handleTalkAboutThis}
            className="w-full bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="size-12 rounded-full bg-white/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">mic</span>
              </div>
              <div className="text-left">
                <p className="text-lg font-bold">Do you want to talk about this?</p>
                <p className="text-sm text-white/80">I&apos;m here to listen</p>
              </div>
            </div>
          </button>
        </div>
      </main>
    </div>
  )
}
