export function verseImagePrompt(verse: {reference:string; text:string}): string {
  if (!verse.reference?.trim() || !verse.text?.trim()) throw new Error('Verse reference and text are required')
  return 'Create a visual scene that communicates the meaning and imagery of this exact Bible passage: ' + verse.reference.trim() + ': ' + verse.text.trim() + '. Choose people, actions, and surroundings that connect directly to the passage. For a shepherd passage, show a shepherd caring for sheep. Do not substitute an unrelated scenic road. Photographic illustration expressed through subjects, actions, setting and light.'
}
export async function requestVerseImage(endpoint:string, verse:{reference:string; text:string}, signal:AbortSignal, fetcher:typeof fetch=fetch): Promise<string|null> {
  const combined = new AbortController()
  const abort = () => combined.abort()
  if (signal.aborted) abort(); else signal.addEventListener("abort", abort, {once:true})
  const timer=setTimeout(abort,120000)
  try {
  const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},signal:combined.signal,body:JSON.stringify({prompt:verseImagePrompt(verse),verse_reference:verse.reference,verse_text:verse.text,width:1024,height:512})})
  if (!response.ok) return null
  const data=await response.json()
  return typeof data.imageUrl === 'string' && !data.imageUrl.includes('placeholder.svg') ? data.imageUrl : null
  } finally { clearTimeout(timer); signal.removeEventListener('abort',abort) }
}
