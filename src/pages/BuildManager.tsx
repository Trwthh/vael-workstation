import PageShell from '@/components/ui/PageShell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Hammer, Play, Rocket, History } from 'lucide-react'

const selectCls = 'h-control bg-bg-1 border border-white/[0.06] rounded-sm px-3 text-sm text-fg-1'

export default function BuildManager() {
  return (
    <PageShell
      title="Build Manager"
      subtitle="Configure builds, review history and prepare releases"
      actions={<Button variant="primary" size="sm" icon={<Play size={14} />}>Start Build</Button>}
    >
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-fg-1 flex items-center gap-2"><Hammer size={14} /> Build configuration</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-fg-3 flex flex-col gap-1">
                Target platform
                <select className={selectCls}><option>Windows x64</option><option>Linux x64</option><option>macOS arm64</option></select>
              </label>
              <label className="text-xs text-fg-3 flex flex-col gap-1">
                Build type
                <select className={selectCls}><option>Debug</option><option>Release</option><option>Release + installer</option></select>
              </label>
            </div>
          </Card>
          <Card>
            <h3 className="text-sm font-medium text-fg-1 mb-3 flex items-center gap-2"><History size={14} /> Build history</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-fg-4">
                  {['Build', 'Target', 'Type', 'Duration', 'Result'].map((c) => <th key={c} className="py-2 font-medium">{c}</th>)}
                </tr>
              </thead>
            </table>
            <p className="py-8 text-center text-sm text-fg-4 border-t border-white/[0.06]">No builds yet.</p>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <p className="text-xs text-fg-4">Current build</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-fg-0 font-medium">Idle</p>
              <Badge>No build running</Badge>
            </div>
          </Card>
          <Card className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-fg-1 flex items-center gap-2"><Rocket size={14} /> Release management</h3>
            <p className="text-xs text-fg-3">Version tags, changelogs and installer artifacts appear here after a successful release build.</p>
            <Button size="sm" disabled>Create Release</Button>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
