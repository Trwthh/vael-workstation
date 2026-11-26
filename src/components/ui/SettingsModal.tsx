import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/stores/app'
import { motion, AnimatePresence } from 'framer-motion'
import { useStyleStore } from '@/stores/style'
import {
  X, Settings, Gauge, FolderLock, ShieldCheck, Info,
  User, Cpu, Zap, Palette, Camera, Brain, MessageSquare,
  Sparkles, RotateCcw, Trash2, ChevronRight,
} from 'lucide-react'

type Tab = 'profile' | 'general' | 'agent' | 'appearance' | 'security' | 'about'

export default function SettingsModal() {
  const { settingsOpen, settingsTab, closeSettings, profile, updateProfile, refusalLogs, clearRefusalLogs, promptRewriteEnabled, setPromptRewrite, startupAnimation, setStartupAnimation } = useAppStore()
  const [tab, setTab] = useState<Tab>('profile')

  useEffect(() => {
    if (settingsOpen && settingsTab && ['profile', 'general', 'agent', 'appearance', 'security', 'about'].includes(settingsTab)) {
      setTab(settingsTab as Tab)
    }
  }, [settingsOpen, settingsTab])
  const [aiInput, setAiInput] = useState('')
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([])

  useEffect(() => {
    if (!settingsOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSettings()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [settingsOpen, closeSettings])

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number | string; className?: string }> }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'general', label: 'General', icon: Settings },
    { id: 'agent', label: 'Agent', icon: Brain },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'about', label: 'About', icon: Info },
  ]

  const handleAiSend = () => {
    if (!aiInput.trim()) return
    const msg = aiInput.trim()
    setAiMessages((prev) => [...prev, { role: 'user', text: msg }])
    setAiInput('')
    setTimeout(() => {
      let response = "I'll adjust that for you."
      if (msg.toLowerCase().includes('dark')) response = "Theme set to dark mode. The interface is already using the VAEL dark palette."
      else if (msg.toLowerCase().includes('compact')) response = "Compact mode enabled. Sidebar and panels are now more condensed."
      else if (msg.toLowerCase().includes('font') || msg.toLowerCase().includes('text')) response = "Font settings updated. Changes applied across all panels."
      else if (msg.toLowerCase().includes('color') || msg.toLowerCase().includes('accent')) response = "Accent color noted. VAEL uses a monochrome palette — I can adjust the intensity."
      else if (msg.toLowerCase().includes('sidebar')) response = "Sidebar layout updated. Try collapsing it with the button at the bottom."
      else if (msg.toLowerCase().includes('animation')) response = "Animation settings adjusted. Transitions will reflect the change."
      else response = "Noted. I've queued that UI adjustment. It will apply on the next render cycle."
      setAiMessages((prev) => [...prev, { role: 'ai', text: response }])
    }, 600)
  }

  const selectCls = 'h-9 bg-bg-0 border border-white/[0.08] rounded-lg px-3 text-sm text-fg-1 focus:outline-none focus:border-white/[0.16] transition-colors w-full appearance-none cursor-pointer'
  const inputCls = 'h-9 bg-bg-0 border border-white/[0.08] rounded-lg px-3 text-sm text-fg-1 focus:outline-none focus:border-white/[0.16] transition-colors w-full'

  const ease = [0.22, 1, 0.36, 1] as const

  return (
    <AnimatePresence>
    {settingsOpen && (
    <motion.div
      key="settings-modal"
      className="fixed inset-0 z-[60] flex items-center justify-center p-8"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={closeSettings}
      />
      <motion.div
        className="relative w-full max-w-[820px] max-h-[85vh] bg-bg-1 border border-white/[0.08] rounded-xl shadow-pop overflow-hidden flex"
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 6 }}
        transition={{ duration: 0.22, ease }}
      >
        {/* Sidebar tabs */}
        <div className="w-[200px] shrink-0 border-r border-white/[0.06] flex flex-col">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-sm font-semibold text-fg-0">Settings</h2>
          </div>
          <nav className="flex-1 px-2 space-y-0.5">
            {tabs.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                    tab === t.id ? 'text-fg-0 font-medium' : 'text-fg-3 hover:text-fg-1 hover:bg-white/[0.04]'
                  }`}
                >
                  {tab === t.id && (
                    <motion.span
                      layoutId="settings-tab-pill"
                      className="absolute inset-0 rounded-lg bg-white/[0.08]"
                      transition={{ duration: 0.22, ease }}
                    />
                  )}
                  <Icon size={15} className="relative" />
                  <span className="relative">{t.label}</span>
                </button>
              )
            })}
          </nav>
          <div className="p-3 border-t border-white/[0.06]">
            <span className="text-[10px] text-fg-3/40 font-mono">v0.1.0</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <h3 className="text-[14px] font-medium text-fg-0">{tabs.find((t) => t.id === tab)?.label}</h3>
            <button onClick={closeSettings} className="p-1 text-fg-3 hover:text-fg-1 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
           <div className="space-y-5">
            {tab === 'profile' && <ProfileTab profile={profile} updateProfile={updateProfile} inputCls={inputCls} />}
            {tab === 'general' && <GeneralTab selectCls={selectCls} />}
            {tab === 'agent' && (
              <AgentTab
                refusalLogs={refusalLogs}
                clearRefusalLogs={clearRefusalLogs}
                promptRewriteEnabled={promptRewriteEnabled}
                setPromptRewrite={setPromptRewrite}
                selectCls={selectCls}
              />
            )}
            {tab === 'appearance' && (
              <AppearanceTab
                aiInput={aiInput}
                setAiInput={setAiInput}
                aiMessages={aiMessages}
                onAiSend={handleAiSend}
                startupAnimation={startupAnimation}
                setStartupAnimation={setStartupAnimation}
              />
            )}
            {tab === 'security' && <SecurityTab />}
            {tab === 'about' && <AboutTab />}
           </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  )
}

function ProfileTab({ profile, updateProfile, inputCls }: {
  profile: { name: string; avatar: string | null; bio: string; email: string }
  updateProfile: (p: Partial<typeof profile>) => void
  inputCls: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateProfile({ avatar: reader.result as string })
    reader.readAsDataURL(file)
  }

  return (
    <>
      {/* Avatar + Name */}
      <div className="flex items-center gap-5">
        <button
          onClick={() => fileRef.current?.click()}
          className="relative w-16 h-16 rounded-full bg-gradient-to-br from-white/[0.12] to-white/[0.04] flex items-center justify-center shrink-0 group overflow-hidden border border-white/[0.08]"
        >
          {profile.avatar ? (
            <img src={profile.avatar} className="w-full h-full object-cover rounded-full" />
          ) : (
            <User size={28} className="text-fg-3" />
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
            <Camera size={18} className="text-fg-2" />
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
        </button>
        <div className="flex-1 space-y-2">
          <label className="block space-y-1">
            <span className="text-[11px] text-fg-3 uppercase tracking-wider font-medium">Display Name</span>
            <input
              className={inputCls}
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
              placeholder="Your name"
            />
          </label>
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] text-fg-3 uppercase tracking-wider font-medium">Email</span>
        <input
          className={inputCls}
          value={profile.email}
          onChange={(e) => updateProfile({ email: e.target.value })}
          placeholder="your@email.com"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[11px] text-fg-3 uppercase tracking-wider font-medium">Bio</span>
        <textarea
          className={`${inputCls} !h-20 py-2 resize-none`}
          value={profile.bio}
          onChange={(e) => updateProfile({ bio: e.target.value })}
          placeholder="Tell the agent about yourself..."
        />
      </label>

      {/* Subscription */}
      <div className="p-4 bg-bg-2/60 rounded-xl border border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-medium text-fg-1">Claude Max</div>
            <div className="text-[11px] text-fg-3 mt-0.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Active subscription
            </div>
          </div>
          <div className="text-[11px] px-2.5 py-1 rounded-full bg-green-400/10 text-green-400 font-medium">
            Connected
          </div>
        </div>
      </div>
    </>
  )
}

function GeneralTab({ selectCls }: { selectCls: string }) {
  return (
    <>
      <SettingsCard icon={Settings} title="Preferences">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-[11px] text-fg-3 uppercase tracking-wider font-medium">Theme</span>
            <select className={selectCls}><option>Dark</option><option>System</option></select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] text-fg-3 uppercase tracking-wider font-medium">Language</span>
            <select className={selectCls}><option>English</option></select>
          </label>
        </div>
      </SettingsCard>

      <SettingsCard icon={Gauge} title="Autonomy">
        <input type="range" min={0} max={3} defaultValue={1} className="w-full accent-fg-0 h-1 rounded-full" />
        <div className="flex justify-between text-[10px] text-fg-3 mt-2 px-0.5">
          <span>Ask always</span><span>Ask writes</span><span>Ask risky</span><span>Auto</span>
        </div>
      </SettingsCard>

      <SettingsCard icon={Cpu} title="Agent defaults">
        <label className="space-y-1.5">
          <span className="text-[11px] text-fg-3 uppercase tracking-wider font-medium">Default model</span>
          <select className={selectCls}>
            <option>Opus 5.5</option>
            <option>Sonnet 5.5</option>
            <option>Haiku 5.5</option>
            <option>Opus 4.8</option>
            <option>Opus 4.7</option>
            <option>Opus 4.6</option>
          </select>
        </label>
        <div className="flex items-center justify-between mt-3">
          <span className="text-[12px] text-fg-2">Token optimization</span>
          <ToggleSwitch defaultChecked />
        </div>
      </SettingsCard>
    </>
  )
}

function AgentTab({ refusalLogs, clearRefusalLogs, promptRewriteEnabled, setPromptRewrite, selectCls }: {
  refusalLogs: { id: string; ts: number; model: string; prompt: string; reason: string; resolution: string }[]
  clearRefusalLogs: () => void
  promptRewriteEnabled: boolean
  setPromptRewrite: (v: boolean) => void
  selectCls: string
}) {
  const learned = useStyleStore((s) => s.learned)
  const forget = useStyleStore((s) => s.forget)
  return (
    <>
      {/* Learned style */}
      <SettingsCard icon={Palette} title="Learned Style">
        <p className="text-[11px] text-fg-3 mb-3">
          Style words you use, like modern or simple, become standing rules for the agent and are saved to your vault.
        </p>
        {learned.length === 0 ? (
          <div className="text-[12px] text-fg-3/60">Nothing learned yet</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {learned.map((l) => (
              <span key={l.word} className="flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[12px] text-fg-1" title={l.quote}>
                {l.word}
                {l.count > 1 && <span className="text-fg-3 tabular-nums">×{l.count}</span>}
                <button onClick={() => forget(l.word)} className="text-fg-3 hover:text-fg-0 transition-colors" title="Forget">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </SettingsCard>

      {/* Prompt Rewriter */}
      <SettingsCard icon={MessageSquare} title="Prompt Rewriter">
        <p className="text-[11px] text-fg-3 mb-3">
          When enabled, the agent rewrites your messages before sending to reduce refusals and improve clarity.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-fg-2">Auto-rewrite prompts</span>
          <ToggleSwitch defaultChecked={promptRewriteEnabled} onChange={setPromptRewrite} />
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[12px] text-fg-2">Show rewrites before sending</span>
          <ToggleSwitch defaultChecked />
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[12px] text-fg-2">Learn from successful prompts</span>
          <ToggleSwitch defaultChecked />
        </div>
      </SettingsCard>

      {/* Agent Memory */}
      <SettingsCard icon={Brain} title="Agent Memory">
        <p className="text-[11px] text-fg-3 mb-3">
          The agent stores learned patterns, corrections, and refusal workarounds in the Obsidian vault.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-fg-2">Obsidian vault integration</span>
          <ToggleSwitch defaultChecked />
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[12px] text-fg-2">Auto-save refusals &amp; fixes</span>
          <ToggleSwitch defaultChecked />
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[12px] text-fg-2">Self-improving prompts</span>
          <ToggleSwitch defaultChecked />
        </div>
        <div className="mt-3 p-3 bg-bg-0/80 rounded-lg border border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-fg-3 font-medium">Vault path</span>
            <span className="text-[11px] text-fg-3 font-mono">D:\Notes</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-fg-3 font-medium">Learned patterns</span>
            <span className="text-[11px] text-fg-3">0 entries</span>
          </div>
        </div>
      </SettingsCard>

      {/* Refusal Log */}
      <SettingsCard icon={RotateCcw} title="Refusal Log">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] text-fg-3">Tracks model refusals and how they were resolved.</p>
          {refusalLogs.length > 0 && (
            <button onClick={clearRefusalLogs} className="text-[11px] text-fg-3 hover:text-red-400 flex items-center gap-1 transition-colors">
              <Trash2 size={11} /> Clear
            </button>
          )}
        </div>
        {refusalLogs.length === 0 ? (
          <div className="text-center py-6 text-[12px] text-fg-3/50">
            No refusals logged yet
          </div>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-none">
            {refusalLogs.map((log) => (
              <div key={log.id} className="p-2.5 bg-bg-0/60 rounded-lg border border-white/[0.06]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-fg-3 font-medium">{log.model}</span>
                  <span className="text-[10px] text-fg-3">{new Date(log.ts).toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-fg-3 truncate">{log.reason}</p>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>

      {/* Token Usage */}
      <SettingsCard icon={Zap} title="Token Optimization">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-bg-0/60 rounded-lg">
            <div className="text-[18px] font-light text-fg-0">0</div>
            <div className="text-[10px] text-fg-3 mt-1">Messages</div>
          </div>
          <div className="text-center p-3 bg-bg-0/60 rounded-lg">
            <div className="text-[18px] font-light text-fg-0">0</div>
            <div className="text-[10px] text-fg-3 mt-1">Tokens used</div>
          </div>
          <div className="text-center p-3 bg-bg-0/60 rounded-lg">
            <div className="text-[18px] font-light text-fg-0">0</div>
            <div className="text-[10px] text-fg-3 mt-1">Tokens saved</div>
          </div>
        </div>
      </SettingsCard>
    </>
  )
}

function AppearanceTab({ aiInput, setAiInput, aiMessages, onAiSend, startupAnimation, setStartupAnimation }: {
  aiInput: string
  setAiInput: (v: string) => void
  aiMessages: { role: 'user' | 'ai'; text: string }[]
  onAiSend: () => void
  startupAnimation: string
  setStartupAnimation: (v: 'shatter' | 'pulse' | 'glitch') => void
}) {
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages])

  const animations = [
    { id: 'shatter' as const, name: 'Shatter', desc: 'Particle burst with ring expand and scanline sweep' },
    { id: 'pulse' as const, name: 'Pulse', desc: 'Smooth scale-up with breathing glow and concentric rings' },
    { id: 'glitch' as const, name: 'Glitch', desc: 'Chromatic aberration offset with horizontal glitch lines' },
  ]

  return (
    <>
      <SettingsCard icon={Palette} title="Interface">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-fg-2">Animated UI</span>
          <ToggleSwitch defaultChecked />
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[12px] text-fg-2">VAEL branding</span>
          <ToggleSwitch defaultChecked />
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[12px] text-fg-2">Compact mode</span>
          <ToggleSwitch />
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[12px] text-fg-2">Snap panels</span>
          <ToggleSwitch defaultChecked />
        </div>
      </SettingsCard>

      {/* Theme Picker */}
      <SettingsCard icon={Palette} title="Theme">
        <ThemePicker />
      </SettingsCard>

      {/* Startup Animation Picker */}
      <SettingsCard icon={Sparkles} title="Startup Animation">
        <div className="space-y-2">
          {animations.map((a) => (
            <button
              key={a.id}
              onClick={() => setStartupAnimation(a.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                startupAnimation === a.id
                  ? 'border-fg-0/30 bg-white/[0.06]'
                  : 'border-white/[0.06] bg-bg-0/50 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  startupAnimation === a.id ? 'bg-fg-0/10' : 'bg-white/[0.04]'
                }`}>
                  <svg width={20} height={20} viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="18" strokeLinejoin="round" strokeLinecap="round" className={startupAnimation === a.id ? 'text-fg-0' : 'text-fg-3'}>
                    <path d="M30 54 H226 L128 226 Z" />
                    <path d="M128 54 V152" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-fg-1 flex items-center gap-2">
                    {a.name}
                    {startupAnimation === a.id && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-fg-0/10 text-fg-2 font-medium">Active</span>
                    )}
                  </div>
                  <div className="text-[11px] text-fg-3 mt-0.5">{a.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </SettingsCard>

      {/* AI UI Assistant */}
      <div className="p-4 bg-bg-2/60 rounded-xl border border-white/[0.06]">
        <h3 className="text-[12px] font-semibold text-fg-1 flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-fg-3" />
          AI Interface Assistant
        </h3>
        <p className="text-[11px] text-fg-3 mb-3">
          Ask the AI to modify the app's interface. It can change layouts, colors, and UI elements without touching code.
        </p>

        {/* Chat area */}
        <div className="bg-bg-0/80 rounded-lg border border-white/[0.06] overflow-hidden">
          <div className="h-[160px] overflow-y-auto p-3 space-y-2 scrollbar-none">
            {aiMessages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles size={16} className="text-fg-3/30 mx-auto mb-2" />
                <p className="text-[11px] text-fg-3/40">Try: "make the sidebar darker" or "enable compact mode"</p>
              </div>
            )}
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-1.5 rounded-lg text-[12px] ${
                  msg.role === 'user'
                    ? 'bg-white/[0.08] text-fg-1'
                    : 'bg-white/[0.04] text-fg-2'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEnd} />
          </div>
          <div className="border-t border-white/[0.06] p-2 flex gap-2">
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onAiSend() }}
              placeholder="Describe a UI change..."
              className="flex-1 bg-transparent text-[12px] text-fg-1 placeholder:text-fg-3/40 focus:outline-none px-2"
            />
            <button
              onClick={onAiSend}
              disabled={!aiInput.trim()}
              className="px-3 py-1 bg-white/[0.08] hover:bg-white/[0.12] text-[11px] text-fg-2 rounded-md transition-colors disabled:opacity-30"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function SecurityTab() {
  return (
    <>
      <SettingsCard icon={ShieldCheck} title="Credential Storage">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-fg-2">Status</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-medium">
            Not initialized
          </span>
        </div>
        <p className="text-[11px] text-fg-3 mt-3 leading-relaxed">
          Your Claude Max session is kept in the OS credential vault, never in plain files.
        </p>
      </SettingsCard>

      <SettingsCard icon={FolderLock} title="File Permissions">
        <p className="text-[11px] text-fg-3 mb-3">Agents may only touch these paths.</p>
        <div className="font-mono text-[11px] text-fg-3 border border-dashed border-white/[0.08] rounded-lg p-3 mb-3">
          No paths allowed yet
        </div>
        <button className="text-[12px] text-fg-2 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-colors font-medium">
          Add path
        </button>
      </SettingsCard>
    </>
  )
}

function AboutTab() {
  return (
    <SettingsCard icon={Info} title="VAEL Workstation" className="!bg-bg-0/50">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-fg-2">Version</span>
          <span className="text-[12px] text-fg-3 font-mono">0.1.0</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-fg-2">Runtime</span>
          <span className="text-[12px] text-fg-3 font-mono">Electron 33 + React 18</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-fg-2">License</span>
          <span className="text-[12px] text-fg-3">MIT</span>
        </div>
        <div className="pt-3 border-t border-white/[0.06] flex gap-1.5">
          {['Documentation', 'Changelog', 'Report an issue'].map((label) => (
            <button
              key={label}
              className="text-[11px] text-fg-3 hover:text-fg-1 px-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </SettingsCard>
  )
}

function SettingsCard({ icon: Icon, title, children, className = '' }: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`p-4 bg-bg-2/60 rounded-xl border border-white/[0.06] ${className}`}>
      <h3 className="text-[12px] font-semibold text-fg-1 flex items-center gap-2 mb-3">
        <Icon size={14} className="text-fg-3" />
        {title}
      </h3>
      {children}
    </div>
  )
}

import { THEMES as THEME_DEFS, type ThemeId } from '@/stores/app'

const THEME_SWATCHES: { id: ThemeId; colors: string[] }[] = [
  { id: 'midnight', colors: ['#0f0f11', '#161619', '#3b5bdb', '#5c7cfa'] },
  { id: 'noir', colors: ['#0a0a0a', '#111111', '#333333', '#555555'] },
  { id: 'ocean', colors: ['#0d1117', '#161b22', '#1f6feb', '#58a6ff'] },
  { id: 'dusk', colors: ['#15121a', '#1c1824', '#7c3aed', '#a78bfa'] },
]

function ThemePicker() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  return (
    <div className="grid grid-cols-2 gap-2">
      {THEME_SWATCHES.map((t) => (
        <motion.button
          key={t.id}
          onClick={() => setTheme(t.id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`relative p-3 rounded-xl border transition-all duration-200 text-left ${
            theme === t.id
              ? 'border-fg-0/30 bg-white/[0.06] ring-1 ring-fg-0/20'
              : 'border-white/[0.06] bg-bg-0/50 hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center gap-1.5 mb-2">
            {t.colors.map((c, i) => (
              <div key={i} className="w-3 h-3 rounded-full border border-white/[0.1]" style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="text-[12px] font-medium text-fg-1">{THEME_DEFS[t.id].name}</div>
          {theme === t.id && (
            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-fg-0" />
          )}
        </motion.button>
      ))}
    </div>
  )
}

function ToggleSwitch({ defaultChecked = false, onChange }: { defaultChecked?: boolean; onChange?: (v: boolean) => void }) {
  const [checked, setChecked] = useState(defaultChecked)
  return (
    <button
      onClick={() => { setChecked((v) => { const next = !v; onChange?.(next); return next }); }}
      className={`relative w-8 h-[18px] shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-fg-0' : 'bg-white/[0.1]'}`}
    >
      <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-bg-0 transition-transform duration-200 ${checked ? 'translate-x-[14px]' : ''}`} />
    </button>
  )
}
