import { query, queryOne } from "@/lib/db"

// Global, server-side cache for every piece of generated content.
//
// One row per (content_type, cache_key). The cache_key is a stable JSON string
// of the inputs that change the output (verse, language, age range, variant,
// topic, ...). Everyone who asks for the same thing gets the same row, so a
// verse is generated once per language and profile combination, not once per
// browser session. Rows are shared across users; nothing user-identifying is
// stored.
//
// The table is created on first use so no separate migration is required.
// Every failure here is swallowed: a cache problem must never block content.

export type CacheKeyParts = Record<string, string | number | boolean | null | undefined>

// Cache lifetime per content type, in days. Lifelines refresh daily so the
// advice for a topic is not identical every day; everything else is keyed by
// verse (which changes daily on its own) or is stable, so it holds for a year.
const TTL_DAYS: Record<string, number> = {
  lifeline: 1,
  "deep-dive": 1,
}
const DEFAULT_TTL_DAYS = 365

export function ttlDaysFor(contentType: string): number {
  return TTL_DAYS[contentType] ?? DEFAULT_TTL_DAYS
}

let tableReady: Promise<void> | null = null

function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = query(`
      CREATE TABLE IF NOT EXISTS cached_content (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_type  TEXT NOT NULL,
        cache_key     TEXT NOT NULL,
        language      TEXT NOT NULL DEFAULT 'en',
        payload       JSONB NOT NULL,
        access_count  INTEGER NOT NULL DEFAULT 1,
        last_accessed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (content_type, cache_key)
      );
      CREATE INDEX IF NOT EXISTS idx_cached_content_language ON cached_content (language);
    `)
      .then(() => undefined)
      .catch((err) => {
        console.error("[ContentCache] table setup failed:", err?.message || err)
        tableReady = null // retry on the next call
        throw err
      })
  }
  return tableReady
}

function normalize(parts: CacheKeyParts): string {
  const out: Record<string, string> = { scripture_policy: "web-only-2026-v1" }
  for (const k of Object.keys(parts).sort()) {
    const v = parts[k]
    if (v === undefined || v === null || v === "") continue
    out[k] = String(v).trim().toLowerCase()
  }
  return JSON.stringify(out)
}

/** Return the cached payload for these inputs, or null. */
export async function cacheGet<T = unknown>(contentType: string, parts: CacheKeyParts): Promise<T | null> {
  try {
    await ensureTable()
    const key = normalize(parts)
    const row = await queryOne<{ id: string; payload: T }>(
      `SELECT id, payload FROM cached_content
        WHERE content_type = $1 AND cache_key = $2
          AND created_at > NOW() - ($3 || ' days')::interval`,
      [contentType, key, String(ttlDaysFor(contentType))]
    )
    if (!row) return null
    query("UPDATE cached_content SET access_count = access_count + 1, last_accessed = NOW() WHERE id = $1", [row.id]).catch(
      () => undefined
    )
    console.log(`[ContentCache] HIT ${contentType} ${key}`)
    return row.payload
  } catch (err) {
    console.error("[ContentCache] get failed:", err instanceof Error ? err.message : err)
    return null
  }
}

/** Store a payload for these inputs (upsert). Never throws. */
export async function cacheSet(contentType: string, parts: CacheKeyParts, payload: unknown): Promise<void> {
  try {
    await ensureTable()
    const key = normalize(parts)
    const language = String(parts.language || "en").toLowerCase()
    await query(
      `INSERT INTO cached_content (content_type, cache_key, language, payload)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (content_type, cache_key)
       DO UPDATE SET payload = EXCLUDED.payload, language = EXCLUDED.language, last_accessed = NOW(), created_at = NOW()`,
      [contentType, key, language, JSON.stringify(payload)]
    )
    console.log(`[ContentCache] SAVED ${contentType} ${key}`)
  } catch (err) {
    console.error("[ContentCache] set failed:", err instanceof Error ? err.message : err)
  }
}

/** Delete cached rows. With no filters, clears everything. Returns rows removed. */
export async function cacheClear(opts: { language?: string; contentType?: string } = {}): Promise<number> {
  await ensureTable()
  const where: string[] = []
  const params: string[] = []
  if (opts.language) {
    params.push(opts.language.toLowerCase())
    where.push(`language = $${params.length}`)
  }
  if (opts.contentType) {
    params.push(opts.contentType)
    where.push(`content_type = $${params.length}`)
  }
  const rows = await query<{ n: string }>(
    `WITH d AS (DELETE FROM cached_content ${where.length ? "WHERE " + where.join(" AND ") : ""} RETURNING 1)
     SELECT COUNT(*)::text AS n FROM d`,
    params
  )
  return Number(rows[0]?.n || 0)
}
