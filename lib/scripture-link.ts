/** Resolve a single chapter/verse reference against the actual Bible catalog. */
export function resolveScriptureLink<T extends { name: string; chapters: number }>(reference: string, books: T[]): { book: T; chapter: number; firstVerse?: number; lastVerse?: number } | null {
  const match = reference.trim().match(/^(.+?)\s+(\d{1,3})(?::(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/)
  if (!match) return null
  const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim()
  const book = books.find(item => normalize(item.name) === normalize(match[1]))
  const chapter = Number(match[2])
  const firstVerse = match[3] ? Number(match[3]) : undefined
  const lastVerse = match[4] ? Number(match[4]) : firstVerse
  if (!book || chapter < 1 || chapter > book.chapters || (firstVerse !== undefined && (firstVerse < 1 || firstVerse > 176 || lastVerse! < firstVerse || lastVerse! > 176))) return null
  return { book, chapter, firstVerse, lastVerse }
}
