import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import {
  X, Maximize2, Minimize2, FileCode, CheckCircle2,
  Play, MessageSquare, AlertCircle, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react'

export interface PreviewFile {
  name: string
  status: 'ok' | 'error' | 'building'
}

interface PreviewPanelProps {
  visible: boolean
  files: PreviewFile[]
  buildStatus: 'passed' | 'failed' | 'building'
  onTest: () => void
  onRequestChanges: () => void
  onClose: () => void
}

export default function PreviewPanel({
  visible, files, buildStatus, onTest, onRequestChanges, onClose,
}: PreviewPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [docked, setDocked] = useState(true)
  const settled = useRef(false)
  const [manualHide, setManualHide] = useState(true)
  const [pinned, setPinned] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number>()
  const panelWidth = expanded ? 480 : 320

  // Measure where the panel WOULD sit when open (from its parent), never its live
  // rect: while it slides away the live rect stops overlapping and it would flip back.
  const measure = useCallback(() => {
    const panel = panelRef.current
    const parent = panel?.offsetParent as HTMLElement | null
    if (!panel || !parent || manualHide || pinned) return
    const p = parent.getBoundingClientRect()
    const margin = 12
    const right = p.right - 20
    const bottom = p.bottom - 112
    const zone = {
      left: right - panelWidth - margin,
      right: right + margin,
      top: bottom - panel.offsetHeight - margin,
      bottom: bottom + margin,
    }
    let overlaps = false
    parent.querySelectorAll('[data-chat-scroll] .select-text, [data-chat-scroll] .suggestion-chip').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.right > zone.left && r.left < zone.right && r.bottom > zone.top && r.top < zone.bottom) overlaps = true
    })
    setDocked(overlaps)
  }, [manualHide, pinned, panelWidth])

  const schedule = useCallback(() => {
    if (!settled.current) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(measure, 150)
  }, [measure])

  // Start hidden and decide once, after the chat has scrolled to the bottom and the
  // message animations are done, so switching chats never flashes the panel in and out.
  useEffect(() => {
    if (!visible) return
    settled.current = false
    const t = window.setTimeout(() => { settled.current = true; measure() }, 800)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  useLayoutEffect(() => {
    if (visible && settled.current) measure()
  }, [visible, measure])

  useEffect(() => {
    if (!visible) return
    const parent = panelRef.current?.offsetParent
    const scroller = parent?.querySelector('[data-chat-scroll]')
    const mo = new MutationObserver(schedule)
    if (scroller) {
      mo.observe(scroller, { childList: true, subtree: true })
      scroller.addEventListener('scroll', schedule, { passive: true })
    }
    const ro = new ResizeObserver(schedule)
    if (parent) ro.observe(parent)
    return () => {
      window.clearTimeout(timer.current)
      mo.disconnect()
      ro.disconnect()
      scroller?.removeEventListener('scroll', schedule)
    }
  }, [visible, schedule])

  if (!visible) return null

  const isHidden = docked || manualHide

  const statusColor = buildStatus === 'passed'
    ? 'bg-green-400'
    : buildStatus === 'failed'
      ? 'bg-red-400'
      : 'bg-yellow-400 animate-pulse'

  const statusText = buildStatus === 'passed'
    ? 'Build passed'
    : buildStatus === 'failed'
      ? 'Build failed'
      : 'Building...'

  return (
    <>
      {/* Pull tab — visible when panel is hidden */}
      {isHidden && (
        <button
          onClick={() => { setManualHide(false); setPinned(true); setDocked(false) }}
          className="absolute bottom-32 right-2 z-40 w-6 h-8 flex items-center justify-center text-fg-3 hover:text-fg-0 transition-colors focus:outline-none"
          title="Show preview"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        style={{ width: panelWidth }}
        className={`absolute bottom-28 z-40 bg-bg-2/95 backdrop-blur-xl border border-white/[0.1] rounded-xl shadow-pop overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isHidden
            ? 'translate-x-[calc(100%+20px)] right-0 opacity-0 pointer-events-none invisible'
            : 'translate-x-0 right-5 opacity-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
            <span className="text-[11px] font-semibold text-fg-1">Live Preview</span>
            <span className="text-[10px] text-fg-4">{statusText}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => { setManualHide(true); setPinned(false) }}
              className="p-1.5 text-fg-4 hover:text-fg-2 transition-colors rounded"
              title="Slide away"
            >
              <ChevronRight size={13} />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-fg-4 hover:text-fg-2 transition-colors rounded"
            >
              {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-fg-4 hover:text-fg-2 transition-colors rounded"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* File tree */}
        <div className="p-2.5 space-y-0.5">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <FileCode size={14} className="text-fg-4 shrink-0" />
              <span className="text-[12px] text-fg-2 font-mono flex-1 truncate">{f.name}</span>
              {f.status === 'ok' && <CheckCircle2 size={13} className="text-green-400/70 shrink-0" />}
              {f.status === 'error' && <AlertCircle size={13} className="text-red-400/70 shrink-0" />}
              {f.status === 'building' && <Loader2 size={13} className="text-yellow-400/70 shrink-0 animate-spin" />}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-3 pb-3 pt-1">
          <button
            onClick={onTest}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-fg-0 text-bg-0 rounded-lg text-[12px] font-semibold hover:bg-white transition-colors"
          >
            <Play size={12} />
            Test It
          </button>
          <button
            onClick={onRequestChanges}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/[0.08] text-fg-1 rounded-lg text-[12px] font-semibold hover:bg-white/[0.12] transition-colors"
          >
            <MessageSquare size={12} />
            Request Changes
          </button>
        </div>
      </div>
    </>
  )
}
