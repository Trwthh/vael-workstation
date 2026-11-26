import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Send, Gamepad2, Binary, Search, Code2, Shield, Terminal } from 'lucide-react'
import { AttachButton, AttachChips, useAttachments, handlePaste } from '@/components/ui/Attach'
import { VaelMark } from '@/components/ui/VaelLogo'
import { useAppStore } from '@/stores/app'
import { useMessagesStore } from '@/stores/messages'
import { useStyleStore } from '@/stores/style'
import { useAgentStore, MODEL_CASCADE } from '@/stores/agent'

const suggestions = [
  { icon: Gamepad2, label: 'Build a Minecraft mod' },
  { icon: Binary, label: 'Reverse engineer an APK' },
  { icon: Search, label: 'Find game downloads' },
  { icon: Code2, label: 'Cheat engine script' },
  { icon: Shield, label: 'Scan for vulnerabilities' },
  { icon: Terminal, label: 'Set up a dev env' },
]

const GTA_VI_PROMPT = 'Run GTA VI. Clone the xbox-emulator, set up the Rust toolchain, analyze my game dump, extract what\'s needed from gameos.xvd, configure the emulator, and start working through every blocker until the game reaches the main menu. My game files are downloaded — find them and get started. Work autonomously, don\'t wait for me.'

const ROTATING_PLACEHOLDERS = [
  'Build a Roblox obby with leaderboards...',
  'Reverse engineer this APK for me...',
  'Find the best game mods for Minecraft...',
  'Write a Lua script for Cheat Engine...',
  'Set up a Node.js REST API...',
  'Create a Discord bot with slash commands...',
  'Decompile and analyze this binary...',
  'Build a custom game launcher...',
]

function useRotatingText(texts: string[], typingSpeed = 40, pauseMs = 2500) {
  const [display, setDisplay] = useState('')
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const text = texts[idx]
    let charIdx = 0
    let erasing = false
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      if (!erasing) {
        charIdx++
        setDisplay(text.slice(0, charIdx))
        if (charIdx >= text.length) {
          timer = setTimeout(() => { erasing = true; tick() }, pauseMs)
          return
        }
        timer = setTimeout(tick, typingSpeed + Math.random() * 20)
      } else {
        charIdx--
        setDisplay(text.slice(0, charIdx))
        if (charIdx <= 0) {
          setIdx((i) => (i + 1) % texts.length)
          return
        }
        timer = setTimeout(tick, typingSpeed / 2)
      }
    }

    timer = setTimeout(tick, 300)
    return () => clearTimeout(timer)
  }, [idx, texts, typingSpeed, pauseMs])

  return display
}

export default function Dashboard() {
  const [input, setInput] = useState('')
  const createSession = useAppStore((s) => s.createSession)
  const ta = useRef<HTMLTextAreaElement>(null)
  const { currentModelIdx } = useAgentStore()
  const activeModel = MODEL_CASCADE[currentModelIdx]

  const attach = useAttachments()
  const canSend = !!input.trim() || attach.items.length > 0
  const rotatingText = useRotatingText(ROTATING_PLACEHOLDERS)

  const send = () => {
    if (!canSend) return
    useStyleStore.getState().learn(input)
    const text = input.trim()
    const attachments = attach.items.map(({ name, size, kind, count, preview }) => ({ name, size, kind, count, preview }))
    createSession((text || attachments[0]?.name || 'New chat').slice(0, 60))
    const id = useAppStore.getState().activeSessionId
    if (id) {
      useMessagesStore.getState().addMessage(id, {
        id: String(Date.now()), role: 'user', content: text,
        attachments: attachments.length ? attachments : undefined, ts: Date.now(),
      })
    }
    attach.clear()
    setInput('')
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const resize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  const fillInput = (text: string) => {
    setInput(text)
    ta.current?.focus()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Centered hero */}
      <div className="flex-1 flex items-end justify-center pb-8">
        <div className="flex flex-col items-center gap-5 w-full max-w-2xl px-6">
          {/* Logo + subtitle */}
          <motion.div
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="relative">
              <div className="absolute inset-0 blur-2xl bg-white/[0.04] rounded-full scale-150 animate-pulse" style={{ animationDuration: '4s' }} />
              <div className="relative text-fg-1">
                <VaelMark size={48} />
              </div>
            </div>
            <p className="text-fg-2 text-[15px] font-light tracking-wide">
              Ask anything — I'll figure out the rest
            </p>
          </motion.div>

          {/* Chat input */}
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="relative group/input">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.03] opacity-100 group-focus-within/input:from-white/[0.14] group-focus-within/input:to-white/[0.06] transition-all duration-300" />
              <div className="relative bg-bg-2/90 backdrop-blur-sm rounded-2xl input-glow">
                {attach.items.length > 0 && (
                  <div className="px-3 pt-3">
                    <AttachChips items={attach.items} onRemove={attach.remove} />
                  </div>
                )}
                <div className="px-4 py-3.5 flex items-center gap-3">
                  <AttachButton onFiles={attach.addFiles} onFolder={attach.addFolder} />
                  <div className="flex-1 relative">
                    {!input && (
                      <div className="absolute inset-0 flex items-center pointer-events-none">
                        <span className="text-fg-3 text-[14px]">
                          {rotatingText}
                          <span className="inline-block w-[2px] h-[14px] bg-fg-3/60 ml-0.5 align-middle animate-pulse" />
                        </span>
                      </div>
                    )}
                    <textarea
                      ref={ta}
                      rows={1}
                      value={input}
                      onChange={(e) => { setInput(e.target.value); resize(e.target) }}
                      onKeyDown={onKey}
                      onPaste={handlePaste}
                      placeholder=""
                      className="w-full resize-none bg-transparent text-fg-0 text-[14px] focus:outline-none leading-normal relative z-[1]"
                      style={{ maxHeight: 200 }}
                    />
                  </div>
                  <button
                    onClick={send}
                    disabled={!canSend}
                    className="shrink-0 w-8 h-8 rounded-xl bg-fg-0 text-bg-0 flex items-center justify-center hover:bg-white hover:scale-105 active:scale-95 transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-1.5 px-1">
              <span className="text-[11px] text-fg-3 font-mono tracking-wide">{activeModel.name}</span>
            </div>
          </motion.div>

          {/* GTA VI Quick Launch */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={() => {
              useAgentStore.getState().setPending('Xbox Translator', GTA_VI_PROMPT)
              createSession('GTA VI — Xbox Translation')
            }}
            className="group relative flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg w-full max-w-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] group-hover:bg-white/[0.10] flex items-center justify-center transition-colors duration-200">
              <Gamepad2 size={20} className="text-fg-1" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-fg-0">GTA VI</p>
              <p className="text-xs text-fg-3">Run Xbox build on PC via translation layer</p>
            </div>
          </motion.button>

          {/* Suggestion chips */}
          <motion.div
            className="grid grid-cols-2 gap-2 w-full"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05, delayChildren: 0.25 } },
            }}
          >
            {suggestions.map(({ icon: Icon, label }) => (
              <motion.button
                key={label}
                onClick={() => fillInput(label)}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] text-fg-1 text-[13px] text-left hover:bg-white/[0.07] hover:border-white/[0.12] hover:text-fg-0 hover:translate-y-[-1px] hover:shadow-soft transition-all duration-200 group"
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
                }}
              >
                <Icon size={15} className="shrink-0 text-fg-2 group-hover:text-fg-1 transition-colors duration-200" />
                <span className="truncate">{label}</span>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom spacer for visual balance */}
      <div className="shrink-0 h-[20vh]" />
    </div>
  )
}
