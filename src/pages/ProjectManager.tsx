import PageShell from '@/components/ui/PageShell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { FolderKanban, FolderOpen } from 'lucide-react'

export default function ProjectManager() {
  return (
    <PageShell
      title="Project Manager"
      subtitle="Open, track and switch between your projects"
      actions={<Button variant="primary" size="sm" icon={<FolderOpen size={14} />}>Open Project</Button>}
    >
      <div className="flex flex-col gap-4">
        <Card className="py-14 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-xl bg-bg-3 text-fg-3 flex items-center justify-center mb-4">
            <FolderKanban size={28} />
          </div>
          <p className="text-fg-1 font-medium">No projects loaded</p>
          <p className="text-sm text-fg-3 mt-1">Open a folder to index it and give agents context.</p>
          <Button className="mt-4" icon={<FolderOpen size={14} />}>Open Project</Button>
        </Card>

      </div>
    </PageShell>
  )
}
