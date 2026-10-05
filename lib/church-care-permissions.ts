export const CHURCH_CARE_PERMISSION_VERSION = 1

export interface ChurchCarePermission {
  version: typeof CHURCH_CARE_PERMISSION_VERSION
  updatedAt: string | null
  allowLeadershipConnection: boolean
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

export function canonicalCareChurchId(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase() : null
}

/** Unknown versions, missing choices, and damaged data always mean no permission. */
export function readChurchCarePermission(rawProfile: string | null, churchId: unknown): ChurchCarePermission {
  const fallback: ChurchCarePermission = { version: CHURCH_CARE_PERMISSION_VERSION, updatedAt: null, allowLeadershipConnection: false }
  const id = canonicalCareChurchId(churchId)
  if (!id || !rawProfile) return fallback
  try {
    const profile: unknown = JSON.parse(rawProfile)
    if (!record(profile) || !record(profile.churchCarePermissions)) return fallback
    const permission = profile.churchCarePermissions[id]
    if (!record(permission) || permission.version !== CHURCH_CARE_PERMISSION_VERSION || typeof permission.allowLeadershipConnection !== "boolean" || typeof permission.updatedAt !== "string" || !Number.isFinite(Date.parse(permission.updatedAt))) return fallback
    return { version: CHURCH_CARE_PERMISSION_VERSION, updatedAt: permission.updatedAt, allowLeadershipConnection: permission.allowLeadershipConnection }
  } catch { return fallback }
}

/** Merge the latest saved profile; never replace a damaged profile with a blank one. */
export function updateChurchCarePermission(rawProfile: string | null, churchId: unknown, allowLeadershipConnection: boolean, updatedAt = new Date().toISOString()): string {
  const id = canonicalCareChurchId(churchId)
  if (!id) throw new Error("A resolved church ID is required")
  if (typeof allowLeadershipConnection !== "boolean" || !Number.isFinite(Date.parse(updatedAt))) throw new Error("Invalid care permission")
  const profile: unknown = rawProfile === null ? {} : JSON.parse(rawProfile)
  if (!record(profile)) throw new Error("The saved profile could not be read")
  if (profile.churchCarePermissions !== undefined && !record(profile.churchCarePermissions)) throw new Error("Saved care permissions could not be read")
  return JSON.stringify({
    ...profile,
    churchCarePermissions: {
      ...(record(profile.churchCarePermissions) ? profile.churchCarePermissions : {}),
      [id]: { version: CHURCH_CARE_PERMISSION_VERSION, updatedAt, allowLeadershipConnection },
    },
  })
}
