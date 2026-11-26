import { motion, AnimatePresence } from 'framer-motion'
import { Hammer, Map as MapIcon } from 'lucide-react'
import type { AgentInfo, SubagentEvent } from '@/stores/agent'

const ease = [0.22, 1, 0.36, 1] as const

const MODE_ICONS: Record<string, typeof Hammer> = { build: Hammer, plan: MapIcon }

/** Build / Plan switch for the primary agent. Tab in the composer toggles it. */
export function AgentModeSwitch({ agents, value, onChange }: {
  agents: AgentInfo[]
  value: string
  onChange: (id: string) => void
}) {
  const primaries = agents.filter((a) => a.mode !== 'subagent' && !a.disabled && !a.hidden)
  if (primaries.length < 2) return null
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      {primaries.map((a) => {
        const Icon = MODE_ICONS[a.id]
        const active = a.id === value
        return (
          <button
            key={a.id}
            onClick={() => onChange(a.id)}
            title={`${a.description}${a.id === value ? '' : '\nTab to switch'}`}
            className={`relative flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] capitalize select-none transition-colors duration-150 ${
              active ? 'text-fg-0' : 'text-fg-3 hover:text-fg-1'
            }`}
          >
            {active && (
              <motion.span
                layoutId="agent-mode-pill"
                className="absolute inset-0 rounded-md bg-white/[0.08]"
                transition={{ duration: 0.2, ease }}
              />
            )}
            {Icon && <Icon size={11} className="relative" />}
            <span className="relative">{a.id}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Live list of subagents the main agent has delegated to during this run. */
export function SubagentList({ items }: { items: SubagentEvent[] }) {
  return (
    <AnimatePresence initial={false}>
      {items.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease }}
          className="shrink-0 px-5 overflow-hidden"
        >
          <div className="max-w-3xl mx-auto mb-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 space-y-1">
            <p className="text-[10px] font-medium text-fg-3 uppercase tracking-wider">Subagents</p>
            <AnimatePresence initial={false}>
              {items.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease }}
                  title={s.summary || s.description}
                  className="flex items-center gap-2 text-[12px] min-w-0"
                >
                  <StatusDot status={s.status} />
                  <span className="text-fg-1 font-medium shrink-0">@{s.agent}</span>
                  <span className="text-fg-3 truncate">{s.description}</span>
                  <span className="ml-auto text-[11px] text-fg-4 font-mono truncate max-w-[45%]">
                    {s.status === 'running' ? s.activity ?? 'Starting...' : s.status === 'done' ? 'Done' : 'Failed'}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function StatusDot({ status }: { status: SubagentEvent['status'] }) {
  if (status === 'running') {
    return (
      <span className="relative shrink-0 w-1.5 h-1.5">
        <span className="absolute inset-0 rounded-full bg-fg-1 animate-ping opacity-40" />
        <span className="absolute inset-0 rounded-full bg-fg-1" />
      </span>
    )
  }
  return <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${status === 'done' ? 'bg-green-400' : 'bg-red-400'}`} />
}

/** The agents an `@` prefix in the composer can match. */
export function mentionMatches(agents: AgentInfo[], input: string): AgentInfo[] {
  const m = /^@([a-z0-9_/-]*)$/i.exec(input)
  if (!m) return []
  const q = m[1].toLowerCase()
  return agents.filter((a) => !a.disabled && !a.hidden && a.id.startsWith(q))
}

export function MentionMenu({ matches, onPick }: { matches: AgentInfo[]; onPick: (a: AgentInfo) => void }) {
  return (
    <AnimatePresence>
      {matches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.16, ease }}
          className="absolute bottom-full left-0 mb-2 w-[340px] bg-bg-1/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-pop overflow-hidden z-20"
        >
          <p className="px-3 pt-2 pb-1 text-[10px] font-medium text-fg-3 uppercase tracking-wider">Run as agent · Tab to pick</p>
          {matches.map((a) => (
            <button
              key={a.id}
              onMouseDown={(e) => { e.preventDefault(); onPick(a) }}
              className="w-full flex items-baseline gap-2 px-3 py-1.5 text-left hover:bg-white/[0.06] transition-colors duration-150"
            >
              <span className="text-[13px] text-fg-0 font-medium shrink-0">@{a.id}</span>
              <span className="text-[11px] text-fg-3 truncate" title={a.description}>{a.description}</span>
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
