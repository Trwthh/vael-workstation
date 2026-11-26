import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useAppStore, type ChatSession } from '@/stores/app'
import { useProfileStore } from '@/stores/profile'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Settings, PanelLeftClose, PanelLeft,
  Trash2, ChevronDown, MessageSquare, Search,
  HelpCircle, Info, ExternalLink,
} from 'lucide-react'
import { VaelMark, VaelText } from '@/components/ui/VaelLogo'


function groupByDate(sessions: ChatSession[]) {
  const sorted = [...sessions].sort((a, b) => b.createdAt - a.createdAt)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const t = today.getTime()
  const buckets = [
    { label: 'Today', min: t, max: Infinity },
    { label: 'Yesterday', min: t - 86400000, max: t },
    { label: 'Previous 7 Days', min: t - 7 * 86400000, max: t - 86400000 },
    { label: 'Previous 30 Days', min: t - 30 * 86400000, max: t - 7 * 86400000 },
    { label: 'Older', min: -Infinity, max: t - 30 * 86400000 },
  ]
  const groups: { label: string; items: ChatSession[] }[] = []
  for (const b of buckets) {
    const items = sorted.filter((s) => s.createdAt >= b.min && s.createdAt < b.max)
    if (items.length) groups.push({ label: b.label, items })
  }
  return groups
}

function SessionItem({ session, active, onClick, onDelete }: {
  session: ChatSession; active: boolean; onClick: () => void; onDelete: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 rounded-xl h-[36px] px-[10px]
        transition-all duration-150 text-left min-w-0 group no-drag
        ${active ? 'bg-white/[0.08] text-fg-0' : 'text-fg-2 hover:text-fg-0 hover:bg-white/[0.05]'}
      `}
    >
      <span className="text-[13px] truncate flex-1 min-w-0">{session.title}</span>
      <span
        role="button"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="shrink-0 p-0.5 text-fg-4 hover:text-fg-1 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={12} />
      </span>
    </button>
  )
}


export default function Sidebar() {
  const {
    page, sidebarCollapsed, toggleSidebar, sidebarWidth, setSidebarWidth,
    setPage, openSettings, sessions, activeSessionId,
    setActiveSession, deleteSession, profile, updateProfile,
  } = useAppStore()
  const profileStore = useProfileStore()
  const [profileOpen, setProfileOpen] = useState(false)
  const footerRef = useRef<HTMLDivElement>(null)
  const groups = useMemo(() => groupByDate(sessions), [sessions])
  const collapsed = sidebarCollapsed
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    if (collapsed) return
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startW.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [collapsed, sidebarWidth])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - startX.current
      setSidebarWidth(startW.current + delta)
    }
    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [setSidebarWidth])

  useEffect(() => {
    if (!profileOpen) return
    const onDown = (e: MouseEvent) => {
      if (!footerRef.current?.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [profileOpen])

  const handleNewChat =() => setActiveSession(null)
  const displayName = profile.name || (profileStore.loaded ? profileStore.displayName : 'User')
  const avatarSrc = profile.avatar || (profileStore.loaded ? profileStore.avatar : null)
  const initial = (displayName || 'U').trim().charAt(0).toUpperCase()
  const width = collapsed ? 56 : sidebarWidth

  return (
    <motion.aside
      className="h-full bg-bg-1 border-r border-white/[0.06] flex flex-col overflow-hidden relative"
      animate={{ width }}
      transition={{ duration: dragging.current ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {!collapsed && (
        <div onMouseDown={onResizeStart}
          className="absolute right-0 top-0 bottom-0 w-[5px] cursor-col-resize z-10 group/resize">
          <div className="absolute right-0 top-0 bottom-0 w-px bg-transparent group-hover/resize:bg-white/[0.12] group-active/resize:bg-white/[0.2] transition-colors" />
        </div>
      )}
      {/* Brand + collapse */}
      <div className={`min-h-[52px] flex items-center drag-region shrink-0 ${collapsed ? 'justify-center' : 'justify-between px-[14px]'}`}>
        {collapsed ? (
          <button onClick={toggleSidebar} className="no-drag p-2 rounded-lg text-fg-2 hover:text-fg-0 hover:bg-white/[0.06] transition-all duration-150 active:scale-95" title="Expand sidebar">
            <PanelLeft size={18} />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5 no-drag text-fg-0">
              <div className="vael-glow"><VaelMark size={22} /></div>
              <VaelText size={15} />
            </div>
            <button onClick={toggleSidebar} className="no-drag p-1.5 rounded-md text-fg-4 hover:text-fg-1 hover:bg-white/[0.06] transition-colors" title="Collapse sidebar">
              <PanelLeftClose size={16} />
            </button>
          </>
        )}
      </div>

      {/* New chat */}
      <div className="px-2 pb-1 shrink-0">
        <button
          onClick={handleNewChat}
          className={`w-full flex items-center gap-3 h-[36px] rounded-xl bg-white/[0.06] text-fg-0 hover:bg-white/[0.10] transition-all duration-200 text-[13px] font-medium no-drag ${collapsed ? 'justify-center' : 'px-[10px]'}`}
          title={collapsed ? 'New chat' : undefined}
        >
          <Plus size={16} className="shrink-0" />
          {!collapsed && 'New chat'}
        </button>
      </div>

      {/* Search */}
      <div className="px-2 pt-1 shrink-0">
        <button
          onClick={() => setPage('search')}
          title={collapsed ? 'Search' : undefined}
          className={`
            w-full flex items-center gap-2.5 rounded-xl h-[36px] text-[13px] no-drag
            transition-all duration-150 min-w-0
            ${collapsed ? 'justify-center' : 'px-[10px]'}
            ${page === 'search' ? 'bg-white/[0.08] text-fg-0' : 'text-fg-2 hover:text-fg-0 hover:bg-white/[0.05]'}
          `}
        >
          <Search size={16} className="shrink-0" />
          {!collapsed && <span className="truncate">Search</span>}
        </button>
      </div>
      <div className="h-px bg-white/[0.06] mx-2 my-2 shrink-0" />

      {/* Sessions */}
      {!collapsed ? (
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-3 pb-2 scrollbar-none">
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <h3 className="text-[11px] font-medium text-fg-3 px-[10px] mb-1 uppercase tracking-wider">{group.label}</h3>
              <div className="space-y-0.5">
                {group.items.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    active={activeSessionId === session.id && page === 'main-agent'}
                    onClick={() => setActiveSession(session.id)}
                    onDelete={() => deleteSession(session.id)}
                  />
                ))}
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="px-[10px] py-8 text-center">
              <MessageSquare size={20} className="mx-auto text-fg-4/40 mb-2" />
              <p className="text-[12px] text-fg-3">No conversations yet</p>
            </div>
          )}
        </nav>
      ) : (
        <div className="flex-1" />
      )}

      {/* Profile footer */}
      <div ref={footerRef} className="relative shrink-0 border-t border-white/[0.06] px-2 py-2">
        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="absolute bottom-full left-2 right-2 mb-1.5 rounded-xl border border-white/[0.1] bg-bg-2 shadow-pop z-20 no-drag overflow-hidden"
            >
              <div className="px-3 pt-3 pb-2">
                <p className="text-[13px] font-medium text-fg-0 truncate">{displayName}</p>
                <p className="text-[11px] text-fg-3 mt-0.5">Max</p>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="py-1">
                {[
                  { icon: Settings, label: 'Settings', action: () => { openSettings(); setProfileOpen(false) } },
                  { icon: HelpCircle, label: 'Get help', action: () => { window.open('https://vael.app/help', '_blank'); setProfileOpen(false) } },
                  { icon: Info, label: 'About VAEL', action: () => { openSettings('about'); setProfileOpen(false) } },
                ].map(({ icon: Icon, label, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="w-full flex items-center gap-2.5 px-3 h-[34px] text-[13px] text-fg-1 hover:bg-white/[0.06] hover:text-fg-0 transition-colors group/item"
                  >
                    <Icon size={15} className="shrink-0 text-fg-2 group-hover/item:scale-110 transition-transform duration-150" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="py-1">
                <button
                  onClick={() => { window.open('https://vael.app/changelog', '_blank'); setProfileOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 h-[34px] text-[13px] text-fg-1 hover:bg-white/[0.06] hover:text-fg-0 transition-colors group/item"
                >
                  <ExternalLink size={15} className="shrink-0 text-fg-2 group-hover/item:scale-110 transition-transform duration-150" />
                  View changelog
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className={`w-full flex items-center gap-2.5 rounded-lg h-[40px] hover:bg-white/[0.06] transition-colors no-drag ${collapsed ? 'justify-center px-0' : 'px-2.5'}`}
          title={collapsed ? displayName : undefined}
        >
          <span className="w-7 h-7 shrink-0 rounded-full bg-white/[0.12] text-fg-0 text-[12px] font-semibold flex items-center justify-center overflow-hidden">
            {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : initial}
          </span>
          {!collapsed && (
            <>
              <span className="flex items-center gap-1.5 min-w-0 flex-1 text-[13px]">
                <span className="text-fg-0 font-medium truncate">{displayName}</span>
                <span className="text-fg-2">·</span>
                <span className="text-fg-2">Max</span>
              </span>
              <ChevronDown size={13} className={`shrink-0 text-fg-3 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>
      </div>
    </motion.aside>
  )
}
