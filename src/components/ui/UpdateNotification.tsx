import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, RefreshCw, Check, ArrowUpCircle } from 'lucide-react'

type UpdateState = 'idle' | 'available' | 'downloading' | 'ready' | 'error'

export default function UpdateNotification() {
  const [state, setState] = useState<UpdateState>('idle')
  const [version, setVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const api = window.electronAPI?.updater
    if (!api) return

    const unsubs = [
      api.onAvailable((info) => {
        setVersion(info.version)
        setState('available')
        setDismissed(false)
      }),
      api.onNotAvailable(() => setState('idle')),
      api.onProgress((p) => {
        setState('downloading')
        setProgress(p.percent)
      }),
      api.onDownloaded(() => setState('ready')),
      api.onError(() => setState('error')),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const handleDownload = () => {
    window.electronAPI?.updater.download()
    setState('downloading')
  }

  const handleInstall = () => {
    window.electronAPI?.updater.install()
  }

  const visible = !dismissed && state !== 'idle'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 h-11 rounded-xl border border-white/[0.1] bg-bg-2/95 backdrop-blur-md shadow-xl"
        >
          {state === 'available' && (
            <>
              <ArrowUpCircle size={16} className="text-status-ok shrink-0" />
              <span className="text-[13px] text-fg-1">
                Update <span className="font-medium text-fg-0">v{version}</span> available
              </span>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-fg-0 text-bg-0 text-[12px] font-medium hover:bg-white transition-colors"
              >
                <Download size={12} />
                Download
              </button>
            </>
          )}

          {state === 'downloading' && (
            <>
              <RefreshCw size={14} className="text-fg-3 animate-spin shrink-0" />
              <span className="text-[13px] text-fg-2">Downloading update...</span>
              <div className="w-24 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                <motion.div
                  className="h-full bg-fg-1 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-[11px] text-fg-4 tabular-nums">{progress}%</span>
            </>
          )}

          {state === 'ready' && (
            <>
              <Check size={16} className="text-status-ok shrink-0" />
              <span className="text-[13px] text-fg-1">Update ready</span>
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-status-ok text-bg-0 text-[12px] font-medium hover:brightness-110 transition-all"
              >
                <RefreshCw size={12} />
                Restart & Install
              </button>
            </>
          )}

          {state === 'error' && (
            <>
              <span className="text-[13px] text-fg-3">Update check failed</span>
              <button
                onClick={() => { window.electronAPI?.updater.check(); setState('idle') }}
                className="text-[12px] text-fg-4 hover:text-fg-2 transition-colors"
              >
                Retry
              </button>
            </>
          )}

          {state !== 'downloading' && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded text-fg-4 hover:text-fg-1 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
