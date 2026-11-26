import { useAppStore } from '@/stores/app'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import WindowControls from './WindowControls'

const fullBleedPages = new Set(['main-agent', 'dashboard', 'support', 'reverse-engineering', 'search'])

export default function Layout({ children }: { children: React.ReactNode }) {
  const page = useAppStore((s) => s.page)
  const isFullBleed = fullBleedPages.has(page)

  return (
    <div className="flex h-screen w-screen bg-bg-0">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="ambient-bg"><div className="ambient-accent" /></div>
        {!isFullBleed && <Topbar />}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden relative z-[1] ${isFullBleed ? '' : 'p-6'}`}>
          {children}
        </main>
        {/* Floating window controls for full-bleed pages */}
        {isFullBleed && (
          <div className="absolute top-0 right-0 z-30 flex items-center h-[52px] drag-region px-0">
            <div className="no-drag">
              <WindowControls />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
