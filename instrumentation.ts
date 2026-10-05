// Runs once when the Next.js server starts (Node.js runtime only).
// On Railway this replaces Vercel Cron — schedules the daily VOTD at 6 AM Central (12 UTC).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
  if (process.env.NODE_ENV !== 'production' || !process.env.RAILWAY_PUBLIC_DOMAIN || !process.env.CRON_SECRET) return

  const cron = (await import('node-cron')).default
  const cronSecret = process.env.CRON_SECRET

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const baseUrl = appUrl
    || (railwayDomain ? `https://${railwayDomain}` : null)
    || 'http://localhost:3000'

  if (process.env.SERMON_DISCOVERY_ENABLED === 'true' && cronSecret.length >= 32) {
    cron.schedule('*/5 * * * *', async () => {
      try {
        const result = await fetch(`${baseUrl}/api/cron/sync-sermons`, {
          headers: { Authorization: `Bearer ${cronSecret}` },
          signal: AbortSignal.timeout(55000),
        })
        if (!result.ok) console.error('[Cron] Sermon discovery returned', result.status)
      } catch { console.error('[Cron] Sermon discovery request did not finish') }
    })
  }

  // 0 12 * * * = noon UTC = 6 AM Central (safe year-round)
  cron.schedule('0 12 * * *', async () => {
    console.log('[Cron] Triggering daily VOTD at', new Date().toISOString())
    try {
      const res = await fetch(`${baseUrl}/api/cron/send-votd`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${cronSecret}` },
      })
      const json = await res.json()
      console.log('[Cron] VOTD result:', json)
    } catch (e) {
      console.error('[Cron] VOTD trigger failed:', e)
    }
  })

  console.log(`[Cron] Daily VOTD scheduler ready — fires at 12:00 UTC (${baseUrl})`)
}
}
