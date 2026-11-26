import { create } from 'zustand'

interface ProfileState {
  displayName: string
  avatar: string | null
  loaded: boolean

  load: () => Promise<void>
  setDisplayName: (name: string) => void
  setAvatar: (dataUrl: string | null) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  displayName: 'User',
  avatar: null,
  loaded: false,

  load: async () => {
    try {
      const data = await window.electronAPI?.profile.get()
      if (data) {
        set({
          displayName: data.displayName || 'User',
          avatar: data.avatar || null,
          loaded: true,
        })
      } else {
        set({ loaded: true })
      }
    } catch {
      set({ loaded: true })
    }
  },

  setDisplayName: (name) => {
    set({ displayName: name })
    window.electronAPI?.profile.set('displayName', name).catch(() => {})
  },

  setAvatar: (dataUrl) => {
    set({ avatar: dataUrl })
    window.electronAPI?.profile.set('avatar', dataUrl ?? '').catch(() => {})
  },
}))
