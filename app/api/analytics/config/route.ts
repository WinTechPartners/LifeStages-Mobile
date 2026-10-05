import { handleAnalyticsConfig, handleAnalyticsOptions } from '@/lib/analytics/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = (request: Request) => handleAnalyticsConfig(request)
export const OPTIONS = (request: Request) => handleAnalyticsOptions(request)
