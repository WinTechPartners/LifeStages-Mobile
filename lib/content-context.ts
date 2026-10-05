/** Identifiers and local cache scope for a selected content context. */
export function optionalUuid(value: unknown): string | undefined {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase() : undefined
}

export function contentCacheKey(module: string, contentId: string, churchId?: string | null, language?: string): string {
  let profile: Record<string, unknown> = {}
  try {
    const saved = JSON.parse(localStorage.getItem('userProfile') || '{}')
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) profile = saved
  } catch { /* empty profile */ }
  return `content_v2:${JSON.stringify([
    module, contentId, churchId || profile.churchId || 'unaffiliated',
    profile.ageRange || profile.age || 'adult',
    language || profile.language || 'en',
    profile.stageSituation || profile.lifeStage || '', profile.contentStyle || 'casual',
  ])}`
}
