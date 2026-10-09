import { Pool } from 'pg'

// Single Postgres connection pool for the whole app.
// Railway injects DATABASE_URL when you add the Postgres plugin.
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn('[db] DATABASE_URL is not set — database calls will fail until it is configured.')
}

// Railway's internal network does not require SSL. Enable relaxed SSL only when
// the connection string asks for it or PGSSL=true (e.g. an external Postgres).
const useSsl = /sslmode=require/.test(connectionString || '') || process.env.PGSSL === 'true'

// Reuse a single pool across hot reloads in development.
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined
}

function createPool(): Pool {
  const p = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 5,
    connectionTimeoutMillis: 10000, // fail fast on a bad/unreachable DATABASE_URL
    idleTimeoutMillis: 30000,
  })

  // CRITICAL: without this listener, an error on an *idle* pooled client
  // (network blip, DB restart, terminated connection) is emitted as an
  // unhandled 'error' event and crashes the entire Node process.
  p.on('error', (err) => {
    console.error('[db] idle client error (handled, non-fatal):', err?.message || err)
  })

  return p
}

export const pool = global.__pgPool || createPool()

if (process.env.NODE_ENV !== 'production') {
  global.__pgPool = pool
}

/** Run a query and return all rows. */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params)
  return res.rows as T[]
}

/** Run a query and return the first row, or null. */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const res = await pool.query(text, params)
  return (res.rows[0] as T) ?? null
}
