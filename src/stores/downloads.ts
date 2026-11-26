import { create } from 'zustand'

export interface Download {
  filename: string
  savePath: string
  totalBytes: number
  receivedBytes: number
  state: 'downloading' | 'completed' | 'cancelled' | 'interrupted'
  startedAt: number
}

interface DownloadsState {
  items: Download[]
  visible: boolean
  collapsed: boolean

  show: () => void
  hide: () => void
  toggleCollapsed: () => void
  init: () => () => void
}

export const useDownloadsStore = create<DownloadsState>((set, get) => ({
  items: [],
  visible: false,
  collapsed: false,

  show: () => set({ visible: true }),
  hide: () => set({ visible: false }),
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),

  init: () => {
    const api = window.electronAPI?.browser
    if (!api) return () => {}

    const offStart = api.onDownloadStart((data) => {
      set((s) => ({
        visible: true,
        collapsed: false,
        items: [
          {
            filename: data.filename,
            savePath: data.savePath,
            totalBytes: data.totalBytes,
            receivedBytes: 0,
            state: 'downloading' as const,
            startedAt: Date.now(),
          },
          ...s.items,
        ].slice(0, 50),
      }))
    })

    const offProgress = api.onDownloadProgress((data) => {
      set((s) => ({
        items: s.items.map((d) =>
          d.filename === data.filename && d.state === 'downloading'
            ? { ...d, receivedBytes: data.received, totalBytes: data.total || d.totalBytes }
            : d
        ),
      }))
    })

    const offDone = api.onDownloadDone((data) => {
      set((s) => ({
        items: s.items.map((d) =>
          d.filename === data.filename && d.state === 'downloading'
            ? { ...d, state: (data.state === 'completed' ? 'completed' : 'interrupted') as Download['state'], receivedBytes: d.totalBytes }
            : d
        ),
      }))
    })

    return () => {
      offStart()
      offProgress()
      offDone()
    }
  },
}))
