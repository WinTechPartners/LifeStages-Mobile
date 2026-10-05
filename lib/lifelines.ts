/** Stable mobile LifeLine IDs. Labels may change without changing analytics identity. */
export const LIFELINE_CATEGORIES = [
  {
    "id": "family",
    "name": "Family & Relationships",
    "tagline": "The struggles of connection, conflict, and the breakdown of the home",
    "icon": "family_restroom",
    "color": "rose"
  },
  {
    "id": "health",
    "name": "Health & Loss",
    "tagline": "The physical toll of life and the grief of what's been taken away",
    "icon": "healing",
    "color": "emerald"
  },
  {
    "id": "mental",
    "name": "Mental & Emotional",
    "tagline": "The internal climate of the mind and soul",
    "icon": "psychology",
    "color": "blue"
  },
  {
    "id": "work",
    "name": "Work & Finances",
    "tagline": "The pressure of provision, productivity, and future security",
    "icon": "work",
    "color": "amber"
  },
  {
    "id": "faith",
    "name": "Faith & Purpose",
    "tagline": "The vertical relationship with God and the search for 'Why?'",
    "icon": "church",
    "color": "purple"
  },
  {
    "id": "identity",
    "name": "Self & Identity",
    "tagline": "The battle for how one sees themselves",
    "icon": "person",
    "color": "cyan"
  },
  {
    "id": "trials",
    "name": "Trials & Temptation",
    "tagline": "The active fight against destructive patterns",
    "icon": "gpp_maybe",
    "color": "orange"
  }
] as const

export const LIFELINE_TOPICS = [
  {
    "id": "struggling-with-family",
    "label": "Struggling with Family",
    "icon": "home",
    "category": "family",
    "description": "General tension or estrangement"
  },
  {
    "id": "impact-of-divorce",
    "label": "Impact of Divorce",
    "icon": "link_off",
    "category": "family",
    "description": "Parental, personal, or late-stage/gray divorce"
  },
  {
    "id": "relationship-conflicts",
    "label": "Relationship Conflicts",
    "icon": "sync_problem",
    "category": "family",
    "description": "Friendship drama, dating, or marriage rifts"
  },
  {
    "id": "wayward-loved-ones",
    "label": "Wayward Loved Ones",
    "icon": "directions_walk",
    "category": "family",
    "description": "The 'Prodigal' child, sibling, or spouse"
  },
  {
    "id": "forgiving-someone",
    "label": "Forgiving Someone",
    "icon": "handshake",
    "category": "family",
    "description": "The internal battle of letting go"
  },
  {
    "id": "difficulty-trusting-others",
    "label": "Difficulty Trusting Others",
    "icon": "shield",
    "category": "family",
    "description": "Guardedness after betrayal"
  },
  {
    "id": "physical-health-battles",
    "label": "Physical Health Battles",
    "icon": "local_hospital",
    "category": "health",
    "description": "New diagnosis or acute illness"
  },
  {
    "id": "chronic-pain-disability",
    "label": "Chronic Pain / Disability",
    "icon": "accessible",
    "category": "health",
    "description": "Long-term physical limitations"
  },
  {
    "id": "grieving-a-loss",
    "label": "Grieving a Loss",
    "icon": "sentiment_sad",
    "category": "health",
    "description": "Death of a friend, spouse, or mentor"
  },
  {
    "id": "infertility-pregnancy-loss",
    "label": "Infertility & Pregnancy Loss",
    "icon": "child_friendly",
    "category": "health",
    "description": "Parental loss, teen pregnancy, or biological struggle"
  },
  {
    "id": "special-needs-autism",
    "label": "Special Needs & Autism",
    "icon": "neurology",
    "category": "health",
    "description": "The unique weight of neurodiversity for the self or caregiver"
  },
  {
    "id": "caring-for-aging-parents",
    "label": "Caring for Aging Parents",
    "icon": "elderly",
    "category": "health",
    "description": "The 'Sandwich Generation' crisis"
  },
  {
    "id": "feeling-stressed",
    "label": "Feeling Stressed",
    "icon": "speed",
    "category": "mental",
    "description": "The daily weight of 'too much'"
  },
  {
    "id": "anxiety-worry",
    "label": "Anxiety & Worry",
    "icon": "sentiment_stressed",
    "category": "mental",
    "description": "Fear of what is coming"
  },
  {
    "id": "depression-low-mood",
    "label": "Depression & Low Mood",
    "icon": "cloud",
    "category": "mental",
    "description": "The heaviness of 'not enough'"
  },
  {
    "id": "burnout-exhaustion",
    "label": "Burnout & Exhaustion",
    "icon": "battery_0_bar",
    "category": "mental",
    "description": "Running on empty"
  },
  {
    "id": "anger-frustration",
    "label": "Anger & Frustration",
    "icon": "mood_bad",
    "category": "mental",
    "description": "Simmering resentment or outbursts"
  },
  {
    "id": "feeling-invisible",
    "label": "Feeling Invisible",
    "icon": "visibility_off",
    "category": "mental",
    "description": "A lack of recognition or value"
  },
  {
    "id": "financial-issues",
    "label": "Financial Issues",
    "icon": "money_off",
    "category": "work",
    "description": "Debt, fixed income, or scarcity"
  },
  {
    "id": "workplace-school-tension",
    "label": "Workplace or School Tension",
    "icon": "business",
    "category": "work",
    "description": "Conflict with bosses, teachers, or peers"
  },
  {
    "id": "career-academic-uncertainty",
    "label": "Career or Academic Uncertainty",
    "icon": "explore",
    "category": "work",
    "description": "Not knowing the next move"
  },
  {
    "id": "making-hard-decision",
    "label": "Making a Hard Decision",
    "icon": "call_split",
    "category": "work",
    "description": "Ethics, crossroads, and big pivots"
  },
  {
    "id": "continuing-faith-journey",
    "label": "Continuing My Faith Journey",
    "icon": "route",
    "category": "faith",
    "description": "Seeking growth and next steps"
  },
  {
    "id": "questioning-beliefs",
    "label": "Questioning My Beliefs",
    "icon": "help",
    "category": "faith",
    "description": "Doubt and deconstruction"
  },
  {
    "id": "finding-purpose",
    "label": "Finding My Purpose",
    "icon": "lightbulb",
    "category": "faith",
    "description": "The 'What am I here for?' cry"
  },
  {
    "id": "feeling-far-from-god",
    "label": "Feeling Far from God",
    "icon": "cloud_off",
    "category": "faith",
    "description": "Spiritual dryness and silence"
  },
  {
    "id": "unanswered-prayer",
    "label": "Unanswered Prayer",
    "icon": "hourglass_empty",
    "category": "faith",
    "description": "Wrestling with God's 'No' or 'Not yet'"
  },
  {
    "id": "doubting-my-value",
    "label": "Doubting My Value",
    "icon": "self_improvement",
    "category": "identity",
    "description": "Low self-worth and identity crisis"
  },
  {
    "id": "body-image-struggles",
    "label": "Body Image Struggles",
    "icon": "body_system",
    "category": "identity",
    "description": "Comparing the physical self to others"
  },
  {
    "id": "comparison-envy",
    "label": "Comparison & Envy",
    "icon": "compare",
    "category": "identity",
    "description": "The 'thief of joy' in a social media world"
  },
  {
    "id": "guilt-shame",
    "label": "Dealing with Guilt & Shame",
    "icon": "weight",
    "category": "identity",
    "description": "The weight of past or present mistakes"
  },
  {
    "id": "addiction-issues",
    "label": "Addiction Issues",
    "icon": "psychology_alt",
    "category": "trials",
    "description": "Substances, digital loops, or secret habits"
  },
  {
    "id": "battling-temptation",
    "label": "Battling Temptation",
    "icon": "shield",
    "category": "trials",
    "description": "The moment-by-moment choice for integrity"
  },
  {
    "id": "fear-of-future",
    "label": "Fear of the Future",
    "icon": "schedule",
    "category": "trials",
    "description": "Paralysis regarding the 'unknown'"
  }
] as const

export type LifeLineId = typeof LIFELINE_TOPICS[number]['id']
export type LifeLineCategoryId = typeof LIFELINE_CATEGORIES[number]['id']

export function isLifeLineId(value: unknown): value is LifeLineId {
  return typeof value === "string" && LIFELINE_TOPICS.some(topic => topic.id === value)
}

export function lifeLineUrl(topic: { id: string; label: string }): string {
  return '/deep-dive?topic=' + encodeURIComponent(topic.label) + '&lifelineId=' + encodeURIComponent(topic.id)
}
