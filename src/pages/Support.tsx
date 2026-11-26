import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Wrench, Loader2, StopCircle, RefreshCw,
  CheckCircle2, XCircle, ArrowDown,
} from 'lucide-react'
import { VaelMark } from '@/components/ui/VaelLogo'
import Markdown from '@/components/ui/Markdown'

interface SupportMsg {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  isStreaming?: boolean
  ts: number
}

const SUPPORT_SESSION_ID = '__support__'

export default function Support() {
  const [messages, setMessages] = useState<SupportMsg[]>([])
  const [input, setInput] = useState('')
  const [working, setWorking] = useState(false)
  const [activity, setActivity] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('idle')
  const [sourceDir, setSourceDir] = useState('')
  const chatEnd = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const ta = useRef<HTMLTextAreaElement>(null)
  const isNearBottom = useRef(true)
  const lastSavedCount = useRef(0)

  useEffect(() => {
    window.electronAPI?.support.sourceDir().then(setSourceDir)
  }, [])

  // Load saved messages on mount
  useEffect(() => {
    const db = window.electronAPI?.db
    if (!db) return
    db.loadMessages(SUPPORT_SESSION_ID).then((rows) => {
      if (rows && rows.length > 0) {
        const loaded = rows as SupportMsg[]
        setMessages(loaded)
        lastSavedCount.current = loaded.length
      }
    })
  }, [])

  // Persist finalized messages
  useEffect(() => {
    const db = window.electronAPI?.db
    if (!db) return
    const finalized = messages.filter(m => !m.isStreaming)
    if (finalized.length > lastSavedCount.current) {
      for (let i = lastSavedCount.current; i < finalized.length; i++) {
        db.saveMessage(SUPPORT_SESSION_ID, finalized[i])
      }
      db.upsertSession(SUPPORT_SESSION_ID, 'Support Agent', finalized[0]?.ts || Date.now())
      lastSavedCount.current = finalized.length
    }
  }, [messages])

  // Flush streaming message on close
  useEffect(() => {
    const flush = () => {
      const db = window.electronAPI?.db
      if (!db) return
      const streaming = messages.find(m => m.isStreaming)
      if (streaming && streaming.content) {
        db.saveMessage(SUPPORT_SESSION_ID, { ...streaming, isStreaming: false })
      }
    }
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [messages])

  useEffect(() => {
    if (isNearBottom.current) {
      chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    const api = window.electronAPI?.support
    if (!api) return
    const unsubs: (() => void)[] = []

    unsubs.push(api.onChunk(({ delta }) => {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.isStreaming) {
          return [...prev.slice(0, -1), { ...last, content: last.content + delta }]
        }
        return prev
      })
    }))

    unsubs.push(api.onDone(({ text }) => {
      setWorking(false)
      setActivity(null)
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.isStreaming) {
          return [...prev.slice(0, -1), { ...last, content: text || last.content, isStreaming: false }]
        }
        return prev
      })
    }))

    unsubs.push(api.onError(({ error }) => {
      setWorking(false)
      setActivity(null)
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'system',
        content: `Error: ${error}`,
        ts: Date.now(),
      }])
    }))

    unsubs.push(api.onStatus(({ status: s }) => {
      setStatus(s)
      if (s !== 'running' && s !== 'rebuilding') {
        setActivity(null)
      }
    }))

    unsubs.push(api.onActivity(({ label }) => {
      setActivity(label)
    }))

    return () => unsubs.forEach(u => u())
  }, [])

  const send = useCallback(() => {
    if (!input.trim() || working) return
    const userMsg: SupportMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      ts: Date.now(),
    }
    setMessages(prev => [...prev, userMsg, {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: '',
      isStreaming: true,
      ts: Date.now(),
    }])
    setWorking(true)
    setInput('')
    if (ta.current) ta.current.style.height = 'auto'
    window.electronAPI?.support.run(input.trim())
  }, [input, working])

  const cancel = () => {
    window.electronAPI?.support.cancel()
    setWorking(false)
    setActivity(null)
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (last?.isStreaming) {
        return [...prev.slice(0, -1), { ...last, isStreaming: false, content: last.content || '(cancelled)' }]
      }
      return prev
    })
  }

  const rebuild = async () => {
    setWorking(true)
    setMessages(prev => [...prev, {
      id: `sys-${Date.now()}`,
      role: 'system',
      content: 'Rebuilding app...',
      ts: Date.now(),
    }])
    const result = await window.electronAPI?.support.rebuild()
    if (result?.success) {
      setMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: 'Build succeeded. Restarting...',
        ts: Date.now(),
      }])
      setTimeout(() => window.electronAPI?.support.restart(), 1500)
    } else {
      setMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: `Build failed: ${result?.error?.slice(-300) || 'Unknown error'}`,
        ts: Date.now(),
      }])
    }
    setWorking(false)
  }

  const onScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    isNearBottom.current = scrollHeight - scrollTop - clientHeight < 120
  }, [])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const resize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  return (
    <div className="h-full flex flex-col bg-bg-0">
      {/* Header */}
      <div className="shrink-0 h-[52px] flex items-center justify-between px-5 border-b border-white/[0.06] bg-bg-1/60 backdrop-blur-glass drag-region">
        <div className="flex items-center gap-3 no-drag">
          <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center">
            <Wrench size={14} className="text-fg-2" />
          </div>
          <span className="text-sm font-semibold text-fg-0">Support Agent</span>
          {working && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <Loader2 size={12} className="text-fg-2 animate-spin" />
              <span className="text-[11px] text-fg-2 font-medium truncate max-w-[200px]">
                {activity || (status === 'rebuilding' ? 'Rebuilding...' : 'Working...')}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 no-drag">
          {sourceDir && (
            <span className="text-[10px] text-fg-4 font-mono truncate max-w-[300px]" title={sourceDir}>
              {sourceDir}
            </span>
          )}
          <button
            onClick={rebuild}
            disabled={working}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-fg-2 hover:text-fg-0 transition-colors text-[12px] font-medium disabled:opacity-30"
          >
            <RefreshCw size={12} />
            Rebuild & Restart
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-8 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/[0.06] flex items-center justify-center">
                <Wrench size={20} className="text-fg-3" />
              </div>
              <h2 className="text-fg-1 text-sm font-medium mb-1">VAEL Support Agent</h2>
              <p className="text-fg-4 text-[12px] max-w-sm mx-auto">
                Describe a bug or issue and I'll diagnose it, fix the source code, rebuild the app, and restart it.
              </p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] ${msg.role === 'user' ? '' : 'pr-4'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      msg.isStreaming ? 'bg-white/[0.08] agent-avatar-pulse' : 'bg-white/[0.08]'
                    }`}>
                      {msg.isStreaming ? (
                        <Loader2 size={12} className="text-fg-2 animate-spin" />
                      ) : (
                        <Wrench size={12} className="text-fg-2" />
                      )}
                    </div>
                    <span className="text-[12px] font-medium text-fg-3">Support Agent</span>
                  </div>
                )}

                {msg.role === 'system' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                    {msg.content.includes('succeeded') || msg.content.includes('Restarting') ? (
                      <CheckCircle2 size={14} className="text-green-400/80 shrink-0" />
                    ) : msg.content.includes('Error') || msg.content.includes('failed') ? (
                      <XCircle size={14} className="text-red-400/80 shrink-0" />
                    ) : (
                      <Loader2 size={14} className="text-fg-3 animate-spin shrink-0" />
                    )}
                    <span className="text-[12px] text-fg-3">{msg.content}</span>
                  </div>
                )}

                {msg.role === 'user' && (
                  <div className="bg-white/[0.08] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-fg-0 whitespace-pre-wrap">
                    {msg.content}
                  </div>
                )}

                {msg.role === 'assistant' && (
                  <>
                    {msg.isStreaming && !msg.content ? (
                      <div className="pl-8 flex items-center gap-1.5 py-2">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-fg-3 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-fg-3 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-fg-3 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-[12px] text-fg-4 ml-1">{activity || 'Diagnosing...'}</span>
                      </div>
                    ) : (
                      <Markdown content={msg.content} className="text-sm leading-relaxed pl-8 text-fg-1" />
                    )}
                    {msg.isStreaming && msg.content && (
                      <div className="pl-8 mt-1 flex items-center gap-2">
                        <span className="inline-block w-2 h-4 bg-fg-2 animate-pulse rounded-sm" />
                        {activity && <span className="text-[11px] text-fg-4 font-mono animate-pulse">{activity}</span>}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEnd} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 pb-5 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="bg-bg-2 border border-white/[0.1] rounded-xl">
            <div className="px-4 py-3 flex items-center gap-3">
              <Wrench size={16} className="text-fg-4 shrink-0" />
              <textarea
                ref={ta}
                rows={1}
                value={input}
                onChange={e => { setInput(e.target.value); resize(e.target) }}
                onKeyDown={onKey}
                placeholder={working ? (activity || 'Working on fix...') : 'Describe the bug or issue...'}
                disabled={working}
                className="flex-1 resize-none bg-transparent text-fg-0 placeholder:text-fg-4 text-sm focus:outline-none leading-normal disabled:opacity-50"
                style={{ maxHeight: 160 }}
              />
              {working ? (
                <button onClick={cancel} className="shrink-0 w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors">
                  <StopCircle size={16} />
                </button>
              ) : (
                <button
                  onClick={send}
                  disabled={!input.trim()}
                  className="shrink-0 w-8 h-8 rounded-lg bg-fg-0 text-bg-0 flex items-center justify-center hover:bg-white transition-colors disabled:opacity-20"
                >
                  <Send size={16} />
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-fg-4/50 mt-1 text-center">
            Fixes are applied to the source code. Click "Rebuild & Restart" to apply changes.
          </p>
        </div>
      </div>
    </div>
  )
}
