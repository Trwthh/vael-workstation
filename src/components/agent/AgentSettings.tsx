import { useState, useEffect } from 'react'
import { useAgentStore, MODEL_CASCADE, type AgentInfo } from '@/stores/agent'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, TestTube2, Lightbulb, Sparkles, Palette, Zap,
  UserCircle, Search, Gauge, ArrowDownToLine, FolderOpen, RefreshCw,
} from 'lucide-react'

export default function AgentSettings() {
  const { config, updateConfig, showSettings, setShowSettings, currentModelIdx } = useAgentStore()

  useEffect(() => {
    if (!showSettings) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSettings(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showSettings, setShowSettings])

  const ease = [0.22, 1, 0.36, 1] as const

  return (
    <AnimatePresence>
      {showSettings && (
        <motion.div
          key="agent-settings"
          className="fixed inset-0 z-50 flex items-center justify-center p-8 no-drag"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setShowSettings(false)}
          />
          <motion.div
            className="relative w-full max-w-[520px] max-h-[80vh] bg-bg-1 border border-white/[0.08] rounded-2xl shadow-pop overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.22, ease }}
          >
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-[14px] font-semibold text-fg-0">Agent Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-1.5 text-fg-3 hover:text-fg-0 hover:bg-white/[0.06] rounded-lg transition-all duration-150">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-none">
              <section>
                <label className="text-[11px] font-semibold text-fg-2 uppercase tracking-wider">System Instructions</label>
                <textarea
                  value={config.instructions}
                  onChange={(e) => updateConfig({ instructions: e.target.value })}
                  className="mt-2 w-full h-[200px] bg-bg-0 border border-white/[0.08] rounded-xl p-3.5 text-[12px] text-fg-1 placeholder:text-fg-3 resize-none focus:outline-none focus:border-white/[0.16] font-mono leading-relaxed transition-colors"
                />
              </section>

              <section className="space-y-2">
                <label className="text-[11px] font-semibold text-fg-2 uppercase tracking-wider">Model Cascade</label>
                <p className="text-[11px] text-fg-3">Auto-fallback on refusals. Resets to Opus 5.5 each new task.</p>
                <div className="space-y-1 mt-2">
                  {MODEL_CASCADE.map((m, i) => (
                    <div
                      key={m.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 ${
                        i === currentModelIdx
                          ? 'bg-white/[0.08] border border-white/[0.1]'
                          : i < currentModelIdx
                            ? 'opacity-30'
                            : 'bg-bg-0/50 hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                        i === currentModelIdx ? 'bg-green-400' : i < currentModelIdx ? 'bg-fg-4/30' : 'bg-fg-4/50'
                      }`} />
                      <span className="text-sm text-fg-0 font-medium flex-1">{m.name}</span>
                      <span className="text-[10px] text-fg-3">Tier {m.tier}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <label className="text-[11px] text-fg-2 flex-1">Max refusals before fallback</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={config.maxRefusals}
                    onChange={(e) => updateConfig({ maxRefusals: Number(e.target.value) })}
                    className="w-16 bg-bg-0 border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-fg-0 text-center focus:outline-none focus:border-white/[0.16] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </section>

              <AgentsSection />

              <section className="space-y-2">
                <label className="text-[11px] font-semibold text-fg-2 uppercase tracking-wider">Agent Behavior</label>
                <Toggle icon={TestTube2} label="Auto-test code" desc="Verify all code works before presenting" checked={config.autoTest} onChange={(v) => updateConfig({ autoTest: v })} />
                <Toggle icon={Lightbulb} label="Suggest features" desc="Offer improvements after completing tasks" checked={config.suggestFeatures} onChange={(v) => updateConfig({ suggestFeatures: v })} />
                <Toggle icon={Sparkles} label="Go above and beyond" desc="Deliver premium, polished results every time" checked={config.goAboveAndBeyond} onChange={(v) => updateConfig({ goAboveAndBeyond: v })} />
                <Toggle icon={Palette} label="VAEL branding" desc="Include VAEL design system in all UI code" checked={config.vaelBranding} onChange={(v) => updateConfig({ vaelBranding: v })} />
                <Toggle icon={Zap} label="Animated UI" desc="Add modern animations and transitions" checked={config.animatedUI} onChange={(v) => updateConfig({ animatedUI: v })} />
              </section>

              <section className="space-y-2">
                <label className="text-[11px] font-semibold text-fg-2 uppercase tracking-wider">Agents & Research</label>
                <Toggle icon={UserCircle} label="Enforce persona" desc="All agents respond in character as the active persona" checked={config.enforcePersona} onChange={(v) => updateConfig({ enforcePersona: v })} />
                <Toggle icon={Search} label="Research agent" desc="Auto-search for open-source code, tools, offsets, forums" checked={config.researchAgent} onChange={(v) => updateConfig({ researchAgent: v })} />
                <Toggle icon={Gauge} label="Token optimization" desc="Minimize usage with smart batching and context pruning" checked={config.tokenOptimize} onChange={(v) => updateConfig({ tokenOptimize: v })} />
                <Toggle icon={ArrowDownToLine} label="Model cascade" desc="Auto-fallback to cheaper models on refusals" checked={config.modelCascade.length > 1} onChange={() => {}} />
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AgentsSection() {
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [errors, setErrors] = useState<{ file: string; error: string }[]>([])

  const refresh = () => {
    window.electronAPI?.agent.listAgents().then((r) => { setAgents(r.agents); setErrors(r.errors) }).catch(() => {})
  }
  useEffect(refresh, [])

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-fg-2 uppercase tracking-wider">Agents</label>
        <div className="flex items-center gap-1">
          <button onClick={refresh} title="Reload agent files" className="p-1 text-fg-3 hover:text-fg-0 hover:bg-white/[0.06] rounded-md transition-all duration-150">
            <RefreshCw size={12} />
          </button>
          <button
            onClick={() => window.electronAPI?.agent.openAgentsDir()}
            title="Add your own agents as .md files (OpenCode format)"
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-fg-2 hover:text-fg-0 hover:bg-white/[0.06] rounded-md transition-all duration-150"
          >
            <FolderOpen size={12} /> Agents folder
          </button>
        </div>
      </div>
      <p className="text-[11px] text-fg-3">Tab switches the primary agent. Type @name to run one directly.</p>
      <div className="space-y-1 mt-2">
        {agents.map((a) => (
          <div
            key={a.id}
            title={[a.description, `Tools: ${a.tools.join(', ') || 'none'}`, ...a.warnings].join('\n')}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-bg-0/50 transition-opacity duration-150 ${a.disabled ? 'opacity-40' : ''}`}
          >
            <span className="text-[13px] text-fg-0 font-medium w-24 truncate">{a.id}</span>
            <span className="text-[11px] text-fg-3 flex-1 truncate">{a.description}</span>
            <span className="text-[10px] text-fg-3 shrink-0">{a.model?.replace(/^anthropic\//, '') ?? 'inherit'}</span>
            <span className="text-[10px] text-fg-4 shrink-0 w-14 text-right">{a.mode}</span>
          </div>
        ))}
        {errors.map((e) => (
          <div key={e.file} title={e.file} className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-fg-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
            <span className="truncate">{e.file.split(/[\\/]/).pop()}: {e.error}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function Toggle({ icon: Icon, label, desc, checked, onChange }: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const [showInfo, setShowInfo] = useState(false)
  return (
    <button
      onClick={() => onChange(!checked)}
      onMouseEnter={() => setShowInfo(true)}
      onMouseLeave={() => setShowInfo(false)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-0/50 hover:bg-white/[0.04] transition-all duration-150 text-left group relative"
    >
      <Icon size={16} className={`shrink-0 transition-all duration-150 ${checked ? 'text-fg-0 group-hover:scale-110' : 'text-fg-3 group-hover:text-fg-2 group-hover:scale-110'}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-fg-0">{label}</div>
      </div>
      <div className={`shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-fg-0' : 'bg-white/[0.1]'}`}>
        <div className={`w-4 h-4 rounded-full bg-bg-0 mt-0.5 transition-transform duration-200 ${checked ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
      </div>
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1 z-10 px-3 py-2 bg-bg-3 border border-white/[0.1] rounded-lg shadow-pop text-[11px] text-fg-2"
          >
            {desc}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
