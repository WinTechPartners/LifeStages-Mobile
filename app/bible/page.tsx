"use client"


import { apiFetch } from "@/lib/api-base"
import { track, observeForeground } from "@/lib/analytics/client"
import type { AnalyticsScripture } from "@/lib/analytics/contract"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback, useRef } from "react"
import { useSubscription } from "@/context/subscription-context"
import EmailGate from "@/components/email-gate"
import { HeaderDropdown } from "@/components/header-dropdown"
import { useChurch } from "@/context/church-context"
import { resolveScriptureLink } from "@/lib/scripture-link"
import { optionalUuid } from "@/lib/content-context"

interface Book {
  name: string
  id: string
  chapters: number
  bookNumber: number
}

interface Verse {
  number: number
  text: string
}

interface BooksData {
  oldTestament: Book[]
  newTestament: Book[]
  translations: { id: string; name: string; abbr: string }[]
}

type ViewMode = "books" | "chapters" | "reading"

export default function BiblePage() {
  const router = useRouter()
  const { canAccessPremium } = useSubscription()
  const [needsEmail, setNeedsEmail] = useState(false)
  const { church, isLoading: churchLoading } = useChurch()
  const openedLink = useRef(false)
  const linkedVerse = useRef<number | undefined>(undefined)
  const [linkNotice, setLinkNotice] = useState("")
  
  const [viewMode, setViewMode] = useState<ViewMode>("books")
  const [testament, setTestament] = useState<"old" | "new">("old")
  const [booksLoading, setBooksLoading] = useState(true)
  const [booksError, setBooksError] = useState<string | null>(null)
  const [booksData, setBooksData] = useState<BooksData | null>(null)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null)
  const [verses, setVerses] = useState<Verse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [translation, setTranslation] = useState("KJV")
  const [analyticsView, setAnalyticsView] = useState<{ id: string; scripture: AnalyticsScripture; sermonId?: string } | null>(null)
  const [chapterError, setChapterError] = useState("")
  const chapterRequest = useRef(0)
  const chapterViewId = useRef<string | null>(null)
  const displayedViews = useRef(new Set<string>())
  const selectedNumbers = useRef<number[]>([])
  
  // Load translation preference from profile
  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile")
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile)
        if (parsed.bibleTranslation) {
          setTranslation(parsed.bibleTranslation)
        }
      } catch (e) {
        console.error("Error loading translation preference:", e)
      }
    }
  }, [])
  
  // Save translation preference when changed
  const handleTranslationChange = (newTranslation: string) => {
    setTranslation(newTranslation)
    // Save to profile
    const savedProfile = localStorage.getItem("userProfile")
    const profile = savedProfile ? JSON.parse(savedProfile) : {}
    profile.bibleTranslation = newTranslation
    localStorage.setItem("userProfile", JSON.stringify(profile))
    window.dispatchEvent(new Event("lifestages-profile-changed"))
    // Reload chapter if one is selected
    if (selectedBook && selectedChapter) {
      void loadChapter(selectedBook, selectedChapter, newTranslation, analyticsView?.sermonId)
    }
  }
  
  // Selection state for highlight-to-explain
  const [selectedText, setSelectedText] = useState("")
  const [selectedVerseNum, setSelectedVerseNum] = useState<number | null>(null)
  const [showExplainButton, setShowExplainButton] = useState(false)
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 })
  const [explanation, setExplanation] = useState("")
  const [showExplanation, setShowExplanation] = useState(false)
  const [isExplaining, setIsExplaining] = useState(false)
  const [explainError, setExplainError] = useState("")
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  
  const contentRef = useRef<HTMLDivElement>(null)
  const verseRefs = useRef<Map<number, HTMLParagraphElement>>(new Map())

  // Load books on mount
  useEffect(() => {
    setBooksLoading(true)
    setBooksError(null)
    apiFetch("/api/bible?action=books")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        console.log("[Bible] Books loaded:", data?.oldTestament?.length, "OT,", data?.newTestament?.length, "NT")
        setBooksData(data)
      })
      .catch(err => {
        console.error("[Bible] Failed to load books:", err)
        setBooksError(err.message)
      })
      .finally(() => setBooksLoading(false))
  }, [])

  // Load chapter content
  const loadChapter = useCallback(async (book: Book, chapter: number, requestedTranslation = translation, sermonId?: string) => {
    const requestId = ++chapterRequest.current
    setIsLoading(true)
    setIsExplaining(false)
    setChapterError("")
    setAnalyticsView(null)
    chapterViewId.current = null
    selectedNumbers.current = []
    // Clear any selection state when loading new chapter
    setShowExplainButton(false)
    setShowExplanation(false)
    setSelectedText("")
    setSelectedVerseNum(null)
    setVerses([])
    setSelectedBook(book)
    setSelectedChapter(chapter)
    setViewMode("reading")
    
    try {
      const url = `/api/bible?action=read&book=${encodeURIComponent(book.name)}&chapter=${chapter}&version=${encodeURIComponent(requestedTranslation)}`
      const res = await apiFetch(url)
      const data = await res.json()
      if (requestId !== chapterRequest.current) return
      if (!res.ok || data.error || !Array.isArray(data.verses) || !data.verses.length) throw new Error("Chapter unavailable")
      setVerses(data.verses || [])
      setSelectedBook(book)
      setSelectedChapter(chapter)
      setViewMode("reading")
      const id = crypto.randomUUID()
      chapterViewId.current = id
      const canonicalBooks = booksData ? [...booksData.oldTestament, ...booksData.newTestament] : []
      const bookNumber = book.bookNumber || canonicalBooks.findIndex(item => item.id === book.id) + 1
      if (bookNumber > 0) setAnalyticsView({ id, scripture: { book: bookNumber, chapter, translation: requestedTranslation }, sermonId })
    } catch (error) {
      if (requestId === chapterRequest.current) setChapterError(requestedTranslation === "NIV"
        ? "NIV is unavailable from our Bible text provider. Please choose another translation above."
        : "Could not load this chapter. Please try again.")
    }
    if (requestId === chapterRequest.current) setIsLoading(false)
  }, [translation, booksData])

  useEffect(() => {
    if (!booksData || churchLoading || openedLink.current) return
    openedLink.current = true
    const params = new URLSearchParams(window.location.search)
    const reference = params.get('verse')
    if (!reference) return
    const passage = resolveScriptureLink(reference, [...booksData.oldTestament, ...booksData.newTestament])
    if (!passage) { setLinkNotice(`Choose the passage in the Bible below: ${reference}`); return }
    const sermonId = params.get('churchId') === church?.id ? optionalUuid(params.get('sermonId')) : undefined
    linkedVerse.current = passage.firstVerse
    setLinkNotice(`Opened ${reference}. Tap a verse to explore it.`)
    void loadChapter(passage.book, passage.chapter, translation, sermonId)
  }, [booksData, churchLoading, church?.id, loadChapter, translation])

  useEffect(() => {
    if (viewMode !== 'reading' || isLoading || linkedVerse.current === undefined) return
    verseRefs.current.get(linkedVerse.current)?.scrollIntoView({ block: 'center' })
    linkedVerse.current = undefined
  }, [viewMode, isLoading, verses])

  useEffect(() => {
    if (!analyticsView || viewMode !== "reading" || isLoading) return
    const { id: viewId, scripture, sermonId } = analyticsView
    const displayed = () => {
      if (document.visibilityState !== "visible" || displayedViews.current.has(viewId)) return
      displayedViews.current.add(viewId)
      track("chapter_displayed", { viewId, scripture, sermonId, contentType: "bible" })
    }
    displayed()
    document.addEventListener("visibilitychange", displayed)
    const stop = observeForeground({ viewId, scripture, sermonId, contentType: "bible" })
    return () => { stop(); document.removeEventListener("visibilitychange", displayed) }
  }, [analyticsView, viewMode, isLoading])

  // Handle tap/click on verse to select entire verse
  const handleVerseClick = useCallback((verse: Verse, event: React.MouseEvent | React.TouchEvent) => {
    // Don't trigger if user is selecting text manually
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) {
      return
    }

    // Get the verse element
    const verseEl = verseRefs.current.get(verse.number)
    if (!verseEl) return

    // Select the verse text programmatically
    const range = document.createRange()
    
    // Find the text node (skip the verse number span)
    const textNodes = Array.from(verseEl.childNodes).filter(node => node.nodeType === Node.TEXT_NODE)
    if (textNodes.length === 0) return
    
    // Select all text content after the verse number
    range.setStartBefore(textNodes[0])
    range.setEndAfter(textNodes[textNodes.length - 1])
    
    selection?.removeAllRanges()
    selection?.addRange(range)

    // Update state
    setSelectedText(verse.text)
    setSelectedVerseNum(verse.number)
    selectedNumbers.current = [verse.number]
    if (analyticsView) track("verse_selected", { viewId: analyticsView.id, sermonId: analyticsView.sermonId, scripture: { ...analyticsView.scripture, verses: [verse.number] }, contentType: "bible" })
    
    // Position the button near the tap location
    const rect = verseEl.getBoundingClientRect()
    setButtonPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    })
    setShowExplainButton(true)
    setShowExplanation(false)
    setExplanation("")
    setExplainError("")
  }, [analyticsView])

  // Handle text selection - check for selection periodically
  useEffect(() => {
    if (viewMode !== "reading") return

    const checkSelection = () => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()
      
      if (text && text.length > 10 && selection?.anchorNode && selection.focusNode && contentRef.current?.contains(selection.anchorNode) && contentRef.current.contains(selection.focusNode)) {
        try {
          const range = selection?.getRangeAt(0)
          const rect = range?.getBoundingClientRect()
          const numbers = [...verseRefs.current].filter(([, node]) => range?.intersectsNode(node)).map(([number]) => number).sort((a,b) => a-b)
          
          if (rect && rect.width > 0) {
            if (numbers.length && numbers.join(",") !== selectedNumbers.current.join(",") && analyticsView) {
              track("verse_selected", { viewId: analyticsView.id, sermonId: analyticsView.sermonId, scripture: { ...analyticsView.scripture, verses: numbers }, contentType: "bible" })
            }
            selectedNumbers.current = numbers
            setSelectedVerseNum(numbers.length === 1 ? numbers[0] : null)
            setSelectedText(text)
            setButtonPosition({
              x: rect.left + rect.width / 2,
              y: rect.top - 10
            })
            setShowExplainButton(true)
            setShowExplanation(false)
            setExplanation("")
            setExplainError("")
          }
        } catch (e) {
          // Selection might be collapsed
        }
      } else if (!text) {
        // Only hide if we're not showing the explanation
        if (!showExplanation) {
          setShowExplainButton(false)
          setSelectedVerseNum(null)
        }
      }
    }

    // Check on mouse up
    const handleMouseUp = () => {
      setTimeout(checkSelection, 10)
    }

    // Check on touch end
    const handleTouchEnd = () => {
      setTimeout(checkSelection, 100)
    }

    // Check on selection change
    const handleSelectionChange = () => {
      setTimeout(checkSelection, 10)
    }

    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("touchend", handleTouchEnd)
    document.addEventListener("selectionchange", handleSelectionChange)

    return () => {
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("touchend", handleTouchEnd)
      document.removeEventListener("selectionchange", handleSelectionChange)
    }
  }, [viewMode, showExplanation, analyticsView])

  // Explain selected text
  const explainSelection = async () => {
    if (!JSON.parse(localStorage.getItem("userProfile") || "{}").email) {
      setNeedsEmail(true)
      setShowExplainButton(false)
      return
    }

    setIsExplaining(true)
    setExplainError("")
    const explanationViewId = chapterViewId.current
    const scripture = analyticsView && selectedNumbers.current.length
      ? { ...analyticsView.scripture, verses: [...selectedNumbers.current] } : undefined
    if (scripture && explanationViewId) track("explanation_requested", { viewId: explanationViewId, scripture, sermonId: analyticsView?.sermonId, contentType: "bible" })
    
    try {
      const profile = JSON.parse(localStorage.getItem("userProfile") || "{}")
      const reference = selectedVerseNum 
        ? `${selectedBook?.name} ${selectedChapter}:${selectedVerseNum}`
        : `${selectedBook?.name} ${selectedChapter}`
      
      const res = await apiFetch("/api/bible/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedText,
          reference,
          profile,
          ageRange: canAccessPremium ? profile.ageRange || "adult" : "adult",
          language: "en"
        })
      })
      
      const data = await res.json()
      if (explanationViewId !== chapterViewId.current) return
      if (!res.ok || data.error) {
        setExplainError(data.error + (data.details ? `: ${data.details}` : ""))
        setExplanation("")
      } else if (data.explanation) {
        setExplanation(data.explanation)
        setShowExplanation(true)
        setShowExplainButton(false)
        if (scripture && explanationViewId && document.visibilityState === "visible") track("explanation_displayed", { viewId: explanationViewId, scripture, sermonId: analyticsView?.sermonId, contentType: "bible" })
      } else {
        setExplainError("No explanation returned")
      }
    } catch (error) {
      if (explanationViewId !== chapterViewId.current) return
      console.error("[Bible] Failed to explain:", error)
      setExplainError("Network error - please try again")
    }
    setIsExplaining(false)
  }

  // Close explanation
  const closeExplanation = () => {
    setShowExplanation(false)
    setShowExplainButton(false)
    setExplanation("")
    setExplainError("")
    setSelectedText("")
    setSelectedVerseNum(null)
    selectedNumbers.current = []
    window.getSelection()?.removeAllRanges()
  }

  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0 }, [viewMode, selectedChapter])

  const books = testament === "old" ? booksData?.oldTestament : booksData?.newTestament

  return (
    <div className="relative flex h-[100dvh] overflow-hidden w-full flex-col bg-[#0c1929] max-w-md mx-auto shadow-2xl">
      {needsEmail && <div className="fixed inset-0 z-[100] overflow-auto"><EmailGate required onContinue={() => setNeedsEmail(false)}><button onClick={() => setNeedsEmail(false)}>Continue reading</button></EmailGate></div>}
      {/* Header */}
      <header className="relative z-40 flex min-h-16 shrink-0 w-full items-center justify-between px-4 bg-[#0c1929]/95 backdrop-blur-sm border-b border-white/10">
        <button
          onClick={() => {
            chapterRequest.current++
            chapterViewId.current = null
            setIsLoading(false)
            if (viewMode === "reading") setViewMode("chapters")
            else if (viewMode === "chapters") setViewMode("books")
            else router.back()
          }}
          className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        
        <h1 className="text-lg font-bold text-white">
          {viewMode === "books" && "The Bible"}
          {viewMode === "chapters" && selectedBook?.name}
          {viewMode === "reading" && `${selectedBook?.name} ${selectedChapter}`}
        </h1>
        
        {/* Translation Selector */}
        <div className="flex items-center gap-2">
          <select
            value={translation}
            onChange={(e) => handleTranslationChange(e.target.value)}
            className="bg-white/10 text-white text-sm rounded-lg px-2 py-1 border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {booksData?.translations?.map(t => (
              <option key={t.id} value={t.id} className="bg-[#0c1929] text-white">
                {t.abbr}
              </option>
            ))}
          </select>
          <HeaderDropdown verseReference={viewMode === "reading" ? `${selectedBook?.name} ${selectedChapter}` : undefined} />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto pb-8 scroll-pt-4" ref={contentRef}>
        {linkNotice && <p className="p-4 text-blue-100 text-sm" role="status">{linkNotice}</p>}
        {/* BOOKS VIEW */}
        {viewMode === "books" && (
          <div className="p-4">
            {/* Testament Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTestament("old")}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                  testament === "old"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                    : "bg-white/10 text-white/70"
                }`}
              >
                Old Testament
              </button>
              <button
                onClick={() => setTestament("new")}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                  testament === "new"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                    : "bg-white/10 text-white/70"
                }`}
              >
                New Testament
              </button>
            </div>

            {/* Loading State */}
            {booksLoading && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="size-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-blue-200/70">Loading books...</p>
              </div>
            )}

            {/* Error State */}
            {booksError && (
              <div className="flex flex-col items-center justify-center py-20">
                <span className="material-symbols-outlined text-red-400 text-4xl mb-3">error</span>
                <p className="text-red-400">Failed to load: {booksError}</p>
              </div>
            )}

            {/* Book Grid */}
            {!booksLoading && !booksError && (
              <div className="grid grid-cols-2 gap-2">
                {books?.map(book => (
                  <button
                    key={book.id}
                    onClick={() => {
                      setSelectedBook(book)
                      setViewMode("chapters")
                    }}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="size-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-amber-400 text-lg">
                        {testament === "old" ? "auto_stories" : "menu_book"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{book.name}</p>
                      <p className="text-blue-200/50 text-xs">{book.chapters} chapters</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHAPTERS VIEW */}
        {viewMode === "chapters" && selectedBook && (
          <div className="p-4">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(chapter => (
                <button
                  key={chapter}
                  onClick={() => loadChapter(selectedBook, chapter)}
                  disabled={isLoading}
                  className="aspect-square flex items-center justify-center bg-white/5 rounded-xl border border-white/10 hover:bg-amber-500/20 hover:border-amber-500/40 transition-colors text-white font-medium disabled:opacity-50"
                >
                  {chapter}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* READING VIEW */}
        {viewMode === "reading" && (
          <div className="p-5 select-text">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="size-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-blue-200/70">Loading chapter...</p>
              </div>
            ) : chapterError ? (
              <p role="alert" className="text-center text-blue-200 py-10">{chapterError}</p>
            ) : (
              <div className="space-y-4">
                {/* Hint */}
                <p className="text-center text-blue-200/40 text-xs mb-4">
                  💡 Tap a verse or highlight text for explanations
                </p>
                
                {verses.length === 0 && (
                  <p className="text-center text-blue-200/50 py-10">No verses found</p>
                )}
                {verses.map(verse => (
                  <p 
                    key={verse.number} 
                    ref={el => {
                      if (el) verseRefs.current.set(verse.number, el)
                      else verseRefs.current.delete(verse.number)
                    }}
                    onClick={(e) => handleVerseClick(verse, e)}
                    className={`whitespace-pre-line text-blue-100/90 text-[17px] leading-relaxed cursor-pointer rounded-lg px-2 py-1 -mx-2 transition-colors ${
                      selectedVerseNum === verse.number 
                        ? "bg-amber-500/20 border-l-2 border-amber-400" 
                        : "hover:bg-white/5 active:bg-amber-500/10"
                    }`}
                  >
                    <span className="text-amber-400 font-bold text-sm mr-2 align-super select-none">
                      {verse.number}
                    </span>
                    {verse.text}
                  </p>
                ))}
                
                {/* Navigation */}
                <div className="flex justify-between items-center pt-8 pb-4 border-t border-white/10">
                  <button
                    onClick={() => {
                      if (selectedChapter && selectedChapter > 1) {
                        loadChapter(selectedBook!, selectedChapter - 1)
                      }
                    }}
                    disabled={!selectedChapter || selectedChapter <= 1}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                    Previous
                  </button>
                  
                  <button
                    onClick={() => {
                      if (selectedChapter && selectedBook && selectedChapter < selectedBook.chapters) {
                        loadChapter(selectedBook, selectedChapter + 1)
                      }
                    }}
                    disabled={!selectedChapter || !selectedBook || selectedChapter >= selectedBook.chapters}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Explain Button - appears when text is selected */}
      {showExplainButton && !showExplanation && (
        <div
          className="fixed z-50 transform -translate-x-1/2 animate-in fade-in zoom-in-95 duration-200"
          style={{
            left: Math.min(Math.max(buttonPosition.x, 80), window.innerWidth - 80),
            top: Math.max(buttonPosition.y - 50, 70)
          }}
        >
          <button
            onClick={explainSelection}
            disabled={isExplaining}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-xl font-medium text-sm whitespace-nowrap border-2 border-amber-300/30"
          >
            {isExplaining ? (
              <>
                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Explaining...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
                Explain This
              </>
            )}
          </button>
          {explainError && (
            <p className="text-red-400 text-xs mt-1 text-center bg-black/50 rounded px-2 py-1">{explainError}</p>
          )}
        </div>
      )}

      {/* Explanation Panel - slides up from bottom */}
      {showExplanation && explanation && (
        <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto animate-in slide-in-from-bottom duration-300">
          <div className="bg-[#1a2a3d] rounded-t-3xl shadow-2xl border-t border-x border-white/10 p-5 pb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">auto_awesome</span>
                <span className="text-amber-400 font-semibold">Friendly Version</span>
              </div>
              <button
                onClick={closeExplanation}
                className="text-white/50 hover:text-white p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-blue-100/90 text-sm leading-relaxed">{explanation}</p>
          </div>
        </div>
      )}

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a2a3d] rounded-2xl p-6 max-w-sm w-full border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-2xl">auto_awesome</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Premium Feature</h3>
                <p className="text-blue-200/70 text-sm">Unlock instant verse explanations</p>
              </div>
            </div>
            
            <p className="text-blue-100/80 text-sm mb-5">
              Highlight any verse and get a friendly, personalized explanation tailored to your life stage.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradePrompt(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium"
              >
                Maybe Later
              </button>
              <button
                onClick={() => router.push("/subscription")}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold"
              >
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
