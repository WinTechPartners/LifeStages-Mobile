import 'core-js/stable'

// Older Android devices can have an older WebView even with a supported OS.
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function (milliseconds) {
    const controller = new AbortController()
    setTimeout(() => controller.abort(new DOMException('The operation timed out', 'TimeoutError')), milliseconds)
    return controller.signal
  }
}
if (!crypto.randomUUID && crypto.getRandomValues) {
  crypto.randomUUID = function () {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 15) | 64
    bytes[8] = (bytes[8] & 63) | 128
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
  }
}
