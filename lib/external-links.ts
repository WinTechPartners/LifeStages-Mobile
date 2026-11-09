import { AppLauncher } from '@capacitor/app-launcher'
import { isNative } from './native-features'

const musicHosts = new Set(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','open.spotify.com','spotify.com','www.spotify.com','suno.ai','www.suno.ai','suno.com','www.suno.com'])

export async function openMusicLink(value: string): Promise<void> {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !musicHosts.has(url.hostname)) throw new Error('Unsupported music link')
  if (isNative()) {
    const result = await AppLauncher.openUrl({ url: url.href })
    if (!result.completed) throw new Error('Unable to open music link')
    return
  }
  const opened = window.open(url.href, '_blank')
  if (!opened) throw new Error('The browser blocked the music link')
  opened.opener = null
}
