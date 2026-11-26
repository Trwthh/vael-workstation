import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import type { SubagentEvent } from '@/stores/agent'

export interface AgentTask {
  text: string
  active: string
  status: 'pending' | 'in_progress' | 'completed'
}

const MAX_TASK_ROWS = 6

/** What the agent is doing right now, quietly, under its latest reply. Renders nothing when idle. */
export default function LiveActivity({ working, activity, tasks, subagents }: {
  working: boolean
  activity: string | null
  tasks: AgentTask[]
  subagents: SubagentEvent[]
}) {
  const doneCount = tasks.filter((t) => t.status === 'completed').length
  const open = tasks.filter((t) => t.status !== 'completed')
  const rows = open.slice(0, doneCount > 0 && tasks.length > MAX_TASK_ROWS ? MAX_TASK_ROWS - 1 : MAX_TASK_ROWS)
  const hidden = open.length - rows.length
  const running = subagents.filter((s) => s.status === 'running')
  const show = working && (activity || tasks.length > 0 || running.length > 0)

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="live-activity"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="pl-9 pr-4 !mt-2 space-y-1 text-[12px] leading-5 text-fg-3"
          aria-live="polite"
        >
          {activity && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-fg-2 animate-pulse" />
              <span className="truncate">{activity}</span>
            </div>
          )}

          {tasks.length > 0 && (
            <ul className="space-y-0.5">
              {doneCount > 0 && (
                <li className="flex items-center gap-2 text-fg-3">
                  <Check size={11} className="shrink-0" />
                  <span>{doneCount} of {tasks.length} done</span>
                </li>
              )}
              {rows.map((t, i) => {
                const current = t.status === 'in_progress'
                return (
                  <li key={`${i}-${t.text}`} className={`flex items-center gap-2 min-w-0 ${current ? 'text-fg-0' : 'text-fg-3'}`}>
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${current ? 'bg-fg-0' : 'border border-fg-4'}`} />
                    <span className="truncate">{current ? t.active : t.text}</span>
                  </li>
                )
              })}
              {hidden > 0 && <li className="pl-3.5 text-fg-4">+{hidden} more</li>}
            </ul>
          )}

          {running.map((s) => (
            <div key={s.id} className="flex items-center gap-2 min-w-0" title={s.description}>
              <span className="shrink-0 text-fg-2">@{s.agent}</span>
              <span className="truncate">{s.activity ?? s.description}</span>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
