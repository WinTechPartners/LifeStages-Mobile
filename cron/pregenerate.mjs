// Daily pre-generation cron job for "Bible for Life Stages".
//
// Run by a Railway *Cron* service (see railway.cron.json). It POSTs to the
// always-on web service's /api/pregenerate route to build tomorrow's
// devotionals + images ahead of time, then exits — as Railway cron requires.
//
// Zero dependencies: uses Node's global fetch (Node 20+, pinned in package.json).
//
// Required env vars on the cron service:
//   CRON_SECRET     - shared secret; must match the web service's CRON_SECRET
//   CRON_TARGET_URL - base URL of the live web service
//                     e.g. https://your-app.up.railway.app
//                     (falls back to NEXT_PUBLIC_APP_URL)

const TIMEOUT_MS = 30 * 60 * 1000 // Includes text and illustration preparation for active anonymous cohorts

const baseUrl = (process.env.CRON_TARGET_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
const secret = process.env.WARMUP_SECRET || process.env.CRON_SECRET || ''

if (!baseUrl) {
  console.error('[cron] Missing CRON_TARGET_URL or NEXT_PUBLIC_APP_URL')
  process.exit(1)
}
if (secret.length<32) {
  console.error('[cron] Missing CRON_SECRET')
  process.exit(1)
}

const url = `${baseUrl}/api/pregenerate`

try {
  console.log(`[cron] POST ${url}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // No "date" field -> the route defaults to tomorrow.
    body: JSON.stringify({ secret }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  const body = await res.text()
  console.log(`[cron] -> ${res.status} ${res.statusText}`)
  const result=JSON.parse(body); console.log(JSON.stringify({success:result.success,date:result.date,prepared:result.prepared,failed:result.failed}))

  process.exit(res.ok ? 0 : 1)
} catch (err) {
  console.error('[cron] request failed:', err?.message || err)
  process.exit(1)
}
