export const DEFAULT_CHURCH_PRIMARY = "#f59e0b"
export const DEFAULT_CHURCH_SECONDARY = "#0c1929"

export function validHexColor(value: unknown, fallback = DEFAULT_CHURCH_PRIMARY): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

function luminance(color: string): number {
  const channels = [1, 3, 5].map(start => {
    const value = parseInt(color.slice(start, start + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

export function contrastingText(color: string): "#ffffff" | "#000000" {
  const light = luminance(validHexColor(color))
  return (light + 0.05) / 0.05 > 1.05 / (light + 0.05) ? "#000000" : "#ffffff"
}

/** Lift a dark brand color only for small text on the app's existing dark surfaces. */
export function readableAccent(color: string): string {
  let result = validHexColor(color)
  const background = luminance(DEFAULT_CHURCH_SECONDARY)
  for (let step = 0; step < 20 && (luminance(result) + 0.05) / (background + 0.05) < 4.5; step++) {
    result = "#" + [1, 3, 5].map(start => Math.round(parseInt(result.slice(start, start + 2), 16) * 0.8 + 255 * 0.2).toString(16).padStart(2, "0")).join("")
  }
  return result
}

export function safeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2048 || /[\s\\]/.test(value)) return undefined
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}

export function safeLogoUrl(value: unknown): string | undefined {
  if (typeof value === "string" && /^\/(?!\/)[^\s\\]*$/.test(value)) return value
  return safeHttpsUrl(value)
}

export function safeEmailHref(value: unknown): string | undefined {
  return typeof value === "string" && value.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(value)
    ? `mailto:${encodeURIComponent(value).replace(/%40/g, "@")}` : undefined
}

export function safePhoneHref(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\+?[0-9 ()-]{6,30}$/.test(value)) return undefined
  const normalized = value.replace(/[ ()-]/g, "")
  return /^\+?[0-9]{6,15}$/.test(normalized) ? `tel:${normalized}` : undefined
}

export function validChurchCode(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{1,79}$/i.test(value)
}
