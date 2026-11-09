/** Direct Apple StoreKit 2 bridge. No billing intermediary or embedded signing key. */
import { registerPlugin, Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { isNative, getPlatform } from './native-features'
export const PRODUCT_IDS = { MONTHLY:'001', YEARLY:'com.bibleforlifestages.premium.yearly' } as const
export type SubscriptionStatus = 'active' | 'trialing' | 'expired' | 'canceled' | 'none'
export interface IAPProduct { id:string; title:string; description:string; price:string; priceAmount:number; currency:string; period:'monthly'|'yearly' }
export interface IAPSubscriptionInfo { status:SubscriptionStatus; productId:string|null; expiresAt:number|null; isTrialing:boolean; willRenew:boolean }
interface AppleSubscription extends IAPSubscriptionInfo { signedTransaction?:string }
interface StoreKitBridge {
  getProducts():Promise<{products:IAPProduct[]}>
  getSubscription():Promise<AppleSubscription>
  restore():Promise<AppleSubscription>
  manageSubscriptions():Promise<void>
  purchase(options:{productId:string}):Promise<{outcome:'purchased'|'pending'|'cancelled';subscription?:AppleSubscription}>
  addListener(event:'subscriptionChanged', listener:(value:AppleSubscription)=>void):Promise<PluginListenerHandle>
}
const store = registerPlugin<StoreKitBridge>('LifeStagesStoreKit')
const empty = ():IAPSubscriptionInfo => ({status:'none',productId:null,expiresAt:null,isTrialing:false,willRenew:false})
const known = (id:unknown) => id === PRODUCT_IDS.MONTHLY || id === PRODUCT_IDS.YEARLY
let signedTransaction:string|null = null
export const getAppleTransaction = () => signedTransaction
export function normalizeAppleSubscription(value:AppleSubscription, now=Date.now()):IAPSubscriptionInfo {
  if (!known(value?.productId) || !['active','trialing'].includes(value?.status) || !Number.isFinite(value?.expiresAt) || value.expiresAt! <= now || !value.signedTransaction) return empty()
  return {status:value.status,productId:value.productId,expiresAt:value.expiresAt,isTrialing:value.status==='trialing',willRenew:value.willRenew===true}
}
function accept(value:AppleSubscription):IAPSubscriptionInfo {
  const result=normalizeAppleSubscription(value)
  signedTransaction = result.status==='none' ? null : value.signedTransaction!
  return result
}
export async function initializeIAP():Promise<boolean> {
  return isNative() && getPlatform()==='ios' && Capacitor.isPluginAvailable('LifeStagesStoreKit')
}
export async function getProducts():Promise<IAPProduct[]> {
  if (!await initializeIAP()) return []
  try { return (await store.getProducts()).products.filter(p=>known(p.id)) } catch { return [] }
}
export async function getSubscriptionInfo():Promise<IAPSubscriptionInfo> {
  if (!await initializeIAP()) { signedTransaction=null; return empty() }
  try { return accept(await store.getSubscription()) } catch { signedTransaction=null; return empty() }
}
export async function restorePurchases():Promise<IAPSubscriptionInfo> {
  if (!await initializeIAP()) return empty()
  return accept(await store.restore())
}
export async function purchaseProduct(productId:string):Promise<boolean> {
  if (!known(productId)) throw Error('This subscription plan is unavailable.')
  if (!await initializeIAP()) throw Error('Apple billing is unavailable in this app build. Update LifeStages in TestFlight and try again.')
  // Prevent charging anyone before the hosted personalization verifier is configured.
  const response=await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/apple/status`,{cache:'no-store',signal:AbortSignal.timeout(15000)})
  if (!response.ok || !(await response.json()).configured) throw Error('Apple subscriptions are being set up. Please try again later.')
  const result=await store.purchase({productId})
  if (result.outcome==='cancelled') return false
  if (result.outcome==='pending') throw Error('Your Apple purchase is awaiting approval. Your plan will update after Apple confirms it.')
  if (!result.subscription || accept(result.subscription).status==='none') throw Error('Apple has not confirmed an active subscription. Please use Restore Purchases or try again.')
  return true
}
export async function listenForSubscriptionChanges(listener:()=>void):Promise<()=>void> {
  if (!await initializeIAP()) return ()=>{}
  const handle=await store.addListener('subscriptionChanged', value=>{accept(value);listener()})
  return ()=>{void handle.remove()}
}
export async function manageAppleSubscriptions():Promise<void> {
  if (!await initializeIAP()) throw Error('Apple subscription settings are unavailable.')
  await store.manageSubscriptions()
}
