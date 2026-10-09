// Bible API - Uses bolls.life API (free, many translations)
// Has popular translations including modern ones

import { cacheGet, cacheSet } from "@/lib/content-cache"

// Chapter counts for each book
const CHAPTER_COUNTS: Record<string, number> = {
  "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34,
  "Joshua": 24, "Judges": 21, "Ruth": 4, "1 Samuel": 31, "2 Samuel": 24,
  "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36, "Ezra": 10,
  "Nehemiah": 13, "Esther": 10, "Job": 42, "Psalms": 150, "Proverbs": 31,
  "Ecclesiastes": 12, "Song of Solomon": 8, "Isaiah": 66, "Jeremiah": 52, "Lamentations": 5,
  "Ezekiel": 48, "Daniel": 12, "Hosea": 14, "Joel": 3, "Amos": 9,
  "Obadiah": 1, "Jonah": 4, "Micah": 7, "Nahum": 3, "Habakkuk": 3,
  "Zephaniah": 3, "Haggai": 2, "Zechariah": 14, "Malachi": 4,
  "Matthew": 28, "Mark": 16, "Luke": 24, "John": 21, "Acts": 28,
  "Romans": 16, "1 Corinthians": 16, "2 Corinthians": 13, "Galatians": 6, "Ephesians": 6,
  "Philippians": 4, "Colossians": 4, "1 Thessalonians": 5, "2 Thessalonians": 3, "1 Timothy": 6,
  "2 Timothy": 4, "Titus": 3, "Philemon": 1, "Hebrews": 13, "James": 5,
  "1 Peter": 5, "2 Peter": 3, "1 John": 5, "2 John": 1, "3 John": 1,
  "Jude": 1, "Revelation": 22
}

// Book ID mapping for bolls.life API (1-indexed)
const BOOK_IDS: Record<string, number> = {
  "Genesis": 1, "Exodus": 2, "Leviticus": 3, "Numbers": 4, "Deuteronomy": 5,
  "Joshua": 6, "Judges": 7, "Ruth": 8, "1 Samuel": 9, "2 Samuel": 10,
  "1 Kings": 11, "2 Kings": 12, "1 Chronicles": 13, "2 Chronicles": 14, "Ezra": 15,
  "Nehemiah": 16, "Esther": 17, "Job": 18, "Psalms": 19, "Proverbs": 20,
  "Ecclesiastes": 21, "Song of Solomon": 22, "Isaiah": 23, "Jeremiah": 24, "Lamentations": 25,
  "Ezekiel": 26, "Daniel": 27, "Hosea": 28, "Joel": 29, "Amos": 30,
  "Obadiah": 31, "Jonah": 32, "Micah": 33, "Nahum": 34, "Habakkuk": 35,
  "Zephaniah": 36, "Haggai": 37, "Zechariah": 38, "Malachi": 39,
  "Matthew": 40, "Mark": 41, "Luke": 42, "John": 43, "Acts": 44,
  "Romans": 45, "1 Corinthians": 46, "2 Corinthians": 47, "Galatians": 48, "Ephesians": 49,
  "Philippians": 50, "Colossians": 51, "1 Thessalonians": 52, "2 Thessalonians": 53, "1 Timothy": 54,
  "2 Timothy": 55, "Titus": 56, "Philemon": 57, "Hebrews": 58, "James": 59,
  "1 Peter": 60, "2 Peter": 61, "1 John": 62, "2 John": 63, "3 John": 64,
  "Jude": 65, "Revelation": 66
}

// Top 10 translations - mix of popular and freely available
// Provider availability is separate from the translation catalogue.
const TRANSLATIONS = [
  { id: "NIV", name: "New International Version", abbr: "NIV" },
  { id: "KJV", name: "King James Version", abbr: "KJV" },
  { id: "ESV", name: "English Standard Version", abbr: "ESV" },
  { id: "NLT", name: "New Living Translation", abbr: "NLT" },
  { id: "NKJV", name: "New King James Version", abbr: "NKJV" },
  { id: "NASB", name: "New American Standard Bible", abbr: "NASB" },
  { id: "AMP", name: "Amplified Bible", abbr: "AMP" },
  { id: "CSB", name: "Christian Standard Bible", abbr: "CSB" },
  { id: "WEB", name: "World English Bible", abbr: "WEB" },
  { id: "YLT", name: "Young's Literal Translation", abbr: "YLT" },
  { id: "VI1934", name: "Kinh Thánh Tiếng Việt (1934)", abbr: "VIỆT" },
]

// Vietnamese book names (Kinh Thánh 1934 naming), keyed by the English name used everywhere else
const VI_BOOK_NAMES: Record<string, string> = {
  "Genesis": "Sáng Thế Ký", "Exodus": "Xuất Ê-díp-tô Ký", "Leviticus": "Lê-vi Ký", "Numbers": "Dân Số Ký", "Deuteronomy": "Phục Truyền Luật Lệ Ký",
  "Joshua": "Giô-suê", "Judges": "Các Quan Xét", "Ruth": "Ru-tơ", "1 Samuel": "1 Sa-mu-ên", "2 Samuel": "2 Sa-mu-ên",
  "1 Kings": "1 Các Vua", "2 Kings": "2 Các Vua", "1 Chronicles": "1 Sử Ký", "2 Chronicles": "2 Sử Ký", "Ezra": "E-xơ-ra",
  "Nehemiah": "Nê-hê-mi", "Esther": "Ê-xơ-tê", "Job": "Gióp", "Psalms": "Thi Thiên", "Proverbs": "Châm Ngôn",
  "Ecclesiastes": "Truyền Đạo", "Song of Solomon": "Nhã Ca", "Isaiah": "Ê-sai", "Jeremiah": "Giê-rê-mi", "Lamentations": "Ca Thương",
  "Ezekiel": "Ê-xê-chi-ên", "Daniel": "Đa-ni-ên", "Hosea": "Ô-sê", "Joel": "Giô-ên", "Amos": "A-mốt",
  "Obadiah": "Áp-đia", "Jonah": "Giô-na", "Micah": "Mi-chê", "Nahum": "Na-hum", "Habakkuk": "Ha-ba-cúc",
  "Zephaniah": "Sô-phô-ni", "Haggai": "A-ghê", "Zechariah": "Xa-cha-ri", "Malachi": "Ma-la-chi",
  "Matthew": "Ma-thi-ơ", "Mark": "Mác", "Luke": "Lu-ca", "John": "Giăng", "Acts": "Công Vụ Các Sứ Đồ",
  "Romans": "Rô-ma", "1 Corinthians": "1 Cô-rinh-tô", "2 Corinthians": "2 Cô-rinh-tô", "Galatians": "Ga-la-ti", "Ephesians": "Ê-phê-sô",
  "Philippians": "Phi-líp", "Colossians": "Cô-lô-se", "1 Thessalonians": "1 Tê-sa-lô-ni-ca", "2 Thessalonians": "2 Tê-sa-lô-ni-ca", "1 Timothy": "1 Ti-mô-thê",
  "2 Timothy": "2 Ti-mô-thê", "Titus": "Tít", "Philemon": "Phi-lê-môn", "Hebrews": "Hê-bơ-rơ", "James": "Gia-cơ",
  "1 Peter": "1 Phi-e-rơ", "2 Peter": "2 Phi-e-rơ", "1 John": "1 Giăng", "2 John": "2 Giăng", "3 John": "3 Giăng",
  "Jude": "Giu-đe", "Revelation": "Khải Huyền"
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const book = searchParams.get("book")
  const chapter = searchParams.get("chapter")
  const version = (searchParams.get("version") || "KJV").toUpperCase()

  try {
    // Get list of books
    if (action === "books") {
      const oldTestament = [
        "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
        "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
        "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
        "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
        "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
        "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
        "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
        "Zephaniah", "Haggai", "Zechariah", "Malachi"
      ]
      const newTestament = [
        "Matthew", "Mark", "Luke", "John", "Acts",
        "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
        "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy",
        "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
        "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
        "Jude", "Revelation"
      ]
      
      return Response.json({
        oldTestament: oldTestament.map(name => ({
          name,
          viName: VI_BOOK_NAMES[name] || name,
          id: name.toLowerCase().replace(/ /g, "-"),
          chapters: CHAPTER_COUNTS[name]
        })),
        newTestament: newTestament.map(name => ({
          name,
          viName: VI_BOOK_NAMES[name] || name,
          id: name.toLowerCase().replace(/ /g, "-"),
          chapters: CHAPTER_COUNTS[name]
        })),
        translations: TRANSLATIONS
      })
    }

    // Get chapters for a book
    if (action === "chapters" && book) {
      const chapterCount = CHAPTER_COUNTS[book] || 1
      return Response.json({
        book,
        chapters: Array.from({ length: chapterCount }, (_, i) => i + 1)
      })
    }

    // Get verses for a chapter using bolls.life API
    if (action === "read" && book && chapter) {
      // The provider replaced NIV verse fields with its own publisher-dispute notice.
      // Block before cache lookup: previously cached responses contain that same notice.
      if (version === "NIV") {
        return Response.json({
          code: "NIV_UNAVAILABLE",
          error: "NIV is unavailable from our Bible text provider. Please choose another translation."
        }, { status: 503 })
      }
      const bookId = BOOK_IDS[book]
      if (!bookId) {
        return Response.json({ error: "Book not found" }, { status: 404 })
      }

      // Bible text is stable: serve from the global cache (365 days) before hitting bolls.life
      const chapterKey = { book, chapter, version }
      const cachedChapter = await cacheGet("bible-chapter", chapterKey)
      if (cachedChapter) return Response.json(cachedChapter)

      // bolls.life API: https://bolls.life/get-chapter/{translation}/{book_id}/{chapter}/
      const url = `https://bolls.life/get-chapter/${version}/${bookId}/${chapter}/`
      console.log("[Bible API] Fetching from bolls.life:", url)
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 86400 } // Cache for 24 hours
      })

      if (!response.ok) {
        console.error("[Bible API] bolls.life error:", response.status)
        // Fallback to bible-api.com for KJV/WEB
        if (version === "KJV" || version === "WEB") {
          const fallbackUrl = `https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=${version.toLowerCase()}`
          console.log("[Bible API] Falling back to bible-api.com:", fallbackUrl)
          const fallbackRes = await fetch(fallbackUrl)
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json()
            const verses = (fallbackData.verses || []).map((v: { verse: number; text: string }) => ({
              number: v.verse,
              text: v.text?.trim() || ""
            }))
            return Response.json({ book, chapter: parseInt(chapter), version, verses })
          }
        }
        return Response.json({ error: "Chapter not found", status: response.status }, { status: 404 })
      }

      const data = await response.json()
      console.log("[Bible API] bolls.life response length:", data?.length)
      
      // bolls.life returns array: [{ verse: 1, text: "..." }, ...]
      const verses = (data || []).map((v: { verse: number; text: string }) => ({
        number: v.verse,
        text: (v.text || "")
          .replace(/<S>.*?<\/S>/gi, '')       // Remove Strong's number tags AND their numbers (any length)
          .replace(/<sup>.*?<\/sup>/gi, '')   // Remove footnote / translator-note superscripts
          .replace(/<br\s*\/?>/gi, '\n')      // Convert line breaks (headings & poetry) to real newlines
          .replace(/<[^>]*>/g, '')            // Strip any remaining tags (i, b, etc.), keep inner text
          .replace(/\[[a-z0-9]{1,3}\]/gi, '') // Remove footnote / cross-reference markers like [1] [a]
          .replace(/\b[HG]\d{1,5}\b/g, '')    // Remove Strong's codes like H1234 / G5678 if they leak as text
          .replace(/(^|\s)\d{3,5}(?=\s|$)/g, '$1') // Remove stray bare Strong's numbers left in the text
          .replace(/[ \t]+([,.;:!?])/g, '$1') // Remove stray space left before punctuation
          .replace(/[ \t]{2,}/g, ' ')         // Collapse runs of spaces (preserve newlines)
          .replace(/[ \t]*\n[ \t]*/g, '\n')   // Trim spaces around newlines
          .replace(/\n{2,}/g, '\n')           // Collapse blank lines
          .trim()
      }))

      const result = { book, chapter: parseInt(chapter), version, verses }
      if (verses.length > 0) await cacheSet("bible-chapter", chapterKey, result)
      return Response.json(result)
    }

    return Response.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[Bible API] Error:", error)
    return Response.json({ error: "Failed to fetch Bible content" }, { status: 500 })
  }
}
