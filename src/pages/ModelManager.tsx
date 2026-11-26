import PageShell from '@/components/ui/PageShell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Cpu, Cloud, HardDrive, BadgeCheck, Zap } from 'lucide-react'

const providers = [
  { name: 'Claude Max', desc: 'Claude models through your Claude Max subscription', icon: Cloud, status: 'Not connected', action: 'Connect Claude Max' },
  { name: 'Local', desc: 'Ollama or LM Studio endpoint', icon: HardDrive, status: 'Not configured', action: 'Test connection' },
]
const agents = ['Main Agent', 'Supervisor', 'Code Reviewer', 'Debugger', 'Researcher']

export default function ModelManager() {
  return (
    <PageShell title="Model Manager" subtitle="Connect your Claude Max subscription and assign a model to each agent">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          {providers.map(({ name, desc, icon: Icon, status, action }) => (
            <Card key={name} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Icon size={20} className="text-accent" />
                <Badge>{status}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-fg-0">{name}</p>
                <p className="text-xs text-fg-3">{desc}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-fg-4">
                <BadgeCheck size={14} />
                <span>{name === 'Claude Max' ? 'Signs in with your account. No API key needed.' : 'Runs on this machine'}</span>
              </div>
              <Button size="sm" icon={<Zap size={13} />}>{action}</Button>
            </Card>
          ))}
        </div>

        <Card>
          <h3 className="text-sm font-medium text-fg-1 mb-3 flex items-center gap-2"><Cpu size={14} /> Per-agent assignment</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-fg-4">
                <th className="py-2 font-medium">Agent</th>
                <th className="py-2 font-medium">Provider</th>
                <th className="py-2 font-medium">Model</th>
                <th className="py-2 font-medium">Temperature</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a} className="border-t border-white/[0.06]">
                  <td className="py-2 text-fg-1">{a}</td>
                  <td className="py-2 text-fg-4">Not assigned</td>
                  <td className="py-2 text-fg-4">Not assigned</td>
                  <td className="py-2 text-fg-4">0.2</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </PageShell>
  )
}
