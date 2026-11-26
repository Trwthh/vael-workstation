import { create } from 'zustand'

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}
function saveLocal(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export type Page =
  | 'dashboard'
  | 'main-agent'
  | 'search'
  | 'supervisor'
  | 'agent-manager'
  | 'personas'
  | 'code-editor'
  | 'project-manager'
  | 'game-modding'
  | 'cybersecurity'
  | 'reverse-engineering'
  | 'obsidian-memory'
  | 'model-manager'
  | 'tool-integrations'
  | 'terminal'
  | 'task-queue'
  | 'build-manager'
  | 'support'
  | 'settings'

export interface UserProfile {
  name: string
  avatar: string | null
  bio: string
  email: string
}

export interface RefusalLog {
  id: string
  ts: number
  model: string
  prompt: string
  reason: string
  resolution: string
}

export interface ChatSession {
  id: string
  title: string
  createdAt: number
}

export type StartupAnimation = 'shatter' | 'pulse' | 'glitch'

export type ThemeId = 'midnight' | 'noir' | 'ocean' | 'dusk'

export interface ThemeDef {
  id: ThemeId
  name: string
  bg0: string
  bg1: string
  accent: string
  accentAlt: string
  ambientR: string
  ambientG: string
  ambientB: string
  ambient2R: string
  ambient2G: string
  ambient2B: string
}

export const THEMES: Record<ThemeId, ThemeDef> = {
  midnight: {
    id: 'midnight', name: 'Midnight',
    bg0: '#0f0f11', bg1: '#161619',
    accent: '#5c7cfa', accentAlt: '#3b5bdb',
    ambientR: '110', ambientG: '120', ambientB: '220',
    ambient2R: '90', ambient2G: '110', ambient2B: '200',
  },
  noir: {
    id: 'noir', name: 'Noir',
    bg0: '#0a0a0a', bg1: '#111111',
    accent: '#888888', accentAlt: '#555555',
    ambientR: '100', ambientG: '100', ambientB: '110',
    ambient2R: '80', ambient2G: '80', ambient2B: '90',
  },
  ocean: {
    id: 'ocean', name: 'Ocean',
    bg0: '#0d1117', bg1: '#161b22',
    accent: '#58a6ff', accentAlt: '#1f6feb',
    ambientR: '40', ambientG: '100', ambientB: '200',
    ambient2R: '30', ambient2G: '80', ambient2B: '180',
  },
  dusk: {
    id: 'dusk', name: 'Dusk',
    bg0: '#15121a', bg1: '#1c1824',
    accent: '#a78bfa', accentAlt: '#7c3aed',
    ambientR: '130', ambientG: '90', ambientB: '230',
    ambient2R: '110', ambient2G: '70', ambient2B: '200',
  },
}

interface AppState {
  page: Page
  sidebarCollapsed: boolean
  sidebarWidth: number
  moreExpanded: boolean
  settingsOpen: boolean
  settingsTab: string | null
  startupDone: boolean
  startupAnimation: StartupAnimation
  setupComplete: boolean
  theme: ThemeId
  profile: UserProfile
  refusalLogs: RefusalLog[]
  promptRewriteEnabled: boolean
  sessions: ChatSession[]
  activeSessionId: string | null
  sessionsLoaded: boolean
  setPage: (page: Page) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarWidth: (w: number) => void
  toggleMore: () => void
  openSettings: (tab?: string) => void
  closeSettings: () => void
  setStartupDone: () => void
  setStartupAnimation: (v: StartupAnimation) => void
  completeSetup: () => void
  setTheme: (id: ThemeId) => void
  updateProfile: (patch: Partial<UserProfile>) => void
  hydrateProfileFromIPC: () => Promise<void>
  addRefusalLog: (log: RefusalLog) => void
  clearRefusalLogs: () => void
  setPromptRewrite: (v: boolean) => void
  loadSessions: () => Promise<void>
  createSession: (title?: string) => void
  setActiveSession: (id: string | null) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, title: string) => void
}

const DEMO_SESSIONS: ChatSession[] = [
  { id: 'demo-1', title: 'Fabric mod cheat structure', createdAt: Date.now() - 1800000 },
  { id: 'demo-2', title: 'AimbotModule implementation', createdAt: Date.now() - 18000000 },
  { id: 'demo-3', title: 'ESP rendering overlay', createdAt: Date.now() - 172800000 },
  { id: 'demo-4', title: 'Kill aura & combat mods', createdAt: Date.now() - 345600000 },
  { id: 'demo-5', title: 'X-ray ore finder module', createdAt: Date.now() - 864000000 },
]

const DEFAULT_PROFILE: UserProfile = { name: 'User', avatar: null, bio: '', email: '' }

export const useAppStore = create<AppState>((set) => ({
  page: 'dashboard',
  sidebarCollapsed: loadLocal('vael:sidebarCollapsed', false),
  sidebarWidth: loadLocal('vael:sidebarWidth', 260),
  moreExpanded: false,
  settingsOpen: false,
  settingsTab: null,
  startupDone: false,
  startupAnimation: loadLocal<StartupAnimation>('vael:startupAnimation', 'shatter'),
  setupComplete: loadLocal('vael:setupComplete', false),
  theme: loadLocal<ThemeId>('vael:theme', 'midnight'),
  profile: loadLocal<UserProfile>('vael:profile', DEFAULT_PROFILE),
  refusalLogs: [],
  promptRewriteEnabled: loadLocal('vael:promptRewrite', true),
  sessions: [],
  activeSessionId: null,
  sessionsLoaded: false,
  setPage: (page) => set({ page }),
  toggleSidebar: () => set((s) => {
    saveLocal('vael:sidebarCollapsed', !s.sidebarCollapsed)
    return { sidebarCollapsed: !s.sidebarCollapsed }
  }),
  setSidebarCollapsed: (collapsed) => {
    saveLocal('vael:sidebarCollapsed', collapsed)
    set({ sidebarCollapsed: collapsed })
  },
  setSidebarWidth: (w) => {
    const clamped = Math.max(200, Math.min(420, w))
    saveLocal('vael:sidebarWidth', clamped)
    set({ sidebarWidth: clamped })
  },
  toggleMore: () => set((s) => ({ moreExpanded: !s.moreExpanded })),
  openSettings: (tab) => set({ settingsOpen: true, settingsTab: tab ?? null }),
  closeSettings: () => set({ settingsOpen: false, settingsTab: null }),
  setStartupDone: () => set({ startupDone: true }),
  setStartupAnimation: (v) => {
    saveLocal('vael:startupAnimation', v)
    set({ startupAnimation: v })
  },
  completeSetup: () => {
    saveLocal('vael:setupComplete', true)
    set({ setupComplete: true })
  },
  setTheme: (id) => {
    saveLocal('vael:theme', id)
    set({ theme: id })
  },
  updateProfile: (patch) => set((s) => {
    const profile = { ...s.profile, ...patch }
    saveLocal('vael:profile', profile)
    if (patch.name !== undefined) {
      window.electronAPI?.profile.set('displayName', profile.name).catch(() => {})
    }
    if (patch.avatar !== undefined) {
      window.electronAPI?.profile.set('avatar', profile.avatar ?? '').catch(() => {})
    }
    if (patch.email !== undefined) {
      window.electronAPI?.profile.set('email', profile.email).catch(() => {})
    }
    if (patch.bio !== undefined) {
      window.electronAPI?.profile.set('bio', profile.bio).catch(() => {})
    }
    return { profile }
  }),
  hydrateProfileFromIPC: async () => {
    try {
      const data = await window.electronAPI?.profile.get()
      if (!data) return
      const current = useAppStore.getState().profile
      const patch: Partial<UserProfile> = {}
      if (current.name === 'User' && data.displayName && data.displayName !== 'User') {
        patch.name = data.displayName
      }
      if (!current.avatar && data.avatar) {
        patch.avatar = data.avatar
      }
      if (!current.email && data.email) {
        patch.email = data.email
      }
      if (!current.bio && data.bio) {
        patch.bio = data.bio
      }
      if (Object.keys(patch).length > 0) {
        const profile = { ...current, ...patch }
        saveLocal('vael:profile', profile)
        useAppStore.setState({ profile })
      }
    } catch {}
  },
  addRefusalLog: (log) => set((s) => ({ refusalLogs: [log, ...s.refusalLogs].slice(0, 50) })),
  clearRefusalLogs: () => set({ refusalLogs: [] }),
  setPromptRewrite: (v) => {
    saveLocal('vael:promptRewrite', v)
    set({ promptRewriteEnabled: v })
  },
  loadSessions: async () => {
    try {
      const rows = await window.electronAPI?.db.loadSessions()
      const sessions = rows && rows.length > 0 ? rows : DEMO_SESSIONS
      set({ sessions, sessionsLoaded: true })
    } catch {
      set({ sessions: DEMO_SESSIONS, sessionsLoaded: true })
    }
  },
  createSession: (title) => set((s) => {
    const id = `session-${Date.now()}`
    const createdAt = Date.now()
    const t = title || 'New chat'
    window.electronAPI?.db.upsertSession(id, t, createdAt).catch(() => {})
    return {
      sessions: [{ id, title: t, createdAt }, ...s.sessions],
      activeSessionId: id,
      page: 'main-agent' as Page,
    }
  }),
  setActiveSession: (id) => set(id
    ? { activeSessionId: id, page: 'main-agent' as Page }
    : { activeSessionId: null, page: 'dashboard' as Page }
  ),
  deleteSession: (id) => set((s) => {
    window.electronAPI?.db.deleteSession(id).catch(() => {})
    return {
      sessions: s.sessions.filter((ses) => ses.id !== id),
      ...(s.activeSessionId === id ? { activeSessionId: null, page: 'dashboard' as Page } : {}),
    }
  }),
  renameSession: (id, title) => set((s) => {
    window.electronAPI?.db.renameSession(id, title).catch(() => {})
    return {
      sessions: s.sessions.map((ses) => ses.id === id ? { ...ses, title } : ses),
    }
  }),
}))
