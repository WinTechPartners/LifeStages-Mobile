/**
 * Native Feature Bridge
 * 
 * Provides access to Capacitor native plugins with graceful
 * fallback when running in a web browser (dev mode).
 * 
 * These native features are what differentiate a real mobile app
 * from a "website wrapper" — Apple requires them for App Store approval.
 */

// Detect if running inside Capacitor native shell
export function isNative(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).Capacitor?.isNativePlatform?.()
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web'
  const cap = (window as any).Capacitor
  if (!cap) return 'web'
  return cap.getPlatform?.() || 'web'
}

/**
 * Haptic Feedback — makes taps feel native
 */
export async function hapticTap() {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (e) {
    // Haptics not available — silent fail
  }
}

export async function hapticSuccess() {
  if (!isNative()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Success })
  } catch (e) {}
}

export async function hapticWarning() {
  if (!isNative()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Warning })
  } catch (e) {}
}

export async function hapticMedium() {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch (e) {}
}

export async function hapticHeavy() {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Heavy })
  } catch (e) {}
}

/**
 * Push Notifications — daily verse reminders
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    const result = await PushNotifications.requestPermissions()
    if (result.receive === 'granted') {
      await PushNotifications.register()
      return true
    }
    return false
  } catch (e) {
    console.error('[Push] Permission request failed:', e)
    return false
  }
}

export async function setupPushListeners(
  onToken: (token: string) => void,
  onNotification: (data: any) => void,
) {
  if (!isNative()) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    
    PushNotifications.addListener('registration', (token) => {
      console.log('[Push] Registered with token:', token.value)
      onToken(token.value)
    })

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registration error:', error)
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Received:', notification)
      onNotification(notification)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Action:', action)
      onNotification(action.notification)
    })
  } catch (e) {
    console.error('[Push] Setup failed:', e)
  }
}

/**
 * Native Share Sheet — for sharing verses
 */
export async function nativeShare(options: {
  title: string
  text: string
  url?: string
}): Promise<boolean> {
  if (!isNative()) {
    // Web fallback
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(options)
        return true
      } catch { return false }
    }
    // Clipboard fallback
    if (typeof navigator !== 'undefined') {
      await navigator.clipboard.writeText(`${options.text}\n${options.url || ''}`)
      return true
    }
    return false
  }
  
  try {
    const { Share } = await import('@capacitor/share')
    await Share.share(options)
    return true
  } catch (e) {
    return false
  }
}

/**
 * Status Bar — control appearance on native
 */
export async function setStatusBarDark() {
  if (!isNative()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#0c1929' })
  } catch (e) {}
}

/**
 * Splash Screen — hide after app loads
 */
export async function hideSplash() {
  if (!isNative()) return
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch (e) {}
}

/**
 * Offline Detection — cache verses for offline access (per-date)
 */
export interface CachedVerse {
  reference: string
  text: string
  interpretation?: string
  heroImage?: string
  date: string
  cachedAt: string
}

export function cacheVerseForOffline(verse: {
  reference: string
  text: string
  interpretation?: string
  heroImage?: string
}) {
  try {
    const today = new Date().toISOString().split('T')[0]
    // Legacy single-verse cache
    localStorage.setItem('offline_web_last_verse', JSON.stringify({
      ...verse,
      cachedAt: new Date().toISOString(),
    }))
    // Per-date cache for swipe history
    const historyKey = `votd_${today}`
    localStorage.setItem(historyKey, JSON.stringify({
      ...verse,
      date: today,
      cachedAt: new Date().toISOString(),
    }))
    // Track cached dates (keep last 8)
    const datesKey = 'votd_web_cached_dates'
    const dates: string[] = JSON.parse(localStorage.getItem(datesKey) || '[]')
    if (!dates.includes(today)) {
      dates.unshift(today)
      if (dates.length > 8) dates.pop()
      localStorage.setItem(datesKey, JSON.stringify(dates))
    }
  } catch (e) {}
}

export function getOfflineVerse(): CachedVerse | null {
  try {
    const cached = localStorage.getItem('offline_web_last_verse')
    return cached ? JSON.parse(cached) : null
  } catch (e) {
    return null
  }
}

/**
 * Get a cached verse for a specific date
 */
export function getCachedVerseForDate(date: string): CachedVerse | null {
  try {
    const cached = localStorage.getItem(`votd_web_v1_${date}`)
    return cached ? JSON.parse(cached) : null
  } catch (e) {
    return null
  }
}

/**
 * Cache a verse for a specific date (used when fetching history)
 */
export function cacheVerseForDate(date: string, verse: {
  reference: string
  text: string
  interpretation?: string
  heroImage?: string
}) {
  try {
    localStorage.setItem(`votd_web_v1_${date}`, JSON.stringify({
      ...verse,
      date,
      cachedAt: new Date().toISOString(),
    }))
    const datesKey = 'votd_web_cached_dates'
    const dates: string[] = JSON.parse(localStorage.getItem(datesKey) || '[]')
    if (!dates.includes(date)) {
      dates.push(date)
      dates.sort((a, b) => b.localeCompare(a))
      if (dates.length > 8) dates.pop()
      localStorage.setItem(datesKey, JSON.stringify(dates))
    }
  } catch (e) {}
}

/**
 * Get all cached dates
 */
export function getCachedDates(): string[] {
  try {
    return JSON.parse(localStorage.getItem('votd_web_cached_dates') || '[]')
  } catch (e) {
    return []
  }
}

/**
 * Network Status — detect offline state
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

export function onNetworkChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
