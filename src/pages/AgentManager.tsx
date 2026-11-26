import PageShell from '@/components/ui/PageShell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import {
  Bot, Eye, ShieldCheck, Bug, FlaskConical, Search, Gamepad2, Lock, Binary, Monitor, Plus,
} from 'lucide-react'

const agents = [
  { name: 'Main Agent', icon: Bot },
  { name: 'Supervisor', icon: Eye },
  { name: 'Code Reviewer', icon: ShieldCheck },
  { name: 'Debugger', icon: Bug },
  { name: 'Tester', icon: FlaskConical },
  { name: 'Researcher', icon: Search },
  { name: 'Game Modding', icon: Gamepad2 },
  { name: 'Cybersecurity', icon: Lock },
  { name: 'RE', icon: Binary },
  { name: 'Windows', icon: Monitor },
]

export default function AgentManager() {
  return (
    <PageShell
      title="Agent Manager"
      subtitle="Configure each agent's model, persona and permissions"
      actions={<Button variant="primary" size="sm" icon={<Plus size={14} />}>New Agent</Button>}
    >
      <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.map(({ name, icon: Icon }) => (
          <Card key={name} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-accent-muted text-accent flex items-center justify-center">
                <Icon size={20} />
              </div>
              <Badge>Inactive</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-fg-0">{name}</p>
              <p className="text-xs text-fg-4 mt-0.5">Model: <span className="text-fg-3">Not assigned</span></p>
            </div>
            <Button size="sm" className="w-full">Configure</Button>
          </Card>
        ))}
      </div>
    </PageShell>
  )
}
