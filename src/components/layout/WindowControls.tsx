import { useState, useEffect } from 'react'
import { Minus, Square, X } from 'lucide-react'

export default function WindowControls() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI?.onMaximizeChange(setMaximized)
    window.electronAPI?.window.isMaximized().then(setMaximized)
  }, [])

  return (
    <div className="flex items-center gap-0.5 no-drag h-full px-2">
      <button
        className="win-ctrl-btn"
        onClick={() => window.electronAPI?.window.minimize()}
        aria-label="Minimize"
      >
        <Minus size={13} strokeWidth={1.4} />
      </button>
      <button
        className="win-ctrl-btn"
        onClick={() => window.electronAPI?.window.maximize()}
        aria-label={maximized ? 'Restore' : 'Maximize'}
      >
        {maximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.1">
            <rect x="2" y="0.5" width="7.5" height="7.5" rx="0.8" />
            <rect x="0.5" y="2" width="7.5" height="7.5" rx="0.8" />
          </svg>
        ) : (
          <Square size={10} strokeWidth={1.2} />
        )}
      </button>
      <button
        className="win-ctrl-btn win-ctrl-close"
        onClick={() => window.electronAPI?.window.close()}
        aria-label="Close"
      >
        <X size={13} strokeWidth={1.4} />
      </button>
    </div>
  )
}
