import { useState, useCallback, useRef, useEffect } from 'react'
import { Search as SearchIcon, Loader2, Globe, Shield, Hash, Link2, FileText, X, Zap, Plus, ArrowLeft, ExternalLink, Eye, Send, StopCircle, Image, Paperclip, Clock, Gamepad2, HardDrive, Cpu, Archive, Bug, Package } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/stores/app'
import BrowserPanel from '@/components/browser/BrowserPanel'
import RankedLinks, { type RankedLink } from '@/components/ui/RankedLinks'
import FaviconImg from '@/components/ui/FaviconImg'

type Category = 'general' | 'malware' | 'hash' | 'url' | 'domain' | 'file' | 'rom' | 'emulator' | 'homebrew' | 'archive' | 'software'

interface BrowserTab {
  id: string
  url: string
  title: string
}

interface SearchResult {
  query: string
  content: string
  status: 'searching' | 'done' | 'error'
  activity: string
  model?: string
  refusalUrl?: string
}

interface AttachedImage {
  data: string
  name: string
  preview: string
}

interface SearchHistoryItem {
  query: string
  timestamp: number
}

const CATEGORIES: { id: Category; label: string; icon: typeof SearchIcon }[] = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'rom', label: 'ROMs', icon: HardDrive },
  { id: 'emulator', label: 'Emulators', icon: Cpu },
  { id: 'homebrew', label: 'Homebrew', icon: Gamepad2 },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'software', label: 'Software', icon: Package },
  { id: 'malware', label: 'Malware', icon: Bug },
  { id: 'hash', label: 'Hash', icon: Hash },
  { id: 'url', label: 'URL', icon: Link2 },
  { id: 'domain', label: 'Domain', icon: Shield },
  { id: 'file', label: 'File', icon: FileText },
]

const QUICK_LINKS = [
  { label: 'Google', url: 'https://www.google.com' },
  { label: 'Archive.org', url: 'https://archive.org' },
  { label: 'VirusTotal', url: 'https://www.virustotal.com' },
  { label: 'MalwareBazaar', url: 'https://bazaar.abuse.ch' },
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'Reddit', url: 'https://www.reddit.com' },
  { label: 'GBATemp', url: 'https://gbatemp.net' },
  { label: 'RomHacking', url: 'https://www.romhacking.net' },
]

let tabCounter = 0

function renderMarkdown(text: string, onLinkClick: (url: string) => void) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-[13px] font-semibold text-fg-1 mt-3 mb-1">{line.slice(4)}</h3>)
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-[14px] font-semibold text-fg-0 mt-4 mb-1.5">{line.slice(3)}</h2>)
      continue
    }
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-[15px] font-bold text-fg-0 mt-4 mb-2">{line.slice(2)}</h1>)
      continue
    }

    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-white/[0.06] my-3" />)
      continue
    }

    if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />)
      continue
    }

    const listMatch = line.match(/^(\s*)-\s+(.+)/)
    if (listMatch) {
      const indent = Math.floor(listMatch[1].length / 2)
      line = listMatch[2]
      elements.push(
        <div key={i} className="flex gap-2 items-start" style={{ paddingLeft: indent * 16 }}>
          <span className="text-fg-4/40 mt-[5px] shrink-0 text-[8px]">●</span>
          <span className="text-[13px] text-fg-2 leading-relaxed">{renderInline(line, onLinkClick)}</span>
        </div>
      )
      continue
    }

    elements.push(<p key={i} className="text-[13px] text-fg-2 leading-relaxed">{renderInline(line, onLinkClick)}</p>)
  }

  return elements
}

function renderInline(text: string, onLinkClick: (url: string) => void): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`/g
  let m

  while ((m = re.exec(text))) {
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index))
    }
    if (m[1]) {
      parts.push(<strong key={m.index} className="font-semibold text-fg-1">{m[1]}</strong>)
    } else if (m[2] && m[3]) {
      parts.push(
        <button key={m.index} onClick={() => onLinkClick(m![3])}
          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline transition-colors">
          <FaviconImg url={m[3]} size={12} />
          {m[2]}
          <ExternalLink size={10} className="opacity-50" />
        </button>
      )
    } else if (m[4]) {
      parts.push(<code key={m.index} className="px-1 py-0.5 rounded bg-white/[0.06] text-[12px] text-fg-1 font-mono">{m[4]}</code>)
    }
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts
}

const MAX_HISTORY = 50

function loadSearchHistory(): SearchHistoryItem[] {
  try {
    const raw = localStorage.getItem('vael-search-history')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveToHistory(query: string) {
  try {
    const history = loadSearchHistory().filter(h => h.query !== query)
    history.unshift({ query, timestamp: Date.now() })
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY
    localStorage.setItem('vael-search-history', JSON.stringify(history))
  } catch {}
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Search() {

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category>('general')
  const [tabs, setTabs] = useState<BrowserTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [showBrowser, setShowBrowser] = useState(false)
  const [images, setImages] = useState<AttachedImage[]>([])
  const [history, setHistory] = useState<SearchHistoryItem[]>(() => loadSearchHistory())
  const [showHistory, setShowHistory] = useState(false)
  const [links, setLinks] = useState<RankedLink[]>([])
  const [activityLog, setActivityLog] = useState<Array<{ tool: string; label: string; ts: number }>>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const resize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [])

  const createTab = useCallback((url: string) => {
    const id = `tab-${++tabCounter}`
    const tab: BrowserTab = { id, url, title: 'Loading...' }
    setTabs(prev => [...prev, tab])
    setActiveTabId(id)
    setShowBrowser(true)
    return id
  }, [])

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId)
      const next = prev.filter(t => t.id !== tabId)
      if (tabId === activeTabId) {
        if (next.length === 0) {
          setActiveTabId(null)
          setShowBrowser(false)
        } else {
          const newIdx = Math.min(idx, next.length - 1)
          setActiveTabId(next[newIdx].id)
        }
      }
      return next
    })
  }, [activeTabId])

  const updateTabTitle = useCallback((tabId: string, title: string) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, title } : t))
  }, [])

  const goToResults = useCallback(() => {
    setShowBrowser(false)
  }, [])

  const openUrl = useCallback((url: string) => {
    const existing = tabs.find(t => t.url === url)
    if (existing) {
      setActiveTabId(existing.id)
      setShowBrowser(true)
    } else {
      createTab(url.startsWith('http') ? url : `https://${url}`)
    }
  }, [createTab, tabs])

  // Subscribe to search agent events
  useEffect(() => {
    const api = window.electronAPI?.searchAgent
    if (!api) return

    const unsubs: (() => void)[] = []

    unsubs.push(api.onChunk((data) => {
      setResult(prev => prev ? { ...prev, content: prev.content + data.delta } : prev)
    }))

    unsubs.push(api.onDone((data) => {
      setResult(prev => prev ? { ...prev, status: 'done', activity: '', model: data.model } : prev)
    }))

    unsubs.push(api.onError((data) => {
      setResult(prev => prev ? { ...prev, status: 'error', content: prev.content + '\n\n' + data.error, activity: '' } : prev)
    }))

    unsubs.push(api.onActivity((data) => {
      setResult(prev => prev ? { ...prev, activity: data.label } : prev)
      setActivityLog(prev => [{ tool: data.tool, label: data.label, ts: Date.now() }, ...prev].slice(0, 8))
    }))

    unsubs.push(api.onStatus((data) => {
      if (data.model) setResult(prev => prev ? { ...prev, model: data.model } : prev)
    }))

    unsubs.push(api.onRefusal((data) => {
      // Agent refused after all retries — show search links as fallback
      setResult(prev => prev ? {
        ...prev,
        content: '',
        status: 'done' as const,
        activity: '',
        refusalUrl: data.url,
      } as SearchResult : prev)
    }))

    unsubs.push(api.onClear(() => {
      // Agent is retrying with reformulated query — clear old output
      setResult(prev => prev ? { ...prev, content: '', activity: 'Trying different search angle...', status: 'searching' as const, refusalUrl: undefined } : prev)
    }))

    unsubs.push(api.onLinks((data) => setLinks(data.links)))

    return () => unsubs.forEach(u => u())
  }, [])

  // Auto-scroll results
  useEffect(() => {
    if (result?.status === 'searching' && resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight
    }
  }, [result?.content])

  const addImages = useCallback(async (files: FileList | File[]) => {
    const newImages: AttachedImage[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const data = await readFileAsDataUrl(file)
      newImages.push({ data, name: file.name, preview: data })
    }
    setImages(prev => [...prev, ...newImages])
  }, [])

  const removeImage = useCallback((idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageFiles: File[] = []
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) imageFiles.push(file)
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault()
      await addImages(imageFiles)
    }
  }, [addImages])

  const handleSearch = useCallback(() => {
    const q = query.trim()
    if (!q && images.length === 0) return

    // Direct URL — open in browser immediately
    if (images.length === 0 && (/^https?:\/\//i.test(q) || (q.includes('.') && !q.includes(' ') && q.includes('.')))) {
      openUrl(q)
      return
    }

    // Save to history
    if (q) {
      saveToHistory(q)
      setHistory(loadSearchHistory())
    }

    const searchQuery = q || 'What is in this image?'

    // Send to search agent with images
    setLinks([])
    setActivityLog([])
    setResult({ query: searchQuery, content: '', status: 'searching', activity: 'Starting search...' })
    setShowBrowser(false)
    setShowHistory(false)

    const prefix = category !== 'general' ? `[${category} search] ` : ''
    const imageData = images.length > 0 ? images.map(img => ({ data: img.data, name: img.name })) : undefined
    window.electronAPI?.searchAgent?.run(prefix + searchQuery, undefined, imageData).catch(() => {
      setResult(prev => prev ? { ...prev, status: 'error', content: 'Failed to start search agent' } : prev)
    })

    window.electronAPI?.brain?.logSearch(searchQuery, 'agent', undefined).catch(() => {})
    setQuery('')
    setImages([])
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
  }, [query, category, openUrl, images])

  const handleFollowUp = useCallback(() => {
    const q = query.trim()
    if (!q) return

    // Send as follow-up to the ongoing/completed search
    window.electronAPI?.searchAgent?.followUp(q).catch(() => {})
    setResult(prev => prev ? { ...prev, status: 'searching', activity: 'Processing follow-up...' } : prev)
    setQuery('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
  }, [query])

  const handleCancel = useCallback(() => {
    window.electronAPI?.searchAgent?.cancel()
    setResult(prev => prev ? { ...prev, status: 'done', activity: '' } : prev)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (result) {
        handleFollowUp()
      } else {
        handleSearch()
      }
    }
  }

  const handleLinkClick = useCallback((url: string) => {
    openUrl(url)
    if (result?.query) {
      window.electronAPI?.searchAgent?.clicked(result.query).catch(() => {})
    }
  }, [openUrl, result?.query])

  const showHomepage = !result && !showBrowser
  const showResults = result && !showBrowser

  // Shared chat-style input component
  const renderInput = (placeholder: string, onSubmit: () => void, isFollowUp?: boolean) => (
    <div className="bg-bg-2 border border-white/[0.1] rounded-xl shadow-glow transition-colors focus-within:border-white/[0.15]">
      {/* Image previews */}
      {images.length > 0 && (
        <div className="px-3 pt-3 flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img src={img.preview} alt={img.name}
                className="w-16 h-16 rounded-lg object-cover border border-white/[0.1]" />
              <button onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bg-0 border border-white/[0.1] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={10} className="text-fg-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-3 flex items-center gap-3">
        {/* Attach button */}
        <button onClick={() => fileInputRef.current?.click()}
          className="shrink-0 w-8 h-8 rounded-lg text-fg-4 hover:text-fg-2 hover:bg-white/[0.06] flex items-center justify-center transition-colors"
          title="Attach image">
          <Image size={16} />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={async (e) => { if (e.target.files) { await addImages(e.target.files); e.target.value = '' } }} />

        <textarea
          ref={inputRef}
          rows={1}
          value={query}
          onChange={(e) => { setQuery(e.target.value); resize(e.target) }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => !result && setShowHistory(true)}
          onBlur={() => setTimeout(() => setShowHistory(false), 200)}
          placeholder={placeholder}
          className="flex-1 resize-none bg-transparent text-fg-0 placeholder:text-fg-3 text-[14px] focus:outline-none leading-normal"
          style={{ maxHeight: 200 }}
        />

        {result?.status === 'searching' ? (
          <button onClick={handleCancel}
            className="shrink-0 w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors"
            title="Stop search">
            <StopCircle size={16} />
          </button>
        ) : (
          <button onClick={onSubmit}
            disabled={!query.trim() && images.length === 0}
            className="shrink-0 w-8 h-8 rounded-lg bg-fg-0 text-bg-0 flex items-center justify-center hover:bg-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            title={isFollowUp ? 'Send follow-up' : 'Search'}>
            {isFollowUp ? <Send size={16} /> : <Zap size={16} />}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-bg-0">
      {/* Tab bar — only when browser tabs exist */}
      {tabs.length > 0 && showBrowser && (
        <div className="shrink-0 flex items-center h-9 bg-bg-1/60 border-b border-white/[0.06] pl-1 pr-[110px] gap-0 overflow-x-auto scrollbar-none drag-region">
          <button onClick={goToResults}
            className="no-drag shrink-0 flex items-center gap-1.5 px-3 h-7 rounded-md mr-0.5 transition-colors text-[11px] text-fg-4 hover:text-fg-2 hover:bg-white/[0.04] active:scale-95">
            <ArrowLeft size={12} />
            Results
          </button>

          {tabs.map(tab => (
            <div key={tab.id}
              className={`no-drag group shrink-0 flex items-center gap-1 h-7 max-w-[180px] rounded-md px-2 transition-colors cursor-pointer ${
                activeTabId === tab.id ? 'bg-white/[0.08] text-fg-1' : 'text-fg-4 hover:text-fg-2 hover:bg-white/[0.04]'
              }`}
              onClick={() => setActiveTabId(tab.id)}>
              <Globe size={11} className="shrink-0 opacity-50" />
              <span className="text-[11px] truncate flex-1 min-w-0">{tab.title}</span>
              <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-white/[0.1] transition-all">
                <X size={10} />
              </button>
            </div>
          ))}

          <button onClick={() => { setShowBrowser(false) }}
            className="no-drag shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-fg-4 hover:text-fg-2 hover:bg-white/[0.06] transition-colors ml-0.5"
            title="New tab">
            <Plus size={12} />
          </button>
        </div>
      )}

      {/* Browser panels (all mounted, only active visible when showBrowser) */}
      {tabs.map(tab => (
        <div key={tab.id} className={`flex-1 min-h-0 ${showBrowser && activeTabId === tab.id ? '' : 'hidden'}`}>
          <BrowserPanel
            initialUrl={tab.url}
            onClose={() => closeTab(tab.id)}
            onHome={goToResults}
            onTitleChange={(title) => updateTabTitle(tab.id, title)}
          />
        </div>
      ))}

      {/* Agent results view */}
      {showResults && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Results toolbar */}
          <div className="shrink-0 flex items-center gap-2 h-11 px-4 pr-[110px] bg-bg-1/50 border-b border-white/[0.06]">
            <SearchIcon size={14} className="text-fg-3" />
            <span className="text-[13px] text-fg-1 truncate flex-1 font-medium">{result.query}</span>

            {result.status === 'searching' && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-fg-4 truncate max-w-[200px]">{result.activity}</span>
                <Loader2 size={13} className="text-fg-3 animate-spin" />
              </div>
            )}

            {result.status === 'done' && (
              <div className="flex items-center gap-2">
                {result.model && (
                  <span className="text-[10px] text-fg-4/60 px-1.5 py-0.5 rounded bg-white/[0.04]">
                    {result.model.replace('claude-', '').replace(/-/g, ' ')}
                  </span>
                )}
                <span className="text-[11px] text-emerald-400/70">Done</span>
              </div>
            )}

            {/* Open in Browser — always visible */}
            <button onClick={() => {
              if (tabs.length > 0) {
                setShowBrowser(true)
              } else {
                openUrl(`https://www.google.com/search?q=${encodeURIComponent(result.query)}`)
              }
            }}
              className="flex items-center gap-1.5 text-[12px] text-fg-2 hover:text-fg-0 px-3 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/[0.14] transition-all active:scale-[0.97]">
              <Globe size={13} />
              {tabs.length > 0 ? `Browser (${tabs.length})` : 'Open in Browser'}
            </button>

            {/* New Search */}
            <button onClick={() => { setResult(null); setLinks([]); setActivityLog([]); setQuery(''); inputRef.current?.focus() }}
              title="New search"
              className="shrink-0 w-7 h-7 rounded-lg text-fg-4 hover:text-fg-2 hover:bg-white/[0.06] flex items-center justify-center transition-colors active:scale-95">
              <Plus size={14} />
            </button>
          </div>

          {/* Results content */}
          <div ref={resultRef} className="flex-1 overflow-y-auto px-6 py-4 scrollbar-none">
            <div className="max-w-[720px] mx-auto space-y-0.5">
              {result.refusalUrl ? (
                <div className="flex flex-col items-center justify-center py-16 gap-5">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center">
                    <SearchIcon size={20} className="text-fg-4" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[14px] text-fg-2">Search completed via direct links</p>
                    <p className="text-[12px] text-fg-4">The agent tried multiple approaches — use these links to continue</p>
                  </div>
                  <div className="flex flex-col gap-2 mt-2 w-full max-w-sm">
                    <button onClick={() => openUrl(`https://www.google.com/search?q=${encodeURIComponent(result.query)}`)}
                      className="flex items-center gap-3 px-4 h-10 rounded-lg bg-white/[0.08] text-fg-0 text-[13px] font-medium hover:bg-white/[0.12] transition-colors active:scale-95 w-full">
                      <Globe size={14} className="shrink-0" />
                      Google Search
                      <span className="text-fg-4 text-[11px] ml-auto">Web</span>
                    </button>
                    <button onClick={() => openUrl(`https://duckduckgo.com/?q=${encodeURIComponent(result.query)}`)}
                      className="flex items-center gap-3 px-4 h-10 rounded-lg bg-white/[0.06] text-fg-2 text-[13px] hover:bg-white/[0.1] hover:text-fg-0 transition-colors active:scale-95 w-full">
                      <Shield size={14} className="shrink-0" />
                      DuckDuckGo
                      <span className="text-fg-4 text-[11px] ml-auto">Private</span>
                    </button>
                    <button onClick={() => openUrl(`https://www.reddit.com/search/?q=${encodeURIComponent(result.query)}`)}
                      className="flex items-center gap-3 px-4 h-10 rounded-lg bg-white/[0.06] text-fg-2 text-[13px] hover:bg-white/[0.1] hover:text-fg-0 transition-colors active:scale-95 w-full">
                      <Hash size={14} className="shrink-0" />
                      Reddit Search
                      <span className="text-fg-4 text-[11px] ml-auto">Community</span>
                    </button>
                    <button onClick={() => openUrl(`https://github.com/search?q=${encodeURIComponent(result.query)}&type=repositories`)}
                      className="flex items-center gap-3 px-4 h-10 rounded-lg bg-white/[0.06] text-fg-2 text-[13px] hover:bg-white/[0.1] hover:text-fg-0 transition-colors active:scale-95 w-full">
                      <FileText size={14} className="shrink-0" />
                      GitHub Search
                      <span className="text-fg-4 text-[11px] ml-auto">Code</span>
                    </button>
                  </div>
                  <button onClick={() => { setResult(null); setQuery(''); inputRef.current?.focus() }}
                    className="flex items-center gap-2 px-4 h-8 rounded-lg text-fg-4 text-[12px] hover:text-fg-2 transition-colors active:scale-95 mt-1">
                    Try different query
                  </button>
                </div>
              ) : result.content ? (
                renderMarkdown(result.content, handleLinkClick)
              ) : result.status === 'searching' ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 size={20} className="text-fg-3 animate-spin" />
                  <span className="text-[13px] text-fg-4">{result.activity || 'Searching...'}</span>
                </div>
              ) : null}

              {links.length > 0 && <RankedLinks links={links} onOpen={handleLinkClick} />}

              {result.status === 'searching' && result.content && (
                <div className="mt-4 py-2 space-y-1">
                  {activityLog.slice(0, 4).map((a, i) => (
                    <div key={a.ts} className="flex items-center gap-2 transition-opacity" style={{ opacity: i === 0 ? 1 : Math.max(0.25, 1 - i * 0.25) }}>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === 0 ? 'bg-fg-2 animate-pulse' : 'bg-fg-4/30'}`} />
                      <span className="text-[11px] text-fg-4 truncate">{a.label}</span>
                    </div>
                  ))}
                  {activityLog.length === 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-fg-2 animate-pulse" />
                      <span className="text-[11px] text-fg-4">{result.activity || 'Thinking...'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat-style follow-up input */}
          <div className="shrink-0 pb-5 px-5">
            <div className="max-w-[720px] mx-auto">
              {renderInput(
                result.status === 'searching' ? 'Send additional info to the agent...' : 'Ask a follow-up...',
                handleFollowUp,
                true
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search homepage */}
      {showHomepage && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
            <motion.div className="w-full max-w-[640px] space-y-8"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>

              <div className="text-center space-y-2">
                <h1 className="text-[24px] font-semibold text-fg-0">Search</h1>
                <p className="text-[14px] text-fg-3">AI-powered search — paste images, ask anything</p>
              </div>

              <div className="relative">
                {renderInput('Ask anything, paste an image, or enter a URL...', handleSearch)}

                {/* Search history dropdown */}
                <AnimatePresence>
                  {showHistory && history.length > 0 && !query && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 top-full mt-1 bg-bg-2 border border-white/[0.1] rounded-xl shadow-xl overflow-hidden z-10">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
                        <Clock size={12} className="text-fg-4" />
                        <span className="text-[11px] text-fg-4 font-medium">Recent searches</span>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto scrollbar-none">
                        {history.slice(0, 10).map((h, i) => (
                          <button key={i}
                            onMouseDown={(e) => { e.preventDefault(); setQuery(h.query); setShowHistory(false) }}
                            className="w-full text-left px-3 py-2 text-[13px] text-fg-2 hover:bg-white/[0.04] transition-colors truncate">
                            {h.query}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Categories */}
              <div className="flex justify-center gap-1.5 flex-wrap">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon
                  const active = category === cat.id
                  return (
                    <button key={cat.id} onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] transition-all active:scale-[0.97] border ${
                        active
                          ? 'bg-white/[0.1] text-fg-0 font-medium border-white/[0.12]'
                          : 'text-fg-3 hover:text-fg-0 hover:bg-white/[0.05] border-transparent hover:border-white/[0.06]'
                      }`}>
                      <Icon size={13} />
                      {cat.label}
                    </button>
                  )
                })}
              </div>

              {/* Quick Links */}
              <div className="pt-2 space-y-3">
                <p className="text-[11px] text-fg-4 text-center uppercase tracking-wider font-medium">Quick Links</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {QUICK_LINKS.map(link => (
                    <button key={link.label} onClick={() => openUrl(link.url)}
                      className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[12px] text-fg-3 hover:text-fg-0 hover:bg-white/[0.08] hover:border-white/[0.12] transition-all active:scale-[0.97]">
                      <FaviconImg url={`https://${link.url.replace(/^https?:\/\//, '').split('/')[0]}`} size={13} />
                      {link.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Open tabs */}
              {tabs.length > 0 && (
                <div className="text-center pt-2">
                  <button onClick={() => setShowBrowser(true)}
                    className="inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] text-fg-2 hover:text-fg-0 hover:bg-white/[0.1] hover:border-white/[0.14] text-[13px] font-medium transition-all active:scale-[0.97]">
                    <Globe size={14} />
                    Open Browser ({tabs.length} tab{tabs.length > 1 ? 's' : ''})
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* Return to results when no result and browser is showing but tabs exist */}
      {!result && !showHomepage && !showBrowser && tabs.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
            <motion.div className="w-full max-w-[640px] space-y-8"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>

              <div className="text-center space-y-2">
                <h1 className="text-[24px] font-semibold text-fg-0">Search</h1>
                <p className="text-[14px] text-fg-3">AI-powered search — paste images, ask anything</p>
              </div>

              <div className="relative">
                {renderInput('Ask anything, paste an image, or enter a URL...', handleSearch)}
              </div>

              <div className="text-center">
                <button onClick={() => setShowBrowser(true)}
                  className="inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] text-fg-2 hover:text-fg-0 hover:bg-white/[0.1] hover:border-white/[0.14] text-[13px] font-medium transition-all active:scale-[0.97]">
                  <Globe size={14} />
                  Open Browser ({tabs.length} tab{tabs.length > 1 ? 's' : ''})
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  )
}
