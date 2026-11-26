import { create } from 'zustand'

export const STYLE_WORDS = [
  'modern', 'simple', 'minimal', 'clean', 'sleek', 'smooth', 'professional', 'polished',
  'compact', 'bold', 'playful', 'elegant', 'readable', 'flat', 'cozy', 'futuristic',
] as const

export interface LearnedStyle {
  word: string
  count: number
  quote: string
}

const KEY = 'vael-learned-style'
const pattern = new RegExp(`\\b(${STYLE_WORDS.join('|')})\\b`, 'gi')

function load(): LearnedStyle[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LearnedStyle[]) : []
  } catch {
    return []
  }
}

function save(list: LearnedStyle[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* storage unavailable */ }
}

interface StyleState {
  learned: LearnedStyle[]
  learn: (text: string) => void
  forget: (word: string) => void
}

export const useStyleStore = create<StyleState>((set, get) => ({
  learned: load(),
  learn: (text) => {
    const found = new Set((text.match(pattern) ?? []).map((w) => w.toLowerCase()))
    if (!found.size) return
    const quote = text.replace(/\s+/g, ' ').trim().slice(0, 200)
    const next = [...get().learned]
    for (const word of found) {
      const hit = next.find((l) => l.word === word)
      if (hit) {
        hit.count++
      } else {
        next.push({ word, count: 1, quote })
        void window.electronAPI?.vault?.appendStyle(word, quote)
      }
    }
    save(next)
    set({ learned: next })
  },
  forget: (word) => {
    const next = get().learned.filter((l) => l.word !== word)
    save(next)
    set({ learned: next })
  },
}))
