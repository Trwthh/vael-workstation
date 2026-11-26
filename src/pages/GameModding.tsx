import PageShell from '@/components/ui/PageShell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Gamepad2, Cpu, LayoutPanelTop, Package, Syringe, Plus } from 'lucide-react'

const templates = [
  { name: 'C++ Trainer', desc: 'Memory read/write trainer with hotkeys', icon: Cpu },
  { name: 'ImGui Menu', desc: 'In-game overlay menu on DirectX hooks', icon: LayoutPanelTop },
  { name: 'Mod Loader', desc: 'Load and hot-reload mod plugins', icon: Package },
  { name: 'DLL Injector', desc: 'Inject a module into a target process', icon: Syringe },
]
const tech = ['C++', 'C#', 'Lua', 'DirectX 11', 'DirectX 12', 'Vulkan', 'ImGui', 'MinHook', 'Unity (Mono/IL2CPP)', 'Unreal Engine', 'Python']

export default function GameModding() {
  return (
    <PageShell
      title="Game Modding"
      subtitle="Build trainers, overlays and mod loaders for single-player games"
      actions={<Button variant="primary" size="sm" icon={<Plus size={14} />}>New Mod Project</Button>}
    >
      <div className="flex flex-col gap-6">
        <section>
          <h3 className="text-sm font-medium text-fg-1 mb-2">Active Projects</h3>
          <Card className="py-8 flex flex-col items-center text-center border-dashed">
            <Gamepad2 size={24} className="text-fg-4 mb-2" />
            <p className="text-sm text-fg-3">No active mod projects. Start from a template below.</p>
          </Card>
        </section>
        <section>
          <h3 className="text-sm font-medium text-fg-1 mb-2">Templates</h3>
          <div className="grid grid-cols-4 gap-4">
            {templates.map(({ name, desc, icon: Icon }) => (
              <Card key={name} onClick={() => {}} className="flex flex-col gap-2">
                <Icon size={20} className="text-accent" />
                <p className="text-sm font-medium text-fg-0">{name}</p>
                <p className="text-xs text-fg-3">{desc}</p>
              </Card>
            ))}
          </div>
        </section>
        <section>
          <h3 className="text-sm font-medium text-fg-1 mb-2">Supported Technologies</h3>
          <div className="flex flex-wrap gap-2">
            {tech.map((t) => <Badge key={t} variant="accent">{t}</Badge>)}
          </div>
        </section>
      </div>
    </PageShell>
  )
}
