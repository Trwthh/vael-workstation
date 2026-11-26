import { useRef, useEffect, useState, useCallback } from 'react'
import { ArrowLeft, ArrowRight, RotateCw, X, Shield, Lock, Unlock, Download, AlertTriangle, Zap, Link2, Eye, Home, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PAGE_ANALYZER_SCRIPT, ANTI_ADBLOCK_CSS, SHORTENER_BYPASS_SCRIPT,
  processAnalysis, type PageAnalysis, type BrowserNotification,
} from '@/lib/browse-engine'

interface Props {
  initialUrl: string
  onClose: () => void
  onHome?: () => void
  onNavigate?: (url: string) => void
  onTitleChange?: (title: string) => void
  onDownloadCount?: (count: number) => void
}

interface DownloadInfo {
  filename: string
  received: number
  total: number
  savePath: string
  state: 'downloading' | 'completed' | 'cancelled' | 'interrupted'
}

const TOAST_ICONS: Record<string, typeof AlertTriangle> = {
  captcha: AlertTriangle,
  bypass: Zap,
  download: Download,
  info: Eye,
  warning: AlertTriangle,
  success: Shield,
}

const TOAST_STYLES: Record<string, string> = {
  captcha: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
  bypass: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
  download: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  info: 'bg-white/[0.06] border-white/[0.08] text-fg-2',
  warning: 'bg-red-500/10 border-red-500/20 text-red-300',
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
}

export default function BrowserPanel({ initialUrl, onClose, onHome, onNavigate, onTitleChange, onDownloadCount }: Props) {
  const webviewRef = useRef<WebviewElement | null>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const [displayUrl, setDisplayUrl] = useState(initialUrl)
  const [loading, setLoading] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [isSecure, setIsSecure] = useState(false)
  const [title, setTitle] = useState('')
  const [downloads, setDownloads] = useState<Map<string, DownloadInfo>>(new Map())
  const [notifications, setNotifications] = useState<BrowserNotification[]>([])
  const [foundLinks, setFoundLinks] = useState<{ href: string; text: string }[]>([])
  const [showLinks, setShowLinks] = useState(false)
  const [showDownloads, setShowDownloads] = useState(false)
  const analysisRef = useRef<number>(0)

  const addNotification = useCallback((n: BrowserNotification) => {
    setNotifications(prev => {
      const filtered = n.type === 'captcha'
        ? prev.filter(p => !p.id.startsWith('captcha-'))
        : prev.filter(p => p.id !== n.id)
      return [...filtered, n]
    })
    if (!n.persistent) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(p => p.id !== n.id))
      }, 3500)
    }
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(p => p.id !== id))
  }, [])

  const navigate = useCallback((target: string) => {
    let finalUrl = target.trim()
    if (!finalUrl) return

    if (/^https?:\/\//i.test(finalUrl) || finalUrl.startsWith('magnet:')) {
      // absolute URL
    } else if (finalUrl.startsWith('/') || finalUrl.startsWith('./') || finalUrl.startsWith('../')) {
      try {
        const base = webviewRef.current?.getURL() || displayUrl
        finalUrl = new URL(finalUrl, base).href
      } catch {
        finalUrl = 'https://' + finalUrl
      }
    } else if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
      finalUrl = 'https://' + finalUrl
    } else {
      finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`
    }

    setDisplayUrl(finalUrl)
    setNotifications([])
    setFoundLinks([])
    setShowLinks(false)
    webviewRef.current?.loadURL(finalUrl)
    onNavigate?.(finalUrl)
  }, [onNavigate, displayUrl])

  const learnFromPage = useCallback((url: string, analysis: PageAnalysis, success: boolean) => {
    const brain = window.electronAPI?.brain
    if (!brain) return
    try {
      const hostname = new URL(url).hostname
      brain.updateSite(hostname, {
        has_captcha: analysis.captchas.length > 0,
        has_adwall: analysis.adWalls.length > 0,
        is_shortener: analysis.shortenerPage,
        download_selector: analysis.downloadLinks.length > 0 ? 'auto-detected' : undefined,
        success,
      }).catch(() => {})
    } catch {}
  }, [])

  const analyzePage = useCallback(async () => {
    const wv = webviewRef.current
    if (!wv) return
    const id = ++analysisRef.current

    try {
      const raw = await wv.executeJavaScript(PAGE_ANALYZER_SCRIPT)
      if (analysisRef.current !== id) return

      const analysis: PageAnalysis = JSON.parse(raw as string)
      const currentUrl = wv.getURL()
      const notifs = processAnalysis(currentUrl, analysis)
      notifs.forEach(addNotification)

      if (analysis.downloadLinks.length > 0) {
        setFoundLinks(analysis.downloadLinks)
        learnFromPage(currentUrl, analysis, true)
      } else {
        learnFromPage(currentUrl, analysis, false)
      }

      if (analysis.adWalls.length > 0) {
        await wv.insertCSS(ANTI_ADBLOCK_CSS)
        await wv.executeJavaScript(`
          document.querySelectorAll('[class*="adblock-overlay"],[class*="anti-adblock"],[class*="adblock-modal"],[class*="adblocker-detected"]')
            .forEach(function(el){ el.remove(); });
          document.body.style.overflow = 'auto';
          document.documentElement.style.overflow = 'auto';
        `)
        addNotification({ id: 'bypass-done-' + Date.now(), type: 'success', message: 'Ad-blocker wall removed' })
      }

      if (analysis.shortenerPage) {
        const linksRaw = await wv.executeJavaScript(SHORTENER_BYPASS_SCRIPT)
        if (analysisRef.current !== id) return
        const links = JSON.parse(linksRaw as string)
        if (links.length > 0) {
          const direct = links.find((l: any) => l.priority === 'redirect') || links.find((l: any) => l.priority === 'high')
          if (direct && direct.href !== '#button' && direct.href.startsWith('http')) {
            addNotification({ id: 'bypass-link-' + Date.now(), type: 'success', message: `Direct link found` })
          }
        }
      }

      if (analysis.captchas.length > 0) {
        const checkSolved = setInterval(async () => {
          try {
            const recheck = await wv.executeJavaScript(PAGE_ANALYZER_SCRIPT)
            const recheckAnalysis: PageAnalysis = JSON.parse(recheck as string)
            if (recheckAnalysis.captchas.length === 0) {
              clearInterval(checkSolved)
              setNotifications(prev => prev.filter(p => !p.id.startsWith('captcha-')))
              addNotification({ id: 'captcha-solved-' + Date.now(), type: 'success', message: 'CAPTCHA solved' })
            }
          } catch { clearInterval(checkSolved) }
        }, 2000)
        setTimeout(() => clearInterval(checkSolved), 120000)
      }
    } catch {}
  }, [addNotification, dismissNotification, learnFromPage])

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv) return

    const updateNav = () => {
      if (!wv) return
      try {
        setCanGoBack(wv.canGoBack())
        setCanGoForward(wv.canGoForward())
        const currentUrl = wv.getURL()
        setDisplayUrl(currentUrl)
        setIsSecure(currentUrl.startsWith('https://'))
        const pageTitle = wv.getTitle()
        setTitle(pageTitle)
        onTitleChange?.(pageTitle || new URL(currentUrl).hostname)
        onNavigate?.(currentUrl)
      } catch {}
    }

    const onStartLoad = () => { setLoading(true); setNotifications(prev => prev.filter(p => p.persistent)) }
    const onStopLoad = () => {
      setLoading(false)
      updateNav()
      setTimeout(analyzePage, 300)
    }
    const onNav = () => updateNav()
    const onTitleUpdate = (e: any) => {
      if (e?.title) {
        setTitle(e.title)
        onTitleChange?.(e.title)
      }
    }

    wv.addEventListener('did-start-loading', onStartLoad)
    wv.addEventListener('did-stop-loading', onStopLoad)
    wv.addEventListener('did-navigate', onNav)
    wv.addEventListener('did-navigate-in-page', onNav)
    wv.addEventListener('page-title-updated', onTitleUpdate)

    return () => {
      wv.removeEventListener('did-start-loading', onStartLoad)
      wv.removeEventListener('did-stop-loading', onStopLoad)
      wv.removeEventListener('did-navigate', onNav)
      wv.removeEventListener('did-navigate-in-page', onNav)
      wv.removeEventListener('page-title-updated', onTitleUpdate)
    }
  }, [onNavigate, onTitleChange, analyzePage])

  useEffect(() => {
    const api = window.electronAPI?.browser
    if (!api) return
    const unsub1 = api.onDownloadStart((data) => {
      setDownloads(prev => {
        const next = new Map(prev)
        next.set(data.filename, { filename: data.filename, received: 0, total: data.totalBytes, savePath: data.savePath, state: 'downloading' })
        return next
      })
      setShowDownloads(true)
    })
    const unsub2 = api.onDownloadProgress((data) => {
      setDownloads(prev => {
        const next = new Map(prev)
        const existing = next.get(data.filename)
        if (existing) next.set(data.filename, { ...existing, received: data.received, total: data.total })
        return next
      })
    })
    const unsub3 = api.onDownloadDone((data) => {
      setDownloads(prev => {
        const next = new Map(prev)
        const existing = next.get(data.filename)
        if (existing) next.set(data.filename, { ...existing, state: data.state === 'completed' ? 'completed' : 'interrupted' })
        return next
      })
      if (data.state === 'completed') {
        try {
          const hostname = new URL(displayUrl).hostname
          window.electronAPI?.brain?.logDownload(data.filename, displayUrl, hostname).catch(() => {})
        } catch {}
        addNotification({ id: 'dl-done-' + Date.now(), type: 'success', message: `Downloaded ${data.filename}` })
      }
      setTimeout(() => {
        setDownloads(prev => { const next = new Map(prev); next.delete(data.filename); return next })
      }, 8000)
    })
    return () => { unsub1(); unsub2(); unsub3() }
  }, [])

  // Report download count to parent
  useEffect(() => {
    const active = [...downloads.values()].filter(d => d.state === 'downloading').length
    onDownloadCount?.(active)
  }, [downloads, onDownloadCount])

  const handleUrlSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') navigate(displayUrl)
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const activeDownloads = [...downloads.values()]
  const downloading = activeDownloads.filter(d => d.state === 'downloading')

  return (
    <div className="flex flex-col h-full bg-bg-0 relative">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-1.5 h-10 px-2 pr-[110px] bg-bg-1/60 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center gap-0.5">
          {onHome && (
            <button onClick={onHome}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-fg-4 hover:text-fg-1 hover:bg-white/[0.06] active:scale-95 transition-all"
              title="Home">
              <Home size={14} />
            </button>
          )}
          <button onClick={() => webviewRef.current?.goBack()} disabled={!canGoBack}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-fg-4 hover:text-fg-1 hover:bg-white/[0.06] disabled:opacity-20 disabled:pointer-events-none active:scale-95 transition-all">
            <ArrowLeft size={14} />
          </button>
          <button onClick={() => webviewRef.current?.goForward()} disabled={!canGoForward}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-fg-4 hover:text-fg-1 hover:bg-white/[0.06] disabled:opacity-20 disabled:pointer-events-none active:scale-95 transition-all">
            <ArrowRight size={14} />
          </button>
          <button onClick={() => loading ? webviewRef.current?.stop() : webviewRef.current?.reload()}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-fg-4 hover:text-fg-1 hover:bg-white/[0.06] active:scale-95 transition-all">
            {loading ? <X size={14} /> : <RotateCw size={13} />}
          </button>
        </div>

        <div className="flex-1 flex items-center h-[30px] rounded-lg bg-bg-0/50 border border-white/[0.06] px-2.5 gap-2 min-w-0">
          {isSecure ? <Lock size={11} className="shrink-0 text-emerald-400/80" /> : <Unlock size={11} className="shrink-0 text-fg-4/60" />}
          <input ref={urlInputRef} value={displayUrl} onChange={e => setDisplayUrl(e.target.value)}
            onKeyDown={handleUrlSubmit} onFocus={e => e.target.select()}
            className="flex-1 bg-transparent text-[12px] text-fg-2 placeholder:text-fg-4/40 outline-none min-w-0" spellCheck={false} />
          {loading && <div className="shrink-0 w-3 h-3 border border-fg-4/30 border-t-fg-2 rounded-full animate-spin" />}
        </div>

        <div className="flex items-center gap-0.5">
          {foundLinks.length > 0 && (
            <button onClick={() => setShowLinks(!showLinks)}
              className={`flex items-center gap-1 px-2 h-7 rounded-lg active:scale-95 transition-all ${showLinks ? 'bg-blue-500/15 text-blue-400' : 'bg-white/[0.04] text-fg-4 hover:bg-white/[0.08]'}`}
              title={`${foundLinks.length} download links found`}>
              <Link2 size={11} />
              <span className="text-[10px] font-medium">{foundLinks.length}</span>
            </button>
          )}
          {activeDownloads.length > 0 && (
            <button onClick={() => setShowDownloads(!showDownloads)}
              className={`flex items-center gap-1 px-2 h-7 rounded-lg active:scale-95 transition-all ${showDownloads ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.04] text-fg-4 hover:bg-white/[0.08]'}`}
              title="Downloads">
              <Download size={11} />
              {downloading.length > 0 && <span className="text-[10px] font-medium">{downloading.length}</span>}
            </button>
          )}
          <div className="flex items-center gap-1 px-2 h-7 rounded-lg bg-emerald-500/8 text-emerald-400/70">
            <Shield size={11} />
          </div>
        </div>
      </div>

      {/* Loading bar */}
      {loading && (
        <div className="h-[2px] bg-bg-0 relative overflow-hidden shrink-0">
          <motion.div className="absolute inset-0 bg-white/15" initial={{ x: '-100%' }} animate={{ x: '100%' }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />
        </div>
      )}

      {/* Floating toast notifications — top center, iOS style */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => {
            const Icon = TOAST_ICONS[n.type] || Eye
            return (
              <motion.div key={n.id}
                className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-xl border backdrop-blur-xl shadow-lg shadow-black/20 text-[12px] ${TOAST_STYLES[n.type] || TOAST_STYLES.info}`}
                initial={{ opacity: 0, y: -12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
                <Icon size={13} className="shrink-0" />
                <span className="whitespace-nowrap">{n.message}</span>
                <button onClick={() => dismissNotification(n.id)} className="shrink-0 ml-1 opacity-40 hover:opacity-100 transition-opacity">
                  <X size={11} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Download links dropdown */}
      <AnimatePresence>
        {showLinks && foundLinks.length > 0 && (
          <motion.div className="shrink-0 max-h-[200px] overflow-y-auto border-b border-white/[0.06] bg-bg-1/80 backdrop-blur-md scrollbar-none"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}>
            <div className="px-3 py-1.5 text-[10px] text-fg-4/60 font-medium uppercase tracking-wider">Download Links</div>
            {foundLinks.map((link, i) => (
              <button key={i} onClick={() => navigate(link.href)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors">
                <Download size={12} className="shrink-0 text-fg-4/60" />
                <span className="text-[12px] text-fg-2 truncate flex-1">{link.text || link.href}</span>
                <span className="text-[10px] text-fg-4/40 truncate max-w-[180px]">{link.href.slice(0, 50)}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webview */}
      <div className="flex-1 relative min-h-0">
        <webview
          ref={webviewRef as any}
          src={initialUrl}
          partition="persist:vael-browser"
          allowpopups=""
          style={{ width: '100%', height: '100%', display: 'flex' }}
        />
      </div>

      {/* Chrome-style download shelf */}
      <AnimatePresence>
        {showDownloads && activeDownloads.length > 0 && (
          <motion.div className="shrink-0 border-t border-white/[0.06] bg-bg-1/80 backdrop-blur-md px-2 py-1.5"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {activeDownloads.map(dl => {
                const pct = dl.total > 0 ? (dl.received / dl.total) * 100 : 0
                return (
                  <div key={dl.filename}
                    className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] max-w-[260px] relative overflow-hidden">
                    {dl.state === 'downloading' && (
                      <div className="absolute bottom-0 left-0 h-[2px] bg-white/20 transition-all duration-300 rounded-full" style={{ width: `${pct}%` }} />
                    )}
                    <Download size={13} className={
                      dl.state === 'completed' ? 'text-emerald-400 shrink-0' :
                      dl.state === 'interrupted' ? 'text-red-400 shrink-0' :
                      'text-fg-3 shrink-0'
                    } />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-fg-1 truncate">{dl.filename}</div>
                      {dl.state === 'downloading' && dl.total > 0 && (
                        <div className="text-[10px] text-fg-4 tabular-nums">{formatBytes(dl.received)} / {formatBytes(dl.total)}</div>
                      )}
                      {dl.state === 'completed' && <div className="text-[10px] text-emerald-400/70">Done</div>}
                      {dl.state === 'interrupted' && <div className="text-[10px] text-red-400/70">Failed</div>}
                    </div>
                  </div>
                )
              })}
              <button onClick={() => setShowDownloads(false)}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-fg-4 hover:text-fg-2 hover:bg-white/[0.06] transition-colors">
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
