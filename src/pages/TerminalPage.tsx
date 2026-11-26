import PageShell from '@/components/ui/PageShell'
import Button from '@/components/ui/Button'
import { Plus, X, TerminalSquare } from 'lucide-react'

export default function TerminalPage() {
  return (
    <PageShell
      title="Terminal"
      subtitle="Shell sessions shared between you and your agents"
      actions={<Button variant="primary" size="sm" icon={<Plus size={14} />}>New Terminal</Button>}
    >
      <div className="h-full flex flex-col rounded-lg border border-white/[0.06] overflow-hidden">
        <div className="flex items-center bg-bg-2 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2 px-4 h-9 text-sm text-fg-0 bg-bg-0 border-b-2 border-white/30">
            <TerminalSquare size={14} className="text-fg-3" />
            PowerShell 1
            <X size={12} className="text-fg-4 hover:text-fg-1 cursor-pointer" />
          </div>
          <button className="px-3 h-9 text-fg-4 hover:text-fg-1" aria-label="New tab"><Plus size={14} /></button>
        </div>
        <div className="flex-1 min-h-0 bg-bg-0 p-4 font-mono text-sm text-fg-2 overflow-auto">
          <p className="text-fg-4">No shell attached yet.</p>
          <p className="mt-2">
            <span className="text-fg-3">$</span>{' '}
            <span className="inline-block w-2 h-4 align-middle bg-fg-1 animate-pulse" />
          </p>
        </div>
      </div>
    </PageShell>
  )
}
