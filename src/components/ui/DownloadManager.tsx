import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Download, File as FileIcon, FolderOpen, X } from 'lucide-react'

interface DownloadItem {
  filename: string
  savePath: string
  received: number
  total: number
  speed: number
  state: 'active' | 'done' | 'failed'
}

const SPRING = { type: 'spring', stiffness: 380, damping: 32 } as const

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

function parentDir(path: string): string {
  return path.replace(/[\\/][^\\/]*$/, '')
}

export default function DownloadManager() {
  const [items, setItems] = useState<DownloadItem[]>([])
  const [expanded, setExpanded] = useState(true)
  const lastSample = useRef(new Map<string, { time: number; bytes: number }>())

  useEffect(() => {
    const api = window.electronAPI?.browser
    if (!api) return

    const patch = (filename: string, changes: Partial<DownloadItem>) =>
      setItems((prev) => prev.map((d) => (d.filename === filename ? { ...d, ...changes } : d)))

    const unsubs = [
      api.onDownloadStart((d) => {
        lastSample.current.set(d.filename, { time: Date.now(), bytes: 0 })
        setItems((prev) => [
          { filename: d.filename, savePath: d.savePath, received: 0, total: d.totalBytes, speed: 0, state: 'active' },
          ...prev.filter((x) => x.filename !== d.filename),
        ])
        setExpanded(true)
      }),
      api.onDownloadProgress((d) => {
        const now = Date.now()
        const prev = lastSample.current.get(d.filename)
        if (prev && now - prev.time < 500) return patch(d.filename, { received: d.received, total: d.total })
        const speed = prev ? ((d.received - prev.bytes) / (now - prev.time)) * 1000 : 0
        lastSample.current.set(d.filename, { time: now, bytes: d.received })
        patch(d.filename, { received: d.received, total: d.total, speed })
      }),
      api.onDownloadDone((d) => {
        lastSample.current.delete(d.filename)
        patch(d.filename, { savePath: d.savePath, speed: 0, state: d.state === 'completed' ? 'done' : 'failed' })
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const active = items.filter((d) => d.state === 'active').length

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={SPRING}
          className="fixed bottom-4 right-4 z-50 w-[320px] rounded-xl border border-white/[0.1] bg-bg-2 shadow-xl overflow-hidden"
        >
          <div className="flex items-center gap-2 h-10 px-3 border-b border-white/[0.06]">
            <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
              <Download size={13} className="text-fg-3 shrink-0" />
              <span className="text-[12px] text-fg-1 truncate">{active ? `Downloading ${active} file${active > 1 ? 's' : ''}` : 'Downloads'}</span>
              <ChevronDown size={12} className={`text-fg-4 ml-auto transition-transform ${expanded ? '' : 'rotate-180'}`} />
            </button>
            <button onClick={() => setItems([])} title="Dismiss" className="p-1 rounded text-fg-4 hover:text-fg-1 hover:bg-white/[0.06] transition-colors">
              <X size={12} />
            </button>
          </div>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={SPRING}
                className="max-h-[260px] overflow-y-auto scrollbar-none">
                {items.map((d) => {
                  const pct = d.total > 0 ? Math.min(100, Math.round((d.received / d.total) * 100)) : 0
                  return (
                    <li key={d.filename} className="px-3 py-2.5 border-b border-white/[0.04] last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-fg-1 truncate flex-1" title={d.filename}>{d.filename}</span>
                        {d.state === 'done' && (
                          <>
                            <button onClick={() => window.electronAPI?.agent.openDir(d.savePath)} title="Open file"
                              className="p-1 rounded text-fg-3 hover:text-fg-0 hover:bg-white/[0.06] transition-colors"><FileIcon size={12} /></button>
                            <button onClick={() => window.electronAPI?.agent.showItemInFolder(d.savePath)} title="Show in folder"
                              className="p-1 rounded text-fg-3 hover:text-fg-0 hover:bg-white/[0.06] transition-colors"><FolderOpen size={12} /></button>
                          </>
                        )}
                      </div>
                      {d.state === 'active' ? (
                        <>
                          <div className="mt-2 h-1 rounded-full bg-white/[0.08] overflow-hidden">
                            <motion.div className="h-full bg-gradient-to-r from-fg-2 to-fg-1" animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
                          </div>
                          <div className="mt-1.5 flex justify-between text-[10px] text-fg-4">
                            <span>{formatBytes(d.received)}{d.total > 0 && ` / ${formatBytes(d.total)}`}{d.speed > 0 && ` · ${formatBytes(d.speed)}/s`}</span>
                            {d.total > 0 && <span>{pct}%</span>}
                          </div>
                        </>
                      ) : (
                        <p className={`mt-1 text-[10px] ${d.state === 'done' ? 'text-status-ok/70' : 'text-status-danger/80'}`}>
                          {d.state === 'done' ? `Completed · ${formatBytes(d.total || d.received)}` : 'Download failed'}
                        </p>
                      )}
                    </li>
                  )
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
