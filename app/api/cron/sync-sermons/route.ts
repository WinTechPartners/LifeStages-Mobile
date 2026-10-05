import { handleSermonDiscoveryCron } from '@/lib/sermon-automation/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export const GET = (request: Request) => handleSermonDiscoveryCron(request)
export const POST = (request: Request) => handleSermonDiscoveryCron(request)
