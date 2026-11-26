import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Loader2, StopCircle, Upload,
  CheckCircle2, XCircle, Binary,
  FileSearch, Cpu, Shield, Smartphone, Globe, Microchip,
} from 'lucide-react'
import Markdown from '@/components/ui/Markdown'

interface ReMsg {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  isStreaming?: boolean
  ts: number
}

const capabilities = [
  { icon: Binary, label: 'Native Binaries', desc: 'ELF, PE, Mach-O via Ghidra / IDA / Hopper' },
  { icon: Globe, label: 'JS / Electron', desc: 'Bundle inspection, deobfuscation' },
  { icon: Microchip, label: '.NET Assemblies', desc: 'IL disassembly, decompilation' },
  { icon: Smartphone, label: 'Android APKs', desc: 'Manifest, DEX, native libs' },
  { icon: Shield, label: 'Web Apps', desc: 'Traffic analysis, API mapping' },
  { icon: Cpu, label: 'Firmware', desc: 'Binary extraction, format detection' },
]

const REA_SESSION_ID = '__rea__'

export default function ReverseEngineering() {
  const [messages, setMessages] = useState<ReMsg[]>([])
  const [input, setInput] = useState('')
  const [working, setWorking] = useState(false)
  const [activity, setActivity] = useState<string | null>(null)
  const [targetFile, setTargetFile] = useState<string | null>(null)
  const chatEnd = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const ta = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const isNearBottom = useRef(true)
  const lastSavedCount = useRef(0)

  // Load saved messages on mount
  useEffect(() => {
    const db = window.electronAPI?.db
    if (!db) return
    db.loadMessages(REA_SESSION_ID).then((rows) => {
      if (rows && rows.length > 0) {
        const loaded = rows as ReMsg[]
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
        db.saveMessage(REA_SESSION_ID, finalized[i])
      }
      db.upsertSession(REA_SESSION_ID, 'Reverse Engineering', finalized[0]?.ts || Date.now())
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
        db.saveMessage(REA_SESSION_ID, { ...streaming, isStreaming: false })
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
    const api = window.electronAPI?.rea
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

    unsubs.push(api.onStatus(({ status }) => {
      if (status !== 'running') setActivity(null)
    }))

    unsubs.push(api.onActivity(({ label }) => {
      setActivity(label)
    }))

    return () => unsubs.forEach(u => u())
  }, [])

  const send = useCallback(() => {
    if (!input.trim() || working) return
    const prompt = targetFile
      ? `[Target: ${targetFile}]\n\n${input.trim()}`
      : input.trim()

    const userMsg: ReMsg = {
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
    window.electronAPI?.rea.run(prompt, undefined, targetFile || undefined)
  }, [input, working, targetFile])

  const cancel = () => {
    window.electronAPI?.rea.cancel()
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const filePath = (file as unknown as { path?: string }).path
      if (filePath) {
        setTargetFile(filePath)
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          role: 'system',
          content: `Target loaded: ${filePath.split(/[\\/]/).pop()}`,
          ts: Date.now(),
        }])
      }
    }
    e.target.value = ''
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

  const useSuggestion = (text: string) => {
    setInput(text)
    ta.current?.focus()
  }

  return (
    <div className="h-full flex flex-col bg-bg-0">
      {/* Header */}
      <div className="shrink-0 h-[52px] flex items-center justify-between px-5 border-b border-white/[0.06] bg-bg-1/60 backdrop-blur-glass drag-region">
        <div className="flex items-center gap-3 no-drag">
          <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center">
            <Binary size={14} className="text-fg-2" />
          </div>
          <span className="text-sm font-semibold text-fg-0">Reverse Engineering</span>
          <span className="text-[10px] text-fg-4 font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">REA</span>
          {working && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <Loader2 size={12} className="text-fg-2 animate-spin" />
              <span className="text-[11px] text-fg-2 font-medium truncate max-w-[200px]">
                {activity || 'Analyzing...'}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 no-drag">
          {targetFile && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <FileSearch size={12} className="text-fg-3" />
              <span className="text-[10px] text-fg-3 font-mono truncate max-w-[200px]">{targetFile.split(/[\\/]/).pop()}</span>
              <button onClick={() => setTargetFile(null)} className="text-fg-4 hover:text-fg-1 ml-1 transition-colors">
                <XCircle size={12} />
              </button>
            </div>
          )}
          <button
            onClick={() => fileInput.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-fg-2 hover:text-fg-0 transition-colors text-[12px] font-medium"
          >
            <Upload size={12} />
            Load Binary
          </button>
          <input ref={fileInput} type="file" className="hidden" onChange={handleFileSelect} />
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-8 space-y-4">
          {messages.length === 0 && (
            <div className="py-12">
              <div className="text-center mb-8">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  <Binary size={24} className="text-fg-3" />
                </div>
                <h2 className="text-fg-1 text-base font-semibold mb-1">Reverse Engineering Agent</h2>
                <p className="text-fg-4 text-[12px] max-w-md mx-auto">
                  Powered by REA — analyze binaries, apps, and runtime behavior. Load a file or describe what you want to reverse engineer.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-8">
                {capabilities.map(cap => (
                  <div key={cap.label} className="p-3 rounded-lg bg-bg-2 border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                    <cap.icon size={16} className="text-fg-3 mb-2" />
                    <p className="text-[12px] font-medium text-fg-1">{cap.label}</p>
                    <p className="text-[11px] text-fg-4 mt-0.5">{cap.desc}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  'Analyze this PE binary for packed sections',
                  'Decompile and explain the main function',
                  'Extract strings and API imports',
                  'Inspect this APK for suspicious permissions',
                ].map(s => (
                  <button
                    key={s}
                    onClick={() => useSuggestion(s)}
                    className="px-3 py-1.5 rounded-full text-[11px] text-fg-3 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-fg-1 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
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
                        <Binary size={12} className="text-fg-2" />
                      )}
                    </div>
                    <span className="text-[12px] font-medium text-fg-3">RE Agent</span>
                  </div>
                )}

                {msg.role === 'system' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                    {msg.content.includes('Target loaded') ? (
                      <CheckCircle2 size={14} className="text-green-400/80 shrink-0" />
                    ) : msg.content.includes('Error') ? (
                      <XCircle size={14} className="text-red-400/80 shrink-0" />
                    ) : (
                      <Loader2 size={14} className="text-fg-3 animate-spin shrink-0" />
                    )}
                    <span className="text-[12px] text-fg-3 font-mono">{msg.content}</span>
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
                        <span className="text-[12px] text-fg-4 ml-1">{activity || 'Analyzing...'}</span>
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
              <Binary size={16} className="text-fg-4 shrink-0" />
              <textarea
                ref={ta}
                rows={1}
                value={input}
                onChange={e => { setInput(e.target.value); resize(e.target) }}
                onKeyDown={onKey}
                placeholder={working ? (activity || 'Analyzing...') : targetFile ? `Analyze ${targetFile.split(/[\\/]/).pop()}...` : 'What do you want to reverse engineer?'}
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
            Powered by REA (rea-agents) — reverse engineer binaries, apps, and runtime behavior
          </p>
        </div>
      </div>
    </div>
  )
}
