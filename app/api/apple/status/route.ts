import { NextResponse } from 'next/server'
import { appleVerificationConfigured } from '@/lib/apple-iap-server'
export const dynamic='force-dynamic'
export function GET() {
  return NextResponse.json({configured:appleVerificationConfigured()},{headers:{'Cache-Control':'no-store'}})
}
