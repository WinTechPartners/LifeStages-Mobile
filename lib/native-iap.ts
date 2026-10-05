/** Native purchases adapter for the installed CapacitorPurchases (RevenueCat) SDK. */
import { isNative, getPlatform } from './native-features'
import type { CustomerInfo, Offerings, Package } from '@capgo/capacitor-purchases'

export const PRODUCT_IDS = {
  MONTHLY: 'com.lifestagesai.bible.premium.monthly',
  YEARLY: 'com.lifestagesai.bible.premium.yearly',
} as const
export type SubscriptionStatus = 'active' | 'trialing' | 'expired' | 'canceled' | 'none'
export interface IAPProduct { id: string; title: string; description: string; price: string; priceAmount: number; currency: string; period: 'monthly' | 'yearly' }
export interface IAPSubscriptionInfo { status: SubscriptionStatus; productId: string | null; expiresAt: number | null; isTrialing: boolean; willRenew: boolean }
const emptySubscription = (): IAPSubscriptionInfo => ({ status: 'none', productId: null, expiresAt: null, isTrialing: false, willRenew: false })
const knownProduct = (id: string) => id === PRODUCT_IDS.MONTHLY || id === PRODUCT_IDS.YEARLY
const demoEnabled = () => process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_IAP_DEMO_MODE === 'true'
let storeReady = false
let initializing: Promise<boolean> | undefined

/** Only active SDK entitlements for this app's products grant access. */
export function subscriptionFromCustomerInfo(info: CustomerInfo, now = Date.now()): IAPSubscriptionInfo {
  const entitlement = Object.values(info.entitlements.active).find(item => item.isActive && knownProduct(item.productIdentifier)
    && (item.expirationDate === null || (Number.isFinite(Date.parse(item.expirationDate)) && Date.parse(item.expirationDate) > now)))
  if (!entitlement) return emptySubscription()
  const isTrialing = entitlement.periodType === 'TRIAL'
  return { status: isTrialing ? 'trialing' : 'active', productId: entitlement.productIdentifier, expiresAt: entitlement.expirationDate ? Date.parse(entitlement.expirationDate) : null, isTrialing, willRenew: entitlement.willRenew }
}
function currentPackages(offerings: Offerings): Package[] { return offerings.current?.availablePackages.filter(pkg => knownProduct(pkg.product.identifier)) || [] }
export function productsFromOfferings(offerings: Offerings): IAPProduct[] {
  const seen = new Set<string>()
  return currentPackages(offerings).filter(pkg => { if (seen.has(pkg.product.identifier)) return false; seen.add(pkg.product.identifier); return true }).map(({ product }) => ({
    id: product.identifier, title: product.title, description: product.description, price: product.priceString,
    priceAmount: product.price, currency: product.currencyCode, period: product.identifier === PRODUCT_IDS.YEARLY ? 'yearly' : 'monthly',
  }))
}
export async function initializeIAP(): Promise<boolean> {
  if (!isNative()) return false
  if (storeReady) return true
  if (initializing) return initializing
  const platform = getPlatform()
  const apiKey = platform === 'ios' ? process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY : platform === 'android' ? process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY : undefined
  if (!apiKey) return false
  initializing = (async () => {
    try {
      const { CapacitorPurchases } = await import('@capgo/capacitor-purchases')
      await CapacitorPurchases.setup({ apiKey, collectDeviceIdentifiers: false, enableAdServicesAttribution: false })
      storeReady = true
      return true
    } catch { return false }
  })().finally(() => { initializing = undefined })
  return initializing
}
export async function getProducts(): Promise<IAPProduct[]> {
  if (!isNative()) return demoEnabled() ? [
    { id: PRODUCT_IDS.MONTHLY, title: 'Demo monthly', description: 'Demo only; no store transaction', price: '$4.99', priceAmount: 4.99, currency: 'USD', period: 'monthly' },
    { id: PRODUCT_IDS.YEARLY, title: 'Demo yearly', description: 'Demo only; no store transaction', price: '$44.99', priceAmount: 44.99, currency: 'USD', period: 'yearly' },
  ] : []
  if (!await initializeIAP()) return []
  try {
    const { CapacitorPurchases } = await import('@capgo/capacitor-purchases')
    return productsFromOfferings((await CapacitorPurchases.getOfferings()).offerings)
  } catch { return [] }
}
function readDemoSubscription(): IAPSubscriptionInfo {
  if (!demoEnabled()) return emptySubscription()
  try {
    const value = JSON.parse(localStorage.getItem('iap_mock_status') || 'null')
    if (!value || !knownProduct(value.productId) || !['trialing', 'active'].includes(value.status) || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()) return emptySubscription()
    return { status: value.status, productId: value.productId, expiresAt: value.expiresAt, isTrialing: value.status === 'trialing', willRenew: false }
  } catch { return emptySubscription() }
}
export async function purchaseProduct(productId: string): Promise<boolean> {
  if (!knownProduct(productId)) return false
  if (!isNative()) {
    if (!demoEnabled()) return false
    localStorage.setItem('iap_mock_status', JSON.stringify({ status: 'trialing', productId, expiresAt: Date.now() + 7 * 86400000 }))
    return true
  }
  if (!await initializeIAP()) throw new Error('Purchases are not configured for this app yet.')
  const { CapacitorPurchases } = await import('@capgo/capacitor-purchases')
  const packages = currentPackages((await CapacitorPurchases.getOfferings()).offerings)
  const selected = packages.find(pkg => pkg.product.identifier === productId)
  if (!selected) throw new Error('This subscription is not currently available from the store.')
  try {
    const { customerInfo } = await CapacitorPurchases.purchasePackage({ identifier: selected.identifier, offeringIdentifier: selected.offeringIdentifier })
    return ['active', 'trialing'].includes(subscriptionFromCustomerInfo(customerInfo).status)
  } catch (error) {
    const cancelled = error as { userCancelled?: boolean; code?: string | number }
    if (cancelled?.userCancelled || ['USER_CANCELLED', 'PURCHASE_CANCELLED_ERROR', '1', 1].includes(cancelled?.code as string | number)) return false
    throw new Error('The store could not confirm this purchase. Restore purchases before trying again.')
  }
}
export async function restorePurchases(): Promise<IAPSubscriptionInfo> {
  if (!isNative()) return readDemoSubscription()
  if (!await initializeIAP()) return emptySubscription()
  try {
    const { CapacitorPurchases } = await import('@capgo/capacitor-purchases')
    return subscriptionFromCustomerInfo((await CapacitorPurchases.restorePurchases()).customerInfo)
  } catch { return emptySubscription() }
}
export async function getSubscriptionInfo(): Promise<IAPSubscriptionInfo> {
  if (!isNative()) return readDemoSubscription()
  if (!await initializeIAP()) return emptySubscription()
  try {
    const { CapacitorPurchases } = await import('@capgo/capacitor-purchases')
    return subscriptionFromCustomerInfo((await CapacitorPurchases.getCustomerInfo()).customerInfo)
  } catch { return emptySubscription() }
}

