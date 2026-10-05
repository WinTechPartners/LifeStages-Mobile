/** Root-relative API image links must resolve against the shared backend in a bundled native app. */
export function assetUrl(source: string | undefined): string | undefined {
  if (!source) return undefined
  if (source.startsWith('/') && !source.startsWith('//')) return `${(process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '')}${source}`
  return source
}
