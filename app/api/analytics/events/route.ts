import { handleAnalyticsEvents, handleAnalyticsOptions } from '@/lib/analytics/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = (request: Request) => handleAnalyticsEvents(request)
export const DELETE = (request: Request) => handleAnalyticsEvents(request)
export const OPTIONS = (request: Request) => handleAnalyticsOptions(request)
