import { useState, useEffect } from 'react'
import { useAppStore, type Page } from '@/stores/app'
import { Search, Bell, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import WindowControls from './WindowControls'

const pageLabels: Record<Page, string> = {
  'dashboard': 'Home',
  'main-agent': 'Agent',
  'search': 'Search',
  'supervisor': 'Supervisor',
  'agent-manager': 'Agent Manager',
  'personas': 'Personas',
  'code-editor': 'Code',
  'project-manager': 'Projects',
  'game-modding': 'Game Modding',
  'cybersecurity': 'Cybersecurity',
  'reverse-engineering': 'Reverse Engineering',
  'obsidian-memory': 'Memory',
  'model-manager': 'Models',
  'tool-integrations': 'Integrations',
  'terminal': 'Terminal',
  'task-queue': 'Task Queue',
  'build-manager': 'Build Manager',
  'support': 'Support',
  'settings': 'Settings',
}

interface AIStatus {
  connected: boolean
  cliFound: boolean
  cliVersion: string | null
  model: string
  error: string | null
}

export default function Topbar() {
  const page = useAppStore((s) => s.page)
  const setPage = useAppStore((s) => s.setPage)
  const [aiStatus, setAiStatus] = useState<AIStatus>({ connected: false, cliFound: false, cliVersion: null, model: 'claude-sonnet-5-5', error: null })
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const api = window.electronAPI?.ai
    if (!api) {
      setAiStatus({ connected: true, cliFound: true, cliVersion: 'dev', model: 'claude-sonnet-5-5', error: null })
      setChecking(false)
      return
    }

    api.status().then((s: AIStatus) => {
      setAiStatus(s)
      setChecking(false)
    }).catch(() => setChecking(false))

    const unsub = api.onStatusUpdate((s: AIStatus) => {
      setAiStatus(s)
      setChecking(false)
    })

    return unsub
  }, [])

  const handleRecheck = () => {
    setChecking(true)
    window.electronAPI?.ai?.check().then((s: AIStatus) => {
      setAiStatus(s)
      setChecking(false)
    }).catch(() => setChecking(false))
  }

  const statusColor = checking
    ? 'bg-yellow-400/80'
    : aiStatus.connected
      ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]'
      : 'bg-red-400/80'

  const statusLabel = checking
    ? 'Connecting...'
    : aiStatus.connected
      ? `Claude Connected`
      : 'Not Connected'

  const statusTooltip = checking
    ? 'Checking Claude CLI...'
    : aiStatus.connected
      ? `Claude CLI ${aiStatus.cliVersion || ''} — ${aiStatus.model.replace('claude-', '').replace(/-/g, ' ')}`
      : aiStatus.error || 'Claude CLI not found'

  return (
    <header className="h-[52px] bg-bg-1/60 backdrop-blur-glass border-b border-white/[0.06] flex items-center justify-between drag-region shrink-0">
      <div className="flex items-center px-5 no-drag">
        <h1 className="text-[14px] font-medium text-fg-1">
          {pageLabels[page]}
        </h1>
      </div>

      <div className="flex items-center gap-0.5 no-drag">
        {/* AI Connection Status */}
        <button
          onClick={handleRecheck}
          title={statusTooltip}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all mr-2 group"
        >
          <div className={`w-[7px] h-[7px] rounded-full transition-colors ${statusColor}`} />
          <span className="text-[11px] text-fg-3 font-medium group-hover:text-fg-1 transition-colors">{statusLabel}</span>
          {!aiStatus.connected && !checking && (
            <RefreshCw size={10} className="text-fg-4 group-hover:text-fg-2 transition-colors" />
          )}
        </button>

        {/* Search */}
        <button onClick={() => setPage('search')} title="Search" className="w-9 h-9 flex items-center justify-center rounded-lg text-fg-4 hover:text-fg-1 hover:bg-white/[0.06] transition-colors">
          <Search size={15} />
        </button>

        {/* Notifications */}
        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-fg-4 hover:text-fg-1 hover:bg-white/[0.06] transition-colors relative">
          <Bell size={15} />
        </button>

        {/* Window controls */}
        <div className="ml-2 pl-2 border-l border-white/[0.06]">
          <WindowControls />
        </div>
      </div>
    </header>
  )
}
