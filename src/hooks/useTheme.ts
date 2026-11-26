import { useEffect } from 'react'
import { useAppStore, THEMES } from '@/stores/app'

export function useThemeEffect() {
  const themeId = useAppStore((s) => s.theme)

  useEffect(() => {
    const t = THEMES[themeId]
    if (!t) return
    const r = document.documentElement.style
    r.setProperty('--theme-accent', t.accent)
    r.setProperty('--theme-accent-alt', t.accentAlt)
    r.setProperty('--theme-ambient-r', t.ambientR)
    r.setProperty('--theme-ambient-g', t.ambientG)
    r.setProperty('--theme-ambient-b', t.ambientB)
    r.setProperty('--theme-ambient2-r', t.ambient2R)
    r.setProperty('--theme-ambient2-g', t.ambient2G)
    r.setProperty('--theme-ambient2-b', t.ambient2B)
  }, [themeId])
}
