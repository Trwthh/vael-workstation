import PageShell from '@/components/ui/PageShell'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Bot, ShieldCheck, RefreshCw, ScrollText, Sparkles } from 'lucide-react'

const agents = ['Main Agent', 'Code Reviewer', 'Debugger', 'Tester']

export default function Supervisor() {
  return (
    <PageShell title="Supervisor" subtitle="Watches agents, recovers from failures, and tunes prompts">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 flex flex-col gap-4 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {agents.map((name) => (
              <Card key={name} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-bg-3 text-fg-3 flex items-center justify-center">
                  {name === 'Code Reviewer' ? <ShieldCheck size={18} /> : <Bot size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg-0 font-medium truncate">{name}</p>
                  <p className="text-xs text-fg-4">No heartbeat yet</p>
                </div>
                <Badge>Inactive</Badge>
              </Card>
            ))}
          </div>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <ScrollText size={16} className="text-fg-3" />
              <h3 className="text-sm font-medium text-fg-1">Recovery log</h3>
            </div>
            <div className="py-8 text-center text-sm text-fg-4 border border-dashed border-white/[0.06] rounded-sm">
              No recoveries recorded. Stalls, crashes and retries will appear here.
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-fg-3" />
                <h3 className="text-sm font-medium text-fg-1">Prompt optimization</h3>
              </div>
              <Badge>Off</Badge>
            </div>
            <p className="text-xs text-fg-3 mt-2">Rewrite vague prompts before they reach an agent.</p>
            <Button size="sm" className="mt-3">Enable</Button>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw size={16} className="text-fg-3" />
              <h3 className="text-sm font-medium text-fg-1">Retry settings</h3>
            </div>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between"><dt className="text-fg-3">Max retries</dt><dd className="text-fg-1">3</dd></div>
              <div className="flex justify-between"><dt className="text-fg-3">Backoff</dt><dd className="text-fg-1">Exponential</dd></div>
              <div className="flex justify-between"><dt className="text-fg-3">Stall timeout</dt><dd className="text-fg-1">120 s</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
