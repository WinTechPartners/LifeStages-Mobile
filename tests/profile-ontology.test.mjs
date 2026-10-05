import test from "node:test"
import assert from "node:assert/strict"
import { AGE_BANDS, toAnalyticsAgeBand, toPersonalizationAgeRange } from "../lib/age-bands.ts"
import { LIFELINE_TOPICS, LIFELINE_CATEGORIES, isLifeLineId, lifeLineUrl } from "../lib/lifelines.ts"

test("LifeLine routes preserve all 34 stable topic IDs and their categories", () => {
  assert.equal(LIFELINE_TOPICS.length, 34)
  assert.equal(new Set(LIFELINE_TOPICS.map(topic => topic.id)).size, 34)
  assert.equal(LIFELINE_CATEGORIES.length, 7)
  for (const topic of LIFELINE_TOPICS) {
    assert.ok(LIFELINE_CATEGORIES.some(category => category.id === topic.category))
    const url = new URL(lifeLineUrl(topic), "https://example.test")
    assert.equal(url.searchParams.get("topic"), topic.label)
    assert.equal(url.searchParams.get("lifelineId"), topic.id)
    assert.ok(isLifeLineId(topic.id))
  }
  assert.equal(isLifeLineId("made-up-topic"), false)
})

test("legacy age responses retain their actual resolution in analytics", () => {
  assert.equal(toAnalyticsAgeBand({ ageRange: "teens" }), "13-17")
  assert.equal(toAnalyticsAgeBand({ ageRange: "university" }), "legacy-18-23")
  assert.equal(toAnalyticsAgeBand({ ageRange: "adult" }), "legacy-24-64")
  assert.equal(toAnalyticsAgeBand({ ageRange: "senior" }), "legacy-65+")
  assert.equal(toAnalyticsAgeBand({}), undefined)
  assert.equal(toAnalyticsAgeBand({ ageBand: "unknown", ageRange: "unknown" }), undefined)
  for (const ageBand of AGE_BANDS) assert.equal(toAnalyticsAgeBand({ ageBand, ageRange: "adult" }), ageBand)
})

test("specific age selections continue to use compatible personalization keys", () => {
  assert.equal(toPersonalizationAgeRange({ ageBand: "13-17", ageRange: "adult" }), "teens")
  assert.equal(toPersonalizationAgeRange({ ageBand: "18-24" }), "university")
  assert.equal(toPersonalizationAgeRange({ ageBand: "18-24", ageRange: "adult" }), "adult")
  assert.equal(toPersonalizationAgeRange({ ageBand: "25-34", ageRange: "university" }), "adult")
  assert.equal(toPersonalizationAgeRange({ ageBand: "75+", ageRange: "adult" }), "senior")
  assert.equal(toPersonalizationAgeRange({ ageRange: "university" }), "university")
  assert.equal(toPersonalizationAgeRange({}), undefined)
})
