import test from "node:test"
import assert from "node:assert/strict"
import { contrastingText, readableAccent, validHexColor, safeHttpsUrl, safeLogoUrl, safeEmailHref, safePhoneHref, validChurchCode } from "../lib/church-branding.ts"

function luminance(color) {
  const values = [1, 3, 5].map(start => {
    const x = parseInt(color.slice(start, start + 2), 16) / 255
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  })
  return values[0] * .2126 + values[1] * .7152 + values[2] * .0722
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0] + .05) / (values[1] + .05)
}

test("configured colors remain valid and brand text meets normal-text contrast", () => {
  assert.equal(validHexColor("red; background:url(https://example.test)"), "#f59e0b")
  for (const color of ["#000000", "#ffffff", "#102a43", "#888888", "#faf333", "#8a2be2", "#cc0055"]) {
    assert.equal(validHexColor(color), color)
    assert.ok(contrast(color, contrastingText(color)) >= 4.5)
    assert.ok(contrast(readableAccent(color), "#0c1929") >= 4.5)
  }
})

test("church links reject unsafe schemes and keep contact addresses out of URI query fields", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,test", "http://example.test", "//example.test", "https://user:pass@example.test", "https://example.test\n"]) {
    assert.equal(safeHttpsUrl(value), undefined)
  }
  assert.equal(safeHttpsUrl("https://example.test/contact"), "https://example.test/contact")
  assert.equal(safeLogoUrl("/church-logo.png"), "/church-logo.png")
  assert.equal(safeLogoUrl("//untrusted.test/logo.png"), undefined)
  assert.equal(safeEmailHref("pastor@example.test"), "mailto:pastor@example.test")
  assert.equal(safeEmailHref("pastor@example.test\nBcc:other@example.test"), undefined)
  assert.equal(new URL(safeEmailHref("a?subject=oops@example.test")).search, "")
  assert.equal(safePhoneHref("+1 (555) 123-4567"), "tel:+15551234567")
  assert.equal(safePhoneHref("5551234567?body=test"), undefined)
})

test("church invitation codes are simple identifiers", () => {
  assert.ok(validChurchCode("cedar-hill"))
  assert.ok(validChurchCode("CEDAR-HILL"))
  assert.equal(validChurchCode("../other"), false)
  assert.equal(validChurchCode("cedar?church=other"), false)
})
