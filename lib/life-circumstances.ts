import { resolveAgeDeclaration, type AgeProfile, type AnalyticsAgeBand } from "./age-bands"

export const CIRCUMSTANCE_TAXONOMY_VERSION = 2 as const
export const CIRCUMSTANCE_GROUPS = [
  { id: "work-education", label: "Work & education", labelVi: "Công việc và học tập", icon: "work" },
  { id: "parenting", label: "Parenting", labelVi: "Nuôi dạy con", icon: "family_restroom" },
  { id: "relationships", label: "Relationships", labelVi: "Mối quan hệ", icon: "favorite" },
  { id: "other", label: "Other circumstances", labelVi: "Hoàn cảnh khác", icon: "spa" },
] as const
export const LIFE_CIRCUMSTANCES = [
  { id: "studying", group: "work-education", label: "Studying", labelVi: "Đang học" },
  { id: "starting-new-job", group: "work-education", label: "Starting a new job", labelVi: "Bắt đầu công việc mới" },
  { id: "working", group: "work-education", label: "Working", labelVi: "Đang đi làm" },
  { id: "seeking-work", group: "work-education", label: "Seeking work", labelVi: "Đang tìm việc" },
  { id: "career-change", group: "work-education", label: "Changing careers", labelVi: "Đang chuyển nghề" },
  { id: "retired", group: "work-education", label: "Retired", labelVi: "Đã nghỉ hưu" },
  { id: "expecting-child", group: "parenting", label: "Expecting a child", labelVi: "Đang mong đón con" },
  { id: "new-baby", group: "parenting", label: "Bringing home a new baby", labelVi: "Đón em bé về nhà" },
  { id: "parenting-young-children", group: "parenting", label: "Parenting young children", labelVi: "Nuôi con nhỏ" },
  { id: "parenting-teens", group: "parenting", label: "Parenting teenagers", labelVi: "Nuôi con tuổi thiếu niên" },
  { id: "parenting-adult-children", group: "parenting", label: "Parent of adult children", labelVi: "Có con đã trưởng thành" },
  { id: "single", group: "relationships", label: "Single", labelVi: "Độc thân" },
  { id: "partnered-married", group: "relationships", label: "Partnered / married", labelVi: "Có người yêu / đã kết hôn" },
  { id: "separated-divorced", group: "relationships", label: "Separated / divorced", labelVi: "Ly thân / đã ly hôn" },
  { id: "widowed", group: "relationships", label: "Widowed", labelVi: "Góa vợ / chồng" },
  { id: "caregiving", group: "other", label: "Caregiving", labelVi: "Chăm sóc người thân" },
  { id: "relocation", group: "other", label: "Moving / relocating", labelVi: "Đang chuyển nơi ở" },
  { id: "empty-nest", group: "other", label: "Adjusting to an empty nest", labelVi: "Thích nghi khi con ra ở riêng" },
  { id: "bereavement", group: "other", label: "Bereavement", labelVi: "Đang chịu mất mát người thân" },
] as const
export type LifeCircumstanceId = typeof LIFE_CIRCUMSTANCES[number]["id"]
export const LIFE_CIRCUMSTANCE_IDS = LIFE_CIRCUMSTANCES.map(item => item.id)
export const LEGACY_STAGE_SITUATIONS = ["General", "New beginnings", "Struggling", "Transitions"] as const

export function isLifeCircumstanceId(value: unknown): value is LifeCircumstanceId {
  return typeof value === "string" && (LIFE_CIRCUMSTANCE_IDS as readonly string[]).includes(value)
}

/** Only declarations are accepted. Overlapping choices are not reinterpreted or made exclusive. */
export function normalizeLifeCircumstances(input: unknown): LifeCircumstanceId[] {
  if (!Array.isArray(input)) return []
  const selected = new Set(input.filter(isLifeCircumstanceId))
  return LIFE_CIRCUMSTANCE_IDS.filter(id => selected.has(id))
}

type DeclarationProfile = AgeProfile & {
  lifeCircumstances?: unknown; circumstanceTaxonomyVersion?: unknown; circumstancesDeclaredAt?: unknown
  declarationsUpdatedAt?: unknown; stageSituation?: unknown; declarationHistory?: unknown
}
export interface DeclarationSnapshot {
  snapshotVersion: 2; recordedAt: string; declaredAt: string | null
  age: { value: AnalyticsAgeBand; taxonomyVersion: 1 | 2; declaredAt: string | null } | null
  lifeCircumstances: LifeCircumstanceId[]; circumstanceTaxonomyVersion: 2 | null; circumstancesDeclaredAt: string | null
  legacyStageSituation?: string
}
const timestamp = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) && Number.isFinite(Date.parse(value))

/** Deliberately omits name, email, church association, care permission, and free-text interests. */
export function buildDeclarationSnapshot(profile: DeclarationProfile, recordedAt = new Date().toISOString()): DeclarationSnapshot {
  if (!timestamp(recordedAt)) throw new Error("A valid declaration record time is required")
  const age = resolveAgeDeclaration(profile)
  const legacy = typeof profile.stageSituation === "string" && (LEGACY_STAGE_SITUATIONS as readonly string[]).includes(profile.stageSituation) ? profile.stageSituation : undefined
  return {
    snapshotVersion: 2, recordedAt, declaredAt: timestamp(profile.declarationsUpdatedAt) ? profile.declarationsUpdatedAt : null,
    age: age ? { value: age.value, taxonomyVersion: age.taxonomyVersion, declaredAt: timestamp(profile.ageDeclaredAt) ? profile.ageDeclaredAt : null } : null,
    lifeCircumstances: normalizeLifeCircumstances(profile.lifeCircumstances),
    circumstanceTaxonomyVersion: profile.circumstanceTaxonomyVersion === 2 ? 2 : null,
    circumstancesDeclaredAt: timestamp(profile.circumstancesDeclaredAt) ? profile.circumstancesDeclaredAt : null,
    ...(legacy ? { legacyStageSituation: legacy } : {}),
  }
}

/** Keep the original observed resolution and a bounded device-local declaration history. */
export function recordDeclarationChange<T extends DeclarationProfile>(previous: DeclarationProfile, next: T, kind: "age" | "circumstances", at = new Date().toISOString()): T & { declarationHistory: DeclarationSnapshot[]; declarationsUpdatedAt: string } {
  const prior = buildDeclarationSnapshot(previous, at)
  const dated = { ...next, declarationsUpdatedAt: at,
    ...(kind === "age" ? { ageTaxonomyVersion: 2, ageDeclaredAt: at } : { circumstanceTaxonomyVersion: 2, circumstancesDeclaredAt: at }),
  }
  const current = buildDeclarationSnapshot(dated, at)
  const history = Array.isArray(previous.declarationHistory) ? previous.declarationHistory.filter((entry): entry is DeclarationSnapshot => entry?.snapshotVersion === 2 && timestamp(entry.recordedAt)).map(entry => {
    // Rebuild a closed snapshot so old or injected identity fields never enter this history.
    const rebuilt = buildDeclarationSnapshot({ ageBand: entry.age?.value, ageRange: entry.age?.value === "legacy-18-23" ? "university" : entry.age?.value === "legacy-24-64" ? "adult" : entry.age?.value === "legacy-65+" ? "senior" : undefined, ageTaxonomyVersion: entry.age?.taxonomyVersion, ageDeclaredAt: entry.age?.declaredAt, lifeCircumstances: entry.lifeCircumstances, circumstanceTaxonomyVersion: entry.circumstanceTaxonomyVersion, circumstancesDeclaredAt: entry.circumstancesDeclaredAt, declarationsUpdatedAt: entry.declaredAt, stageSituation: entry.legacyStageSituation }, entry.recordedAt)
    return rebuilt
  }) : []
  const sameDeclaration = (a: DeclarationSnapshot, b: DeclarationSnapshot) => JSON.stringify({ ...a, recordedAt: "" }) === JSON.stringify({ ...b, recordedAt: "" })
  if (!history.length || !sameDeclaration(history[history.length - 1], prior)) history.push(prior)
  if (!sameDeclaration(history[history.length - 1], current)) history.push(current)
  return { ...dated, declarationHistory: history.slice(-12) }
}
