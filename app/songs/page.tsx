"use client"


import { apiFetch } from "@/lib/api-base"
import { useRouter, useSearchParams } from "next/navigation"
import { useDevotional } from "@/context/devotional-context"
import { useEffect, useRef, useState } from "react"
import { HeaderDropdown } from "@/components/header-dropdown"
import { useChurch } from "@/context/church-context"
import { useLanguage } from "@/context/language-context"
import { contentCacheKey, optionalUuid } from "@/lib/content-context"
import { useContentDisplay } from "@/lib/use-content-display"
import { ContentContextBoundary } from "@/components/content-context-boundary"

function SongsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { devotional } = useDevotional()
  const { church } = useChurch()
  const { language } = useLanguage()
  const mainRef = useRef<HTMLDivElement>(null)
  const [songType, setSongType] = useState<"classics" | "original">("classics")
  const [sermonSong, setSermonSong] = useState<any>(null)
  const [classicSongs, setClassicSongs] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError,setSearchError]=useState(false)

  // Check if we're in sermon mode
  const isSermonMode = searchParams.get('source') === 'sermon'
  const sermonTitle = searchParams.get('title') || ''
  const sermonSummary = searchParams.get('summary') || ''
  const sermonId = isSermonMode ? optionalUuid(searchParams.get('sermonId')) : undefined
  const contentId = isSermonMode ? sermonId || JSON.stringify([sermonTitle, sermonSummary]) : devotional.verse?.reference || ''
  const scopedCache = (kind: string) => contentCacheKey(kind, contentId, church?.id, language)

  const originalSong = isSermonMode ? sermonSong : (devotional.songs || {})
  const sourceReference = isSermonMode ? sermonTitle : devotional.verse?.reference
  useContentDisplay(songType === 'classics' ? !isSearching && classicSongs.some(song => !!song?.title) : !!originalSong?.title, scopedCache('songs_' + songType), 'songs', sermonId)

  useEffect(() => {
    window.scrollTo(0, 0)
    mainRef.current?.scrollTo(0, 0)
  }, [])

  // Search for classic songs
  useEffect(() => {
    if (sourceReference && songType === "classics" && classicSongs.length === 0 && !isSearching) {
      searchClassicSongs()
    }
  }, [songType, sourceReference, language])

  // Generate original song when in sermon mode
  useEffect(() => {
    if (isSermonMode && sermonTitle && !sermonSong && !isGenerating && songType === "original") {
      generateSermonSong()
    }
  }, [isSermonMode, sermonTitle, songType])

  const searchClassicSongs = async () => {
    setIsSearching(true)
    setSearchError(false)
    try {
      const searchTerm = isSermonMode ? sermonTitle : (devotional.verse?.reference || "faith hope")
      const cacheKey = scopedCache('classic_songs')
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const data = JSON.parse(cached)
          if (data.songs?.length > 0) {
            setClassicSongs(data.songs)
            setIsSearching(false)
            return
          }
        } catch (e) {
          localStorage.removeItem(cacheKey)
        }
      }

      const response = await apiFetch("/api/search-classic-songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: isSermonMode ? sermonTitle : devotional.verse?.reference,
          context: isSermonMode ? sermonSummary : devotional.verse?.text,
        }),
      })

      if (!response.ok) throw new Error("Source catalog unavailable")
      if (response.ok) {
        const data = await response.json()
        setClassicSongs(data.songs || [])
        localStorage.setItem(cacheKey, JSON.stringify({ songs: data.songs }))
      }
    } catch (error) {
      setSearchError(true)
      console.error("Error searching classic songs:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const generateSermonSong = async () => {
    setIsGenerating(true)
    try {
      const cacheKey = scopedCache('sermon_songs')
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const data = JSON.parse(cached)
          if (data.songs?.title) {
            setSermonSong(data.songs)
            setIsGenerating(false)
            return
          }
        } catch (e) {
          localStorage.removeItem(cacheKey)
        }
      }

      const response = await apiFetch("/api/generate-songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "sermon",
          sermonTitle,
          sermonSummary,
          sermonId,
          churchId: church?.id,
          language,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSermonSong(data.songs || {})
        localStorage.setItem(cacheKey, JSON.stringify({ songs: data.songs }))
      }
    } catch (error) {
      console.error("Error generating sermon song:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyAndOpenSuno = () => {
    if (originalSong?.prompt) {
      navigator.clipboard.writeText(originalSong.prompt)
      window.open("https://suno.ai", "_blank")
    }
  }

  const openSongLink = (url: string) => {
    window.open(url, "_blank")
  }

  return (
    <div
      ref={mainRef}
      className="w-full max-w-md mx-auto flex flex-col min-h-screen relative overflow-x-hidden shadow-2xl bg-[#0c1929]"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between bg-[#0c1929]/95 backdrop-blur-md border-b border-white/10">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center size-10 rounded-full text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
        </button>
        <span className="text-sm font-bold tracking-wide uppercase text-rose-400">Worship Music</span>
        <HeaderDropdown verseReference={sourceReference} />
      </header>

      <div role="status">{searchError && <button onClick={()=>searchClassicSongs()}>Unable to load recommendations. Try again</button>}</div>
      <main className="flex-1 flex flex-col p-5 gap-5">
        {/* Source Reference */}
        <div className="text-center">
          <p className="text-rose-400 font-medium text-sm">{sourceReference}</p>
          {isSermonMode && (
            <span className="text-xs text-rose-300/60">From the sermon</span>
          )}
        </div>

        {/* Song Type Toggle - Classics vs Original */}
        <div className="flex bg-white/10 rounded-xl p-1">
          <button
            onClick={() => setSongType("classics")}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              songType === "classics" ? "bg-rose-500 text-white shadow-md" : "text-white/70 hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-base">library_music</span>
            Classic Hymns
          </button>
          <button
            onClick={() => setSongType("original")}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              songType === "original" ? "bg-rose-500 text-white shadow-md" : "text-white/70 hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            AI Original
          </button>
        </div>

        {songType === "classics" ? (
          // Classic Songs View
          isSearching ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-2xl border border-white/10">
              <div className="size-12 rounded-full bg-rose-500/20 flex items-center justify-center mb-4 animate-pulse">
                <span className="material-symbols-outlined text-rose-400">search</span>
              </div>
              <p className="text-blue-200/70">Finding worship songs...</p>
            </div>
          ) : classicSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-2xl border border-white/10">
              <div className="size-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-amber-400">info</span>
              </div>
              <p className="text-blue-200/70 text-center px-6">No classic songs found. Try creating an original!</p>
              <button
                onClick={() => setSongType("original")}
                className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-full text-sm font-semibold"
              >
                Create Original
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {classicSongs.map((song, idx) => (
                <div key={idx} className="bg-white/5 rounded-2xl overflow-hidden border border-white/10">
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="size-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white shrink-0">
                        <span className="material-symbols-outlined">music_note</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white text-lg">{song.title}</h3>
                        {song.artist && (
                          <p className="text-xs text-rose-400/70">{song.artist}</p>
                        )}
                        {song.year && (
                          <p className="text-xs text-white/40">{song.year}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-blue-100/70 text-sm mt-3 leading-relaxed">{song.why}</p>
                    
                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4">
                      {song.spotifyUrl && (
                        <button
                          onClick={() => openSongLink(song.spotifyUrl)}
                          className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                        >
                          <span className="text-lg">🎵</span>
                          Spotify
                        </button>
                      )}
                      {song.youtubeUrl && (
                        <button
                          onClick={() => openSongLink(song.youtubeUrl)}
                          className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                        >
                          <span className="text-lg">▶️</span>
                          YouTube
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Original AI Song View
          <>
            {/* Album Art */}
            <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl relative group ring-1 ring-white/10 bg-gradient-to-br from-rose-900/30 to-pink-900/30">
              {originalSong?.img ? (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('${originalSong.img}')` }}
                ></div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                  <span className="material-symbols-outlined text-rose-500/50 text-6xl">music_note</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c1929]/60 via-transparent to-transparent opacity-60"></div>
              <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-white">graphic_eq</span>
              </div>
            </div>

            {/* Song Info */}
            <div className="flex flex-col items-center text-center gap-1">
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">
                {originalSong?.title || (isGenerating ? "Composing..." : "Generating song...")}
              </h1>
              <p className="text-rose-400 font-medium text-sm tracking-wide">
                {originalSong?.sub && `${originalSong.sub}`}
              </p>
            </div>

            {/* Generate Music Card */}
            {originalSong?.prompt && (
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-400">
                    <span className="material-symbols-outlined text-[20px]">music_note</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Create Your Version</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    AI Prompt
                  </span>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-blue-100/80 text-sm font-serif italic leading-relaxed">
                    &quot;{originalSong.prompt}&quot;
                  </p>
                </div>
                <button
                  onClick={copyAndOpenSuno}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-12 px-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm font-bold leading-normal transition-all active:scale-[0.98] shadow-lg"
                >
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  <span className="truncate">Copy Prompt & Open Suno</span>
                  <span className="material-symbols-outlined text-[16px] opacity-70">open_in_new</span>
                </button>
              </div>
            )}

            {/* Lyrics */}
            {originalSong?.lyrics && (
              <div className="flex flex-col items-center gap-6 pt-2 pb-10">
                <div className="h-px w-16 bg-white/20 rounded-full"></div>
                <div className="text-center space-y-8 max-w-xs mx-auto">
                  <div className="space-y-3">
                    <p className="font-serif text-lg leading-loose text-blue-100/80 whitespace-pre-line">{originalSong.lyrics}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading state */}
            {!originalSong?.title && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="size-12 rounded-full bg-rose-500/20 flex items-center justify-center mb-4 animate-pulse">
                  <span className="material-symbols-outlined text-rose-400">music_note</span>
                </div>
                <p className="text-blue-200/70">
                  {isGenerating ? "Composing song from sermon..." : "Composing your song..."}
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default function SongsPage() {
  return <ContentContextBoundary><SongsContent /></ContentContextBoundary>
}
