"use client"
import { AppImage } from "@/components/app-image"


import { apiFetch } from "@/lib/api-base"
import { useRouter, useSearchParams } from "next/navigation"
import { useDevotional } from "@/context/devotional-context"
import { useEffect, useRef, useMemo, useState } from "react"
import { HeaderDropdown } from "@/components/header-dropdown"
import { useChurch } from "@/context/church-context"
import { useLanguage } from "@/context/language-context"
import { contentCacheKey, optionalUuid } from "@/lib/content-context"
import { useContentDisplay } from "@/lib/use-content-display"
import { ContentContextBoundary } from "@/components/content-context-boundary"

function ImageryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { devotional } = useDevotional()
  const [imageOverrides,setImageOverrides]=useState<Record<string,any>>({})
  const { church } = useChurch()
  const { language } = useLanguage()
  const mainRef = useRef<HTMLDivElement>(null)
  const [sermonImagery, setSermonImagery] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  // Check if we're in sermon mode
  const isSermonMode = searchParams.get('source') === 'sermon'
  const sermonTitle = searchParams.get('title') || ''
  const sermonSummary = searchParams.get('summary') || ''
  const sermonId = isSermonMode ? optionalUuid(searchParams.get('sermonId')) : undefined
  const contentId = isSermonMode ? sermonId || JSON.stringify([sermonTitle, sermonSummary]) : devotional.verse?.reference || ''
  const scopedCache = (kind: string) => contentCacheKey(kind, contentId, church?.id, language)

  const imagery = (isSermonMode ? sermonImagery : (devotional.imagery || [])).map(item=>({...item,...imageOverrides[item.imagePrompt||item.title]}))
  const retryIllustration=async(item:any)=>{const key=item.imagePrompt||item.title;setImageOverrides(prev=>({...prev,[key]:{img:null,imageErrors:[],retrying:true}}));try{const response=await apiFetch('/api/generate-image',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(120000),body:JSON.stringify({prompt:item.imagePrompt,width:768,height:512,language})});const data=await response.json();if(!response.ok||!data.imageUrl)throw Error('Unavailable');setImageOverrides(prev=>({...prev,[key]:{img:data.imageUrl,imageErrors:[],retrying:false}}))}catch{setImageOverrides(prev=>({...prev,[key]:{img:null,imageErrors:['img'],retrying:false}}))}}

  useContentDisplay(imagery.some(item => !!item?.title || !!item?.img), scopedCache('imagery'), 'imagery', sermonId)

  useEffect(() => {
    window.scrollTo(0, 0)
    mainRef.current?.scrollTo(0, 0)
  }, [])

  // Generate sermon imagery when in sermon mode
  useEffect(() => {
    if (isSermonMode && sermonTitle && sermonImagery.length === 0 && !isGenerating) {
      generateSermonImagery()
    }
  }, [isSermonMode, sermonTitle])

  const generateSermonImagery = async () => {
    setIsGenerating(true)
    try {
      // Check cache first
      const cacheKey = scopedCache('sermon_imagery')
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const data = JSON.parse(cached)
          if (data.imagery?.length > 0) {
            setSermonImagery(data.imagery)
            setIsGenerating(false)
            return
          }
        } catch (e) {
          localStorage.removeItem(cacheKey)
        }
      }

      const response = await apiFetch("/api/generate-imagery", {
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
        setSermonImagery(data.imagery || [])
        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify({ imagery: data.imagery }))
      }
    } catch (error) {
      console.error("Error generating sermon imagery:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const allImages = useMemo(() => {
    if (isSermonMode) {
      // For sermon mode, just return the sermon imagery
      return sermonImagery.map((item, i) => ({
        src: item.img,
        title: item.title || `Symbol ${i + 1}`,
        source: "Sermon"
      })).filter(img => img.src)
    }

    // Original verse mode - collect from all sources
    const images: Array<{ src: string; title: string; source: string }> = []

    if (devotional.heroImage) {
      images.push({ src: devotional.heroImage, title: "Verse Hero", source: "Interpretation" })
    }

    if (devotional.contextHeroImage) {
      images.push({ src: devotional.contextHeroImage, title: "Historical Context", source: "Context" })
    }

    if (devotional.stories) {
      devotional.stories.forEach((story, i) => {
        if (story.img) {
          images.push({ src: story.img, title: story.title || `Story ${i + 1}`, source: "Stories" })
        }
      })
    }

    if (devotional.poetry) {
      devotional.poetry.forEach((poem, i) => {
        if (poem.img) {
          images.push({ src: poem.img, title: poem.title || `Poem ${i + 1}`, source: "Poetry" })
        }
      })
    }

    if (devotional.songs?.img) {
      images.push({ src: devotional.songs.img, title: devotional.songs.title || "Worship Song", source: "Songs" })
    }

    imagery.forEach((item, i) => {
      if (item.img) {
        images.push({ src: item.img, title: item.title || `Symbol ${i + 1}`, source: "Imagery" })
      }
    })

    return images
  }, [devotional, imagery, isSermonMode, sermonImagery])

  return (
    <div
      ref={mainRef}
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#0c1929] max-w-md mx-auto shadow-2xl"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-[#0c1929]/95 backdrop-blur-md p-4 pb-2 border-b border-white/10 transition-colors duration-300">
        <button
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold leading-tight tracking-tight text-center flex-1 text-cyan-400">Imagery</h1>
        <HeaderDropdown verseReference={isSermonMode ? sermonTitle : devotional.verse?.reference} />
      </header>

      <main className="flex-1 flex flex-col gap-6 pb-12">
        {/* Featured Reflections - Symbol explanations */}
        <section className="flex flex-col pt-6">
          <div className="px-5 mb-4 flex items-baseline justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/20 text-cyan-400 mb-2">
                <span className="material-symbols-outlined text-sm">{isSermonMode ? "podium" : "auto_awesome"}</span>
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {isSermonMode ? "Sermon Visuals" : "Visual Symbols"}
                </span>
              </div>
              <h2 className="text-2xl font-bold leading-tight tracking-tight text-white">
                {isSermonMode ? sermonTitle : "Hidden Meanings"}
              </h2>
              <p className="text-sm text-blue-200/70 mt-1">
                {isSermonMode 
                  ? "Visual representations of the sermon's message" 
                  : "Discover the deeper symbolism in this verse"}
              </p>
            </div>
          </div>

          {imagery.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-5">
              <div className="size-12 rounded-full bg-cyan-500/20 flex items-center justify-center mb-4 animate-pulse">
                <span className="material-symbols-outlined text-cyan-400">image</span>
              </div>
              <p className="text-blue-200/70">
                {isGenerating ? "Creating sermon visuals..." : "Discovering symbols..."}
              </p>
            </div>
          ) : (
            <div className="flex w-full overflow-x-auto pb-4 px-5 snap-x snap-mandatory scrollbar-hide">
              <div className="flex flex-row items-start justify-start gap-4">
                {imagery.map((item, i) => (
                  <div key={i} className="flex flex-col gap-3 w-[260px] snap-center shrink-0 group cursor-pointer">
                    <div className="relative w-full aspect-square overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-white/10">
                      {item.img ? (
                        <AppImage src={item.img} alt={item.title} className="absolute inset-0 w-full h-full object-cover" onError={()=>setImageOverrides(prev=>({...prev,[item.imagePrompt||item.title]:{img:null,imageErrors:['img']}}))} />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                          <span className="material-symbols-outlined text-cyan-500/50 text-4xl">brush</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="size-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white mb-2">
                          <span className="material-symbols-outlined">{item.icon || "image"}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{item.title}</h3>
                      <p className="text-sm text-blue-200/70">{item.sub}</p>
                      {item.imageErrors?.length>0 && <button onClick={()=>retryIllustration(item)} className="mt-3 text-cyan-300 underline text-sm">Retry illustration</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="flex flex-col px-5">
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400 mb-2">
              <span className="material-symbols-outlined text-sm">photo_library</span>
              <span className="text-xs font-semibold uppercase tracking-wide">Complete Collection</span>
            </div>
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-white">Full Gallery</h2>
            <p className="text-sm text-blue-200/70 mt-1">All {allImages.length} images from your {isSermonMode ? "sermon" : "devotional"}</p>
          </div>

          {allImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="size-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 animate-pulse">
                <span className="material-symbols-outlined text-blue-400">collections</span>
              </div>
              <p className="text-blue-200/70">Images are being created...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {allImages.map((image, i) => (
                <div
                  key={i}
                  className="relative group rounded-2xl overflow-hidden cursor-zoom-in aspect-square bg-gradient-to-br from-blue-900/30 to-cyan-900/30 shadow-md border border-white/10"
                >
                  <AppImage alt={image.title} className="w-full h-full object-cover" src={image.src || "/placeholder.svg"} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default function ImageryPage() {
  return <ContentContextBoundary><ImageryContent /></ContentContextBoundary>
}
