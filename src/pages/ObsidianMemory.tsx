import PageShell from '@/components/ui/PageShell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { BookOpen, Folder, Search, FileText, Link2 } from 'lucide-react'

const folders = ['AI-Engineering/Projects', 'AI-Engineering/Agents', 'AI-Engineering/Checkpoints', 'AI-Engineering/Decisions', 'AI-Engineering/Research']

export default function ObsidianMemory() {
  return (
    <PageShell
      title="Obsidian Memory"
      subtitle="Long-term agent memory stored in your Obsidian vault"
      actions={<Button variant="primary" size="sm" icon={<Link2 size={14} />}>Connect Vault</Button>}
    >
      <div className="flex flex-col gap-4">
        <Card className="flex items-center gap-3">
          <BookOpen size={20} className="text-accent" />
          <div className="flex-1">
            <p className="text-sm text-fg-0 font-medium">Vault</p>
            <p className="font-mono text-xs text-fg-4">No vault path set</p>
          </div>
          <Badge variant="warn">Disconnected</Badge>
        </Card>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-4" />
          <input disabled placeholder="Search notes..." className="w-full h-control bg-bg-2 border border-white/[0.06] rounded-sm pl-9 pr-3 text-sm placeholder:text-fg-4" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <h3 className="text-sm font-medium text-fg-1 mb-3">Folder structure</h3>
            <ul className="space-y-1.5">
              {folders.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-fg-3">
                  <Folder size={14} className="text-accent/70" /> {f}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3 className="text-sm font-medium text-fg-1 mb-3">Recent notes</h3>
            <div className="py-8 flex flex-col items-center text-center">
              <FileText size={22} className="text-fg-4 mb-2" />
              <p className="text-sm text-fg-4">No notes yet. Connect a vault to see activity.</p>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
