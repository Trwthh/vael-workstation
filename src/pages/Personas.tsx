import PageShell from '@/components/ui/PageShell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { UserCircle, Pencil, Copy, Trash2, Plus } from 'lucide-react'

const permissions = ['Read files', 'Write files', 'Run commands', 'Network access', 'Git operations']

export default function Personas() {
  return (
    <PageShell
      title="Personas"
      subtitle="Reusable instruction sets that shape how an agent behaves"
      actions={<Button variant="primary" size="sm" icon={<Plus size={14} />}>Create New</Button>}
    >
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2">
          <Card className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-muted text-accent flex items-center justify-center">
                <UserCircle size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-fg-0">Software Engineer</p>
                <p className="text-xs text-fg-3 mt-0.5">Pragmatic full-stack engineer. Small diffs, tests first.</p>
              </div>
              <Badge variant="accent">Default</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" icon={<Pencil size={13} />}>Edit</Button>
              <Button size="sm" icon={<Copy size={13} />}>Duplicate</Button>
              <Button size="sm" variant="danger" icon={<Trash2 size={13} />}>Delete</Button>
            </div>
          </Card>
        </div>

        <Card className="col-span-3 flex flex-col gap-4">
          <h3 className="text-sm font-medium text-fg-1">Persona editor</h3>
          <label className="text-xs text-fg-3 flex flex-col gap-1">
            Name
            <input disabled placeholder="Software Engineer" className="h-control bg-bg-1 border border-white/[0.06] rounded-sm px-3 text-sm text-fg-0 placeholder:text-fg-4" />
          </label>
          <label className="text-xs text-fg-3 flex flex-col gap-1">
            Instructions
            <textarea disabled rows={5} placeholder="Describe the role, tone and rules this persona follows..." className="bg-bg-1 border border-white/[0.06] rounded-sm px-3 py-2 text-sm text-fg-0 placeholder:text-fg-4 resize-none" />
          </label>
          <label className="text-xs text-fg-3 flex flex-col gap-1">
            Model preference
            <select disabled className="h-control bg-bg-1 border border-white/[0.06] rounded-sm px-3 text-sm text-fg-3">
              <option>No preference</option>
            </select>
          </label>
          <div>
            <p className="text-xs text-fg-3 mb-2">Tool permissions</p>
            <div className="flex flex-wrap gap-2">
              {permissions.map((p) => <Badge key={p}>{p}</Badge>)}
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
