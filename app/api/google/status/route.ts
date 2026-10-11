import { NextResponse } from 'next/server'
import { googleBillingConfigured, verifyGooglePurchase } from '@/lib/google-iap-server'
export const dynamic = 'force-dynamic'
export async function GET() { return NextResponse.json({configured:googleBillingConfigured()},{headers:{'Cache-Control':'no-store'}}) }
export async function POST(request:Request) {
  if (!googleBillingConfigured()) return NextResponse.json({error:'Google Play subscriptions are being configured.'},{status:503})
  try {
    const body = await request.json()
    return NextResponse.json(await verifyGooglePurchase(body.purchaseToken),{headers:{'Cache-Control':'no-store'}})
  } catch { return NextResponse.json({error:'Google Play could not verify your subscription. Please retry.'},{status:503}) }
}
