import { cacheGet, cacheSet } from './content-cache'
export const BIBLE_VERSION = 'WEB'
export const TRANSLATION_NOTICE = 'More Bible translations are planned by the end of 2026.'
const FALLBACK_VERSES = [
  {
    "version": "WEB",
    "text": "Yahweh is my shepherd:\nI shall lack nothing.",
    "reference": "Psalm 23:1"
  },
  {
    "version": "WEB",
    "text": "For I know the thoughts that I think toward you,” says Yahweh, “thoughts of peace, and not of evil, to give you hope and a future.",
    "reference": "Jeremiah 29:11"
  },
  {
    "version": "WEB",
    "text": "I can do all things through Christ, who strengthens me.",
    "reference": "Philippians 4:13"
  },
  {
    "version": "WEB",
    "text": "We know that all things work together for good for those who love God, to those who are called according to his purpose.",
    "reference": "Romans 8:28"
  },
  {
    "version": "WEB",
    "text": "Trust in Yahweh with all your heart,\nand don’t lean on your own understanding.\nIn all your ways acknowledge him,\nand he will make your paths straight.",
    "reference": "Proverbs 3:5-6"
  },
  {
    "version": "WEB",
    "text": "But those who wait for Yahweh will renew their strength.\nThey will mount up with wings like eagles.\nThey will run, and not be weary.\nThey will walk, and not faint.",
    "reference": "Isaiah 40:31"
  },
  {
    "version": "WEB",
    "text": "For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.",
    "reference": "John 3:16"
  }
]
export function scheduledFallback(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date+'T00:00:00Z')) || new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date) throw Error('Invalid date')
  const index=Math.floor(Date.parse(date+'T00:00:00Z')/86400000)%FALLBACK_VERSES.length
  return {...FALLBACK_VERSES[index],source:'lifestages-curated'}
}
export async function webPassage(reference: string): Promise<{reference: string; text: string; version: string}> {
  if (typeof reference !== 'string' || reference.length>100 || !/^(?:[1-3]\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*\s+\d{1,3}(?::\d{1,3}(?:[-–]\d{1,3})?)?$/.test(reference.trim())) throw Error('Invalid Scripture reference')
  const known=FALLBACK_VERSES.find(v=>v.reference.toLowerCase()===reference.trim().toLowerCase())
  if(known) return {...known}
  const key={reference:reference.trim(),version:'WEB'}
  const cached=await cacheGet<{reference:string;text:string;version:string}>('web-passage',key)
  if(cached?.version==='WEB' && cached.text) return cached
  const response=await fetch('https://bible-api.com/'+encodeURIComponent(reference.trim())+'?translation=web',{signal:AbortSignal.timeout(15000)})
  if(!response.ok) throw Error('WEB passage unavailable')
  const data=await response.json()
  if(data.translation_id!=='web'||typeof data.text!=='string'||!data.text.trim()||!Array.isArray(data.verses)||!data.verses.length) throw Error('Unverified WEB passage')
  const passage={reference:reference.trim(),text:data.text.trim(),version:'WEB'}
  await cacheSet('web-passage',key,passage)
  return passage
}
