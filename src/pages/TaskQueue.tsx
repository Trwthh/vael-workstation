import PageShell from '@/components/ui/PageShell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { ListTodo, Plus, Filter, ChevronDown } from 'lucide-react'

const columns = ['ID', 'Description', 'Priority', 'Agent', 'Status', 'Actions']

export default function TaskQueue() {
  return (
    <PageShell
      title="Task Queue"
      subtitle="Work waiting for, or assigned to, your agents"
      actions={<Button variant="primary" size="sm" icon={<Plus size={14} />}>Create Task</Button>}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-fg-4" />
          <Button size="sm" variant="secondary">Status: All <ChevronDown size={14} /></Button>
          <Button size="sm" variant="secondary">Agent: Any <ChevronDown size={14} /></Button>
          <Button size="sm" variant="secondary">Priority: Any <ChevronDown size={14} /></Button>
        </div>
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-3">
              <tr className="text-left text-xs uppercase tracking-wide text-fg-4">
                {columns.map((c) => <th key={c} className="px-4 py-2.5 font-medium">{c}</th>)}
              </tr>
            </thead>
          </table>
          <div className="py-16 flex flex-col items-center text-center">
            <ListTodo size={28} className="text-fg-4 mb-3" />
            <p className="text-fg-2">The queue is empty</p>
            <p className="text-sm text-fg-4 mt-1">Create a task and assign it to an agent to get started.</p>
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
