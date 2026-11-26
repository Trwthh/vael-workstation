import { useState, useEffect } from 'react'
import PageShell from '@/components/ui/PageShell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Settings, Gauge, FolderLock, ShieldCheck, Info, BarChart3, Brain, Database } from 'lucide-react'

const selectCls = 'h-control bg-bg-1 border border-white/[0.06] rounded-sm px-3 text-sm text-fg-1'
const heading = 'text-sm font-medium text-fg-1 flex items-center gap-2 mb-3'

interface AgentStats {
  totalSearches: number
  avgQuality: number
  topModel: string | null
  escalationRate: number
}

export default function SettingsPage() {
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [testStats, setTestStats] = useState<{ total: number; avgQuality: number; refusalRate: number; incompleteRate: number } | null>(null)

  useEffect(() => {
    window.electronAPI?.searchAgent.stats().then(setStats)
    window.electronAPI?.brain.getTestStats().then((s: unknown) => setTestStats(s as typeof testStats))
  }, [])

  return (
    <PageShell title="Settings" subtitle="Preferences, permissions, intelligence and performance">
      <div className="grid grid-cols-2 gap-4 content-start">
        <Card>
          <h3 className={heading}><Settings size={14} /> General</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-fg-3 flex flex-col gap-1">Theme
              <select className={selectCls}><option>Dark</option><option>System</option></select>
            </label>
            <label className="text-xs text-fg-3 flex flex-col gap-1">Language
              <select className={selectCls}><option>English</option></select>
            </label>
          </div>
        </Card>

        <Card>
          <h3 className={heading}><Gauge size={14} /> Autonomy levels</h3>
          <input type="range" min={0} max={3} defaultValue={1} className="w-full accent-[var(--accent,#fff)]" />
          <div className="flex justify-between text-xs text-fg-4 mt-1">
            <span>Ask always</span><span>Ask for writes</span><span>Ask for risky</span><span>Autonomous</span>
          </div>
        </Card>

        <Card>
          <h3 className={heading}><FolderLock size={14} /> File permissions</h3>
          <p className="text-xs text-fg-3 mb-2">Agents may only touch these paths.</p>
          <div className="font-mono text-xs text-fg-4 border border-dashed border-white/[0.06] rounded-sm p-3 mb-3">No paths allowed yet</div>
          <Button size="sm">Add path</Button>
        </Card>

        <Card>
          <h3 className={heading}><ShieldCheck size={14} /> Security</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-fg-2">Credential storage</span>
            <Badge variant="warn">Not initialized</Badge>
          </div>
          <p className="text-xs text-fg-4 mt-2">Your Claude Max session is kept in the OS credential vault, never in plain files.</p>
        </Card>

        {/* Agent intelligence stats */}
        <Card>
          <h3 className={heading}><Brain size={14} /> Search Intelligence</h3>
          {stats ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-fg-4">Total searches (7d)</p>
                <p className="text-lg font-semibold text-fg-0">{stats.totalSearches}</p>
              </div>
              <div>
                <p className="text-xs text-fg-4">Avg quality</p>
                <p className="text-lg font-semibold text-fg-0">{stats.avgQuality.toFixed(1)}/5</p>
              </div>
              <div>
                <p className="text-xs text-fg-4">Top model</p>
                <p className="text-sm text-fg-1">{stats.topModel?.replace('claude-', '') || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-fg-4">Escalation rate</p>
                <p className="text-sm text-fg-1">{(stats.escalationRate * 100).toFixed(0)}%</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-fg-4">No search data yet.</p>
          )}
        </Card>

        {/* Test & Improvement stats */}
        <Card>
          <h3 className={heading}><BarChart3 size={14} /> Test Performance</h3>
          {testStats && testStats.total > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-fg-4">Tests run (7d)</p>
                <p className="text-lg font-semibold text-fg-0">{testStats.total}</p>
              </div>
              <div>
                <p className="text-xs text-fg-4">Avg quality</p>
                <p className="text-lg font-semibold text-fg-0">{testStats.avgQuality.toFixed(1)}/5</p>
              </div>
              <div>
                <p className="text-xs text-fg-4">Refusal rate</p>
                <p className={`text-sm font-medium ${testStats.refusalRate > 0.1 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {(testStats.refusalRate * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-fg-4">Incomplete rate</p>
                <p className={`text-sm font-medium ${testStats.incompleteRate > 0.2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {(testStats.incompleteRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-fg-4">No test data yet. Run searches to populate.</p>
          )}
        </Card>

        <Card className="col-span-2">
          <h3 className={heading}><Info size={14} /> About</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-fg-2">VAEL Workstation <span className="text-fg-4">v0.2.0</span></span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost">Documentation</Button>
              <Button size="sm" variant="ghost">Changelog</Button>
              <Button size="sm" variant="ghost">Report an issue</Button>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  )
}
