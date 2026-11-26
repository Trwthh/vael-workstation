import PageShell from '@/components/ui/PageShell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { GitBranch, Hexagon, Code2, Wrench, Container, Package, Terminal, RefreshCw } from 'lucide-react'

const tools = [
  { name: 'Git', icon: GitBranch },
  { name: 'Node.js', icon: Hexagon },
  { name: 'Python', icon: Code2 },
  { name: 'Compilers', icon: Wrench },
  { name: 'Docker', icon: Container },
  { name: 'pnpm', icon: Package },
  { name: 'PowerShell', icon: Terminal },
]

export default function ToolIntegrations() {
  return (
    <PageShell
      title="Tool Integrations"
      subtitle="Developer tools the agents can call on this machine"
      actions={<Button size="sm" icon={<RefreshCw size={14} />}>Re-scan</Button>}
    >
      <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
        {tools.map(({ name, icon: Icon }) => (
          <Card key={name} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-bg-3 text-fg-2 flex items-center justify-center">
                <Icon size={18} />
              </div>
              <span className="flex items-center gap-1.5 text-xs text-fg-3">
                <span className="w-2 h-2 rounded-full bg-status-warn animate-pulse" /> Checking
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-fg-0">{name}</p>
              <p className="text-xs text-fg-4 font-mono mt-0.5">Detecting...</p>
            </div>
            <Button size="sm" className="w-full">Configure</Button>
          </Card>
        ))}
      </div>
    </PageShell>
  )
}
