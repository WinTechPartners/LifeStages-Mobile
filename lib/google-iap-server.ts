import { createSign } from 'node:crypto'

export const GOOGLE_PACKAGE = 'com.bibleforlifestages'
export const GOOGLE_PRODUCTS = ['premium_monthly', 'premium_yearly'] as const
export function googleBillingConfigured() {
  return !!(process.env.GOOGLE_PLAY_CLIENT_EMAIL && process.env.GOOGLE_PLAY_PRIVATE_KEY)
}
let access: { token: string; until: number } | undefined
async function accessToken() {
  if (access && access.until > Date.now()) return access.token
  if (!googleBillingConfigured()) throw Error('Google Play verification is not configured')
  const now = Math.floor(Date.now() / 1000)
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const unsigned = `${encode({alg:'RS256',typ:'JWT'})}.${encode({iss:process.env.GOOGLE_PLAY_CLIENT_EMAIL,scope:'https://www.googleapis.com/auth/androidpublisher',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})}`
  const signer = createSign('RSA-SHA256').update(unsigned)
  const assertion = `${unsigned}.${signer.sign(process.env.GOOGLE_PLAY_PRIVATE_KEY!.replace(/\\n/g,'\n'),'base64url')}`
  const response = await fetch('https://oauth2.googleapis.com/token', {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(10000)})
  const data = await response.json()
  if (!response.ok || typeof data.access_token !== 'string') throw Error('Google Play authorization failed')
  access = {token:data.access_token,until:Date.now()+Math.min(Number(data.expires_in)||3600,3600)*1000-60000}
  return access.token
}
export function normalizeGooglePurchase(data: any, now=Date.now()) {
  const validState = ['SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_IN_GRACE_PERIOD','SUBSCRIPTION_STATE_CANCELED'].includes(data?.subscriptionState)
  const item = data?.lineItems?.filter((x:any)=>GOOGLE_PRODUCTS.includes(x.productId) && Date.parse(x.expiryTime)>now).sort((a:any,b:any)=>Date.parse(b.expiryTime)-Date.parse(a.expiryTime))[0]
  if (!validState || !item) return {status:'none',productId:null,expiresAt:null,isTrialing:false,willRenew:false}
  return {status:'active',productId:item.productId,expiresAt:Date.parse(item.expiryTime),isTrialing:false,willRenew:item.autoRenewingPlan?.autoRenewEnabled===true}
}
export async function verifyGooglePurchase(token: unknown) {
  if (typeof token !== 'string' || token.length<10 || token.length>4096 || !googleBillingConfigured()) return normalizeGooglePurchase(null)
  const bearer = await accessToken()
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${GOOGLE_PACKAGE}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`
  const response = await fetch(url,{headers:{Authorization:`Bearer ${bearer}`},cache:'no-store',signal:AbortSignal.timeout(10000)})
  if (!response.ok) return normalizeGooglePurchase(null)
  const data = await response.json()
  const subscription = normalizeGooglePurchase(data)
  if (subscription.status==='active' && data.acknowledgementState==='ACKNOWLEDGEMENT_STATE_PENDING') {
    const acknowledge = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${GOOGLE_PACKAGE}/purchases/subscriptions/${subscription.productId}/tokens/${encodeURIComponent(token)}:acknowledge`,{method:'POST',headers:{Authorization:`Bearer ${bearer}`,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)})
    if (!acknowledge.ok) throw Error('Google purchase acknowledgement failed. Retry restore.')
  }
  return subscription
}
export async function hasGooglePremium(token:unknown) {
  try { return (await verifyGooglePurchase(token)).status==='active' } catch { return false }
}
