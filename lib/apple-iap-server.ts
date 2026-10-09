import { SignedDataVerifier, Environment, AppStoreServerAPIClient, Status } from '@apple/app-store-server-library'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

const bundleId='com.bibleforlifestages'
const productIds=new Set(['001','com.bibleforlifestages.premium.yearly'])
const cache=new Map<string,{until:number;active:boolean}>()
export function appleVerificationConfigured():boolean {
  return !!(process.env.APPLE_IAP_PRIVATE_KEY && process.env.APPLE_IAP_KEY_ID && process.env.APPLE_IAP_ISSUER_ID)
}
export function activeAppleTransaction(value:{productId?:string;bundleId?:string;expiresDate?:number;revocationDate?:number;isUpgraded?:boolean},now=Date.now()):boolean {
  return value.bundleId===bundleId && productIds.has(value.productId || '') && Number.isFinite(value.expiresDate) && value.expiresDate!>now && !value.revocationDate && !value.isUpgraded
}
/** Verify Apple's signature, then ask Apple for current status to reject refunded/revoked/stale receipts. */
export async function hasApplePremium(token:unknown):Promise<boolean> {
  if(typeof token!=='string' || token.length>24000 || token.split('.').length!==3 || !appleVerificationConfigured()) return false
  const key=createHash('sha256').update(token).digest('hex')
  const old=cache.get(key)
  if(old && old.until>Date.now()) return old.active
  let roots:Buffer[]
  try { roots=['AppleIncRootCertificate.cer','AppleRootCA-G2.cer','AppleRootCA-G3.cer'].map(name=>readFileSync(join(process.cwd(),'certificates/apple',name))) } catch { return false }
  const environments=[Environment.PRODUCTION]
  if(process.env.APPLE_IAP_ALLOW_SANDBOX==='true') environments.push(Environment.SANDBOX)
  for(const environment of environments) {
    try {
      const verifier=new SignedDataVerifier(roots,true,environment,bundleId,6763881155)
      const supplied=await verifier.verifyAndDecodeTransaction(token)
      if(!supplied.originalTransactionId || !activeAppleTransaction(supplied)) continue
      const client=new AppStoreServerAPIClient(process.env.APPLE_IAP_PRIVATE_KEY!.replace(/\\n/g,'\n'),process.env.APPLE_IAP_KEY_ID!,process.env.APPLE_IAP_ISSUER_ID!,bundleId,environment)
      const result=await client.getAllSubscriptionStatuses(supplied.originalTransactionId)
      for(const group of result.data || []) for(const last of group.lastTransactions || []) {
        if(last.status!==Status.ACTIVE || !last.signedTransactionInfo) continue
        const current=await verifier.verifyAndDecodeTransaction(last.signedTransactionInfo)
        if(current.originalTransactionId===supplied.originalTransactionId && activeAppleTransaction(current)) {
          if(cache.size>=1000) cache.clear()
          cache.set(key,{until:Math.min(Date.now()+30000,current.expiresDate!),active:true})
          return true
        }
      }
    } catch { /* Missing configuration, failed verification, or unavailable Apple never grants premium. */ }
  }
  return false
}
