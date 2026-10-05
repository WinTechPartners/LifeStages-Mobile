import { handleChurchManagement } from '@/lib/church-management/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = (request: Request) => handleChurchManagement(request)
export const POST = (request: Request) => handleChurchManagement(request)
export const PATCH = (request: Request) => handleChurchManagement(request)
export const OPTIONS = (request: Request) => handleChurchManagement(request)
