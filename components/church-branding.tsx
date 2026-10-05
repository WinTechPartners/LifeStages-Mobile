"use client"

import { useEffect } from "react"
import { useChurch } from "@/context/church-context"
import { contrastingText, readableAccent, validHexColor, DEFAULT_CHURCH_SECONDARY } from "@/lib/church-branding"

/** Mount once inside ChurchProvider. Removing/changing the church resets all branding. */
export function ChurchBranding() {
  const { church } = useChurch()
  useEffect(() => {
    if (!church) return
    const root = document.documentElement
    const originalTitle = document.title
    const primary = validHexColor(church.primary_color)
    const secondary = validHexColor(church.secondary_color, DEFAULT_CHURCH_SECONDARY)
    const properties = {
      "--church-primary": primary,
      "--church-on-primary": contrastingText(primary),
      "--church-secondary": secondary,
      "--church-on-secondary": contrastingText(secondary),
      "--church-accent": readableAccent(primary),
    }
    const previous = Object.fromEntries(Object.keys(properties).map(name => [name, root.style.getPropertyValue(name)]))
    const alreadyBranded = root.classList.contains("church-branded")
    root.classList.add("church-branded")
    Object.entries(properties).forEach(([name, value]) => root.style.setProperty(name, value))
    document.title = `${church.name} · LifeStages`
    return () => {
      Object.keys(properties).forEach(name => previous[name] ? root.style.setProperty(name, previous[name]) : root.style.removeProperty(name))
      if (!alreadyBranded) root.classList.remove("church-branded")
      document.title = originalTitle
    }
  }, [church?.id, church?.name, church?.primary_color, church?.secondary_color])
  return null
}
