"use client"
import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { assetUrl } from '@/lib/asset-url'

/** Keep failed network images from leaving a broken-image icon in the customer interface. */
export function AppImage({ src, alt, className, onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  if (failed) return <div className={`${className || ''} flex items-center justify-center bg-slate-800/60 p-4 text-center text-sm text-slate-300`} role="img" aria-label={`${alt || 'Image'} unavailable`}>
    {alt ? `${alt} is currently unavailable` : 'Image unavailable'}
  </div>
  return <img {...props} src={typeof src === 'string' ? assetUrl(src) : src} alt={alt || ''} className={className} onError={event => { setFailed(true); onError?.(event) }} />
}
