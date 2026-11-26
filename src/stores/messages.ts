import { create } from 'zustand'

export interface Attachment {
  name: string
  size: number
  kind: 'file' | 'folder'
  count?: number
  preview?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachments?: Attachment[]
  verified?: boolean
  suggestions?: string[]
  artifacts?: string[]
  sessionDir?: string
  ts?: number
  model?: string
  isStreaming?: boolean
  isRefusal?: boolean
}

interface MessagesState {
  messages: Record<string, Message[]>
  loading: Record<string, boolean>

  loadMessages: (sessionId: string) => Promise<void>
  addMessage: (sessionId: string, msg: Message) => void
  updateMessage: (sessionId: string, msgId: string, patch: Partial<Message>) => void
  deleteMessage: (sessionId: string, msgId: string) => void
  clearMessages: (sessionId: string) => void
  getMessages: (sessionId: string) => Message[]
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messages: {},
  loading: {},

  loadMessages: async (sessionId) => {
    if (get().loading[sessionId]) return
    set((s) => ({ loading: { ...s.loading, [sessionId]: true } }))
    try {
      const rows = await window.electronAPI?.db.loadMessages(sessionId)
      const msgs = (rows ?? []) as Message[]
      set((s) => ({
        messages: { ...s.messages, [sessionId]: msgs },
        loading: { ...s.loading, [sessionId]: false },
      }))
    } catch {
      set((s) => ({ loading: { ...s.loading, [sessionId]: false } }))
    }
  },

  addMessage: (sessionId, msg) => {
    set((s) => ({
      messages: {
        ...s.messages,
        [sessionId]: [...(s.messages[sessionId] ?? []), msg],
      },
    }))
    window.electronAPI?.db.saveMessage(sessionId, msg).catch(() => {})
  },

  updateMessage: (sessionId, msgId, patch) => {
    set((s) => ({
      messages: {
        ...s.messages,
        [sessionId]: (s.messages[sessionId] ?? []).map((m) =>
          m.id === msgId ? { ...m, ...patch } : m
        ),
      },
    }))
  },

  deleteMessage: (sessionId, msgId) => {
    set((s) => ({
      messages: {
        ...s.messages,
        [sessionId]: (s.messages[sessionId] ?? []).filter((m) => m.id !== msgId),
      },
    }))
    window.electronAPI?.db.deleteMessage(sessionId, msgId).catch(() => {})
  },

  clearMessages: (sessionId) => {
    set((s) => ({
      messages: { ...s.messages, [sessionId]: [] },
    }))
    window.electronAPI?.db.clearMessages(sessionId).catch(() => {})
  },

  getMessages: (sessionId) => get().messages[sessionId] ?? [],
}))
