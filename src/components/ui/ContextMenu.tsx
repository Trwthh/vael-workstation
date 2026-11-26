import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface MenuItem {
  label?: string
  icon?: React.ReactNode
  shortcut?: string
  onClick?: () => void
  separator?: boolean
  disabled?: boolean
  danger?: boolean
}

interface ContextMenuProps {
  items: MenuItem[]
  children: React.ReactNode
}

interface MenuState {
  x: number
  y: number
  visible: boolean
}

export default function ContextMenu({ items, children }: ContextMenuProps) {
  const [menu, setMenu] = useState<MenuState>({ x: 0, y: 0, visible: false })
  const menuRef = useRef<HTMLDivElement>(null)

  const open = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const x = Math.min(e.clientX, window.innerWidth - 200)
    const y = Math.min(e.clientY, window.innerHeight - items.length * 36 - 16)
    setMenu({ x, y, visible: true })
  }, [items.length])

  const close = useCallback(() => setMenu((s) => ({ ...s, visible: false })), [])

  useEffect(() => {
    if (!menu.visible) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close()
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', esc)
    }
  }, [menu.visible, close])

  return (
    <>
      <div onContextMenu={open}>{children}</div>
      {menu.visible && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[200] min-w-[180px] py-1 bg-bg-3 border border-white/[0.1] rounded-lg shadow-pop ctx-menu-enter"
          style={{ left: menu.x, top: menu.y }}
        >
          {items.map((item, i) =>
            item.separator ? (
              <div key={i} className="my-1 border-t border-white/[0.06]" />
            ) : (
              <button
                key={i}
                onClick={() => { item.onClick?.(); close() }}
                disabled={item.disabled}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] transition-colors ${
                  item.disabled
                    ? 'text-fg-4/40 cursor-not-allowed'
                    : item.danger
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-fg-2 hover:bg-white/[0.06] hover:text-fg-0'
                }`}
              >
                {item.icon && <span className="w-4 shrink-0 flex justify-center">{item.icon}</span>}
                <span className="flex-1 text-left">{item.label}</span>
                {item.shortcut && (
                  <span className="text-[10px] text-fg-4/50 ml-4">{item.shortcut}</span>
                )}
              </button>
            )
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
