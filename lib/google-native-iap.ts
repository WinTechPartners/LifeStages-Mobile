import { registerPlugin, Capacitor } from '@capacitor/core'
import type { IAPProduct, IAPSubscriptionInfo } from './native-iap'
const bridge = registerPlugin<{
  getProducts():Promise<{products:IAPProduct[]}>
  getPurchases():Promise<{purchases:{purchaseToken:string;productId:string;pending:boolean}[]}>
  purchase(options:{productId:string}):Promise<{outcome:'purchased'|'pending'|'cancelled';purchaseToken?:string}>
}>('LifeStagesGoogleBilling')
export const GOOGLE_PRODUCT_IDS = {MONTHLY:'premium_monthly',YEARLY:'premium_yearly'} as const
const empty = ():IAPSubscriptionInfo => ({status:'none',productId:null,expiresAt:null,isTrialing:false,willRenew:false})
let purchaseToken:string|null=null
export const getGooglePurchaseToken=()=>purchaseToken
export const googleAvailable=()=>Capacitor.getPlatform()==='android' && Capacitor.isPluginAvailable('LifeStagesGoogleBilling')
async function verify(token:string):Promise<IAPSubscriptionInfo> {
  const response=await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL||''}/api/google/status`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({purchaseToken:token}),signal:AbortSignal.timeout(15000)})
  const info=await response.json()
  if (!response.ok) throw Error(info.error||'Google Play verification is temporarily unavailable.')
  if (info.status!=='active' || !Object.values(GOOGLE_PRODUCT_IDS).includes(info.productId) || !Number.isFinite(info.expiresAt) || info.expiresAt<=Date.now()) return empty()
  purchaseToken=token
  return info
}
export async function googleProducts() { return googleAvailable() ? (await bridge.getProducts()).products : [] }
export async function googleSubscription() {
  purchaseToken=null
  if (!googleAvailable()) return empty()
  const {purchases}=await bridge.getPurchases()
  for (const purchase of purchases.filter(p=>!p.pending)) {
    const info=await verify(purchase.purchaseToken)
    if(info.status==='active') return info
  }
  return empty()
}
export async function googlePurchase(productId:string) {
  if(!googleAvailable()) throw Error('Google Play billing is unavailable in this build.')
  const ready=await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL||''}/api/google/status`,{cache:'no-store',signal:AbortSignal.timeout(15000)})
  if(!ready.ok || !(await ready.json()).configured) throw Error('Google Play subscriptions are being configured. Please try again later.')
  const result=await bridge.purchase({productId})
  if(result.outcome==='cancelled') return false
  if(result.outcome==='pending') throw Error('Your Google Play purchase is awaiting payment confirmation.')
  if(!result.purchaseToken || (await verify(result.purchaseToken)).status!=='active') throw Error('Google Play has not confirmed an active subscription. Try Restore Purchases.')
  return true
}
