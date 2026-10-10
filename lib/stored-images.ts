import { createHash } from 'node:crypto'
import { cacheGet, cacheSet } from './content-cache'
import { queryOne } from './db'

type StoredImage = { contentType: string; base64: string }
const MAX_BYTES = 8 * 1024 * 1024
const pending = new Map<string, Promise<string | null>>()
export function imageIdFromUrl(source: string): string | null {
  try { return new URL(source, 'https://www.bibleforlifestages.com').pathname.match(/^\/api\/images\/([a-f0-9]{64})$/)?.[1] || null } catch { return null }
}
export async function readStoredImage(id: string): Promise<StoredImage | null> {
  if (!/^[a-f0-9]{64}$/.test(id)) return null
  // Use the same normalized, policy-versioned key as cacheSet.
  const current = await cacheGet<StoredImage>('image-file', { id })
  if (current) return current
  // Images already referenced by older app builds retain their original URLs.
  const row = await queryOne<{ payload: StoredImage }>('SELECT payload FROM cached_content WHERE content_type = $1 AND cache_key = $2', ['image-file', JSON.stringify({ id })])
  return row?.payload || null
}
async function storeBytes(bytes: Buffer, contentType: string): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType) || !bytes.length || bytes.length > MAX_BYTES) throw new Error('Invalid image payload')
  const id = createHash('sha256').update(bytes).digest('hex')
  await cacheSet('image-file', { id }, { contentType, base64: bytes.toString('base64') })
  if (!await readStoredImage(id)) throw new Error('Image storage unavailable')
  const configured = process.env.NEXT_PUBLIC_APP_URL || 'https://www.bibleforlifestages.com'
  const origin = new URL(configured).origin
  return `${origin}/api/images/${id}`
}
async function preserve(source: string): Promise<string | null> {
  try {
    const id = imageIdFromUrl(source)
    if (id) return await readStoredImage(id) ? source : null
    const inline = source.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
    if (inline) return await storeBytes(Buffer.from(inline[2], 'base64'), inline[1])
    const url = new URL(source)
    // This is migration of provider-generated assets, never an arbitrary URL proxy.
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !/^(?:im|image|images)\.runware\.ai$/.test(url.hostname)) return null
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(12000) })
    if (!response.ok || !response.body) return null
    const contentType = (response.headers.get('content-type') || '').split(';')[0]
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType) || Number(response.headers.get('content-length') || 0) > MAX_BYTES) return null
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0
    try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > MAX_BYTES) throw new Error('Image exceeds limit'); chunks.push(value) } }
    finally { await reader.cancel().catch(() => {}) }
    return await storeBytes(Buffer.concat(chunks), contentType)
  } catch { return null }
}
/** Download a live provider image once; expired links return null so callers can repair them. */
export function preserveImage(source: string | null | undefined): Promise<string | null> {
  if (!source) return Promise.resolve(null)
  const existing = pending.get(source)
  if (existing) return existing
  const task = preserve(source).finally(() => pending.delete(source))
  pending.set(source, task)
  return task
}
