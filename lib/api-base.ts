import { getAppleTransaction } from './native-iap'
/**
 * API Base URL resolver for mobile vs web builds.
 * 
 * In mobile (Capacitor) builds, the app runs from local static files,
 * so API calls must go to the remote Vercel backend.
 * In web builds, relative URLs work fine since Next.js serves both.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Returns the full URL for an API endpoint.
 * - Mobile build: https://bibleforlifestages.com/api/today-verse
 * - Web build: /api/today-verse
 */
export function apiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

/**
 * Fetch wrapper that automatically resolves API URLs.
 * Drop-in replacement for fetch() for API calls.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  let request = init
  if (typeof window !== 'undefined' && typeof init?.body === 'string') {
    try {
      const body = JSON.parse(init.body)
      const profile = JSON.parse(localStorage.getItem('userProfile') || '{}')
      request = { ...init, body: JSON.stringify({ profile, ...body, appleTransaction: getAppleTransaction() || undefined, email: profile.email || localStorage.getItem('bible_user_email') }) }
    } catch { /* Non-JSON requests pass through. */ }
  }
  return fetch(apiUrl(path), request)
}
