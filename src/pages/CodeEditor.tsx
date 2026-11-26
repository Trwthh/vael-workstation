import PageShell from '@/components/ui/PageShell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { FolderOpen, Code2 } from 'lucide-react'

const tabs = ['Terminal', 'Output', 'Problems']

export default function CodeEditor() {
  return (
    <PageShell title="Code Editor" subtitle="Edit project files with agent assistance">
      <div className="h-full flex gap-4 min-w-0">
        <Card className="w-56 shrink-0 p-0 flex flex-col overflow-hidden">
          <div className="px-3 h-10 flex items-center justify-between border-b border-white/[0.06]">
            <span className="text-xs uppercase tracking-wide text-fg-4">Explorer</span>
            <FolderOpen size={14} className="text-fg-3" />
          </div>
          <p className="p-3 text-xs text-fg-4">No folder open.</p>
        </Card>

        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Monaco editor mounts in this container */}
          <Card className="flex-1 min-h-0 flex flex-col items-center justify-center bg-bg-1 text-center">
            <Code2 size={32} className="text-fg-4 mb-3" />
            <p className="text-fg-2">Open a file or project to begin editing</p>
            <Button size="sm" className="mt-3">Open Project</Button>
          </Card>
          <Card className="h-44 shrink-0 p-0 flex flex-col overflow-hidden">
            <div className="flex border-b border-white/[0.06] shrink-0">
              {tabs.map((t, i) => (
                <button key={t} className={`px-4 h-9 text-sm ${i === 0 ? 'text-fg-0 border-b-2 border-white/30' : 'text-fg-3 hover:text-fg-1'}`}>
                  {t}
                </button>
              ))}
            </div>
            <p className="p-3 font-mono text-xs text-fg-4">No terminal session running.</p>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
