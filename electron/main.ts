import { app, BrowserWindow, ipcMain, shell, session } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import fs from 'fs'
import { execFile } from 'child_process'
import { AgentRunner, GLOBAL_AGENTS_DIR, listAgents, type AgentRunOpts } from './agent'
import { EXAMPLE_AGENT } from './agents'
import { SupportAgent } from './support-agent'
import { ReaAgent } from './rea-agent'
import { SearchAgent } from './search-agent'
import { initDb, loadSessions, upsertSession, deleteSession as dbDeleteSession, renameSession as dbRenameSession, loadMessages, saveMessage, deleteMessage, logSearch, findSimilarSearches, getSearchHistory, getSiteKnowledge, updateSiteKnowledge, getTopSites, logDownload, getDownloadHistory, markSearchClicked, getAgentStats, savePromptVersion, getActivePrompt, getPromptHistory, rollbackPrompt, logTestResult, getTestResults, getTestStats, logImprovement, getImprovementHistory, seedSiteReputation, initProfileTable, getProfile, setProfileField, getRankedSites, clearMessages } from './db'

const agent = new AgentRunner()
const SOURCE_DIR = process.env.VAEL_SOURCE_DIR || path.join(app.isPackaged ? path.dirname(process.execPath) : __dirname, '..')
const support = new SupportAgent(SOURCE_DIR)
const rea = new ReaAgent()
const searchAgent = new SearchAgent()

process.env.DIST = path.join(__dirname, '..')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, 'public')

let mainWindow: BrowserWindow | null = null
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    frame: false,
    backgroundColor: '#0f0f11',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
  })

  agent.setWindow(mainWindow)
  support.setWindow(mainWindow)
  rea.setWindow(mainWindow)
  searchAgent.setWindow(mainWindow)

  // Show when ready — inactive so it doesn't steal focus
  mainWindow.once('ready-to-show', () => {
    mainWindow?.showInactive()
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(process.env.DIST!, 'dist', 'index.html'))
  }
}

// Window control IPC
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

// Vault: learned style words are appended to one fixed note, nothing else is writable
const VAULT_DIR = process.env.VAEL_VAULT_DIR || path.join(app.getPath('documents'), 'VAEL Vault')
ipcMain.handle('vault:appendStyle', async (_e, word: unknown, quote: unknown) => {
  if (typeof word !== 'string' || !/^[a-z-]{2,20}$/.test(word)) return false
  const q = typeof quote === 'string' ? quote.replace(/\s+/g, ' ').replace(/"/g, "'").slice(0, 200) : ''
  const file = path.join(VAULT_DIR, 'Claude Workspace', 'VAEL Workstation Style.md')
  try {
    await fs.promises.mkdir(path.dirname(file), { recursive: true })
    await fs.promises.appendFile(file, `- ${new Date().toISOString().slice(0, 10)} - "${q}" -> ${word}\n`)
    return true
  } catch {
    return false
  }
})

// Agent IPC
ipcMain.handle('agent:run', async (_e, opts: Omit<AgentRunOpts, 'vaultDir'>) => {
  if (agent.isRunning) agent.cancel()
  agent.run({ ...opts, vaultDir: VAULT_DIR }).catch(() => {})
  return true
})
ipcMain.handle('agents:list', (_e, sessionId?: string) => listAgents(sessionId))
ipcMain.handle('agents:openDir', async () => {
  await fs.promises.mkdir(GLOBAL_AGENTS_DIR, { recursive: true })
  const example = path.join(GLOBAL_AGENTS_DIR, 'example-docs.md')
  if (!fs.existsSync(example)) await fs.promises.writeFile(example, EXAMPLE_AGENT, 'utf-8')
  shell.openPath(GLOBAL_AGENTS_DIR)
  return true
})
ipcMain.handle('agent:cancel', () => {
  agent.cancel()
  return true
})
ipcMain.handle('agent:openDir', async (_e, dir: string) => {
  shell.openPath(dir)
  return true
})
ipcMain.handle('shell:showItemInFolder', (_e, fullPath: string) => {
  shell.showItemInFolder(fullPath)
  return true
})

// Support agent IPC
ipcMain.handle('support:run', async (_e, prompt: string, model: string) => {
  if (support.isRunning) support.cancel()
  support.run(prompt, model || 'claude-sonnet-5-5').catch(() => {})
  return true
})
ipcMain.handle('support:cancel', () => {
  support.cancel()
  return true
})
ipcMain.handle('support:rebuild', async () => {
  return support.rebuild()
})
ipcMain.handle('support:restart', () => {
  app.relaunch()
  app.exit(0)
})
ipcMain.handle('support:sourceDir', () => SOURCE_DIR)

// REA (Reverse Engineering) agent IPC
ipcMain.handle('rea:run', async (_e, prompt: string, model: string, targetPath?: string) => {
  if (rea.isRunning) rea.cancel()
  rea.run(prompt, model || 'claude-sonnet-5-5', targetPath).catch(() => {})
  return true
})
ipcMain.handle('rea:cancel', () => {
  rea.cancel()
  return true
})

// Search agent IPC
ipcMain.handle('search-agent:run', async (_e, query: string, model?: string, images?: Array<{ data: string; name: string }>) => {
  if (searchAgent.isRunning) searchAgent.cancel()

  // Save pasted/attached images to temp files
  const imagePaths: string[] = []
  if (images && images.length > 0) {
    const imgDir = path.join(app.getPath('userData'), 'search-agent', 'images')
    await fs.promises.mkdir(imgDir, { recursive: true })
    for (const img of images) {
      const ext = img.name.split('.').pop() || 'png'
      const filePath = path.join(imgDir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`)
      const base64 = img.data.replace(/^data:image\/\w+;base64,/, '')
      await fs.promises.writeFile(filePath, Buffer.from(base64, 'base64'))
      imagePaths.push(filePath)
    }
  }

  searchAgent.run(query, model || undefined, imagePaths.length > 0 ? imagePaths : undefined).catch(() => {})
  return true
})
ipcMain.handle('search-agent:followup', async (_e, message: string) => {
  searchAgent.sendFollowUp(message).catch(() => {})
  return true
})
ipcMain.handle('search-agent:cancel', () => {
  searchAgent.cancel()
  return true
})
ipcMain.handle('search-agent:clicked', (_e, query: string) => {
  markSearchClicked(query)
  return true
})
ipcMain.handle('search-agent:stats', () => {
  return getAgentStats()
})

// Database IPC
ipcMain.handle('db:loadSessions', () => loadSessions())
ipcMain.handle('db:upsertSession', (_e, id: string, title: string, createdAt: number) => {
  upsertSession(id, title, createdAt)
  return true
})
ipcMain.handle('db:deleteSession', (_e, id: string) => {
  dbDeleteSession(id)
  return true
})
ipcMain.handle('db:renameSession', (_e, id: string, title: string) => {
  dbRenameSession(id, title)
  return true
})
ipcMain.handle('db:loadMessages', (_e, sessionId: string) => loadMessages(sessionId))
ipcMain.handle('db:saveMessage', (_e, sessionId: string, msg: unknown) => {
  saveMessage(sessionId, msg as Parameters<typeof saveMessage>[1])
  return true
})
ipcMain.handle('db:deleteMessage', (_e, sessionId: string, msgId: string) => {
  deleteMessage(sessionId, msgId)
  return true
})

// Profile IPC
ipcMain.handle('profile:get', () => getProfile())
ipcMain.handle('profile:set', (_e, key: string, value: string) => {
  setProfileField(key, value)
  return true
})

// Ranked sites IPC
ipcMain.handle('brain:rankedSites', (_e, domains: string[]) => getRankedSites(domains))

// Message management
ipcMain.handle('db:clearMessages', (_e, sessionId: string) => {
  clearMessages(sessionId)
  return true
})

// Browser intelligence IPC
ipcMain.handle('brain:logSearch', (_e, query: string, engine: string, resultUrl?: string, success?: boolean, downloadFound?: boolean, notes?: string) => {
  logSearch(query, engine, resultUrl, success, downloadFound, notes)
  return true
})
ipcMain.handle('brain:findSimilar', (_e, query: string) => findSimilarSearches(query))
ipcMain.handle('brain:searchHistory', (_e, limit?: number) => getSearchHistory(limit))
ipcMain.handle('brain:getSite', (_e, domain: string) => getSiteKnowledge(domain))
ipcMain.handle('brain:updateSite', (_e, domain: string, data: unknown) => {
  updateSiteKnowledge(domain, data as Parameters<typeof updateSiteKnowledge>[1])
  return true
})
ipcMain.handle('brain:topSites', (_e, limit?: number) => getTopSites(limit))
ipcMain.handle('brain:logDownload', (_e, filename: string, url?: string, sourceDomain?: string, fileSize?: number, fileHash?: string, safe?: boolean) => {
  logDownload(filename, url, sourceDomain, fileSize, fileHash, safe)
  return true
})
ipcMain.handle('brain:downloadHistory', (_e, limit?: number) => getDownloadHistory(limit))

// Prompt engineering
ipcMain.handle('brain:savePrompt', (_e, name: string, content: string, modelTarget?: string, notes?: string) => {
  return savePromptVersion(name, content, modelTarget, notes)
})
ipcMain.handle('brain:getActivePrompt', (_e, name: string) => getActivePrompt(name))
ipcMain.handle('brain:getPromptHistory', (_e, name: string) => getPromptHistory(name))
ipcMain.handle('brain:rollbackPrompt', (_e, name: string, version: number) => rollbackPrompt(name, version))

// Test results
ipcMain.handle('brain:logTest', (_e, data: unknown) => {
  logTestResult(data as Parameters<typeof logTestResult>[0])
  return true
})
ipcMain.handle('brain:getTestResults', (_e, category?: string, limit?: number) => getTestResults(category, limit))
ipcMain.handle('brain:getTestStats', () => getTestStats())

// Improvement tracking
ipcMain.handle('brain:logImprovement', (_e, data: unknown) => {
  logImprovement(data as Parameters<typeof logImprovement>[0])
  return true
})
ipcMain.handle('brain:getImprovements', () => getImprovementHistory())

// --- Ad blocker & embedded browser ---
const AD_DOMAINS = new Set([
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'adnxs.com', 'media.net', 'outbrain.com', 'taboola.com',
  'popads.net', 'popcash.net', 'adcolony.com', 'serving-sys.com',
  'admob.com', 'pubmatic.com', 'rubiconproject.com', 'criteo.com',
  'casalemedia.com', 'openx.net', 'advertising.com', 'bidvertiser.com',
  'contextweb.com', 'scorecardresearch.com', 'quantserve.com',
  'bluekai.com', 'addthis.com', 'moatads.com', 'adsrvr.org',
  'exoclick.com', 'juicyads.com', 'trafficjunky.com',
  'revcontent.com', 'mgid.com', 'zedo.com', 'propellerads.com',
  'adsterra.com', 'clickadu.com', 'hilltopads.com',
  'ad.doubleclick.net', 'adservice.google.com', 'pagead2.googlesyndication.com',
  'adsymptotic.com', 'adtechus.com', 'advertising.yahoo.com',
  'amazon-adsystem.com', 'betrad.com', 'bidswitch.net',
  'bitmedianetwork.com', 'bounce-exchange.com', 'carbonads.com',
  'chartbeat.com', 'clicktale.net', 'cpmstar.com', 'demdex.net',
  'districtm.io', 'eum-appdynamics.com', 'everesttech.net',
  'flashtalking.com', 'hotjar.com', 'indexww.com', 'krxd.net',
  'lijit.com', 'liveintent.com', 'mathtag.com', 'mixpanel.com',
  'mxpnl.com', 'nativo.com', 'nr-data.net', 'omtrdc.net',
  'optimizely.com', 'pardot.com', 'perimeterx.com', 'rlcdn.com',
  'sharethrough.com', 'simpli.fi', 'sitescout.com', 'smartadserver.com',
  'spotxchange.com', 'teads.tv', 'tidaltv.com', 'tremorhub.com',
  'tribalfusion.com', 'turn.com', 'undertone.com', 'yieldmo.com',
])

function isDomainBlocked(hostname: string): boolean {
  for (const ad of AD_DOMAINS) {
    if (hostname === ad || hostname.endsWith('.' + ad)) return true
  }
  return false
}

const BROWSER_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
]

function setupBrowserSession() {
  const browserSess = session.fromPartition('persist:vael-browser')

  const ua = BROWSER_USER_AGENTS[Math.floor(Math.random() * BROWSER_USER_AGENTS.length)]
  browserSess.setUserAgent(ua)

  browserSess.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    try {
      const { hostname, pathname } = new URL(details.url)
      if (isDomainBlocked(hostname)) return callback({ cancel: true })
      if (/\/(ads?|banners?|popups?|tracking|analytics|beacon|pixel|telemetry)\//i.test(pathname)) return callback({ cancel: true })
      if (/\.(gif|png|jpg|webp)\?.*(?:ad_|click|impression|track)/i.test(details.url)) return callback({ cancel: true })
    } catch {}
    callback({ cancel: false })
  })

  browserSess.on('will-download', (_e, item) => {
    const filename = item.getFilename()
    const totalBytes = item.getTotalBytes()
    const savePath = path.join(app.getPath('downloads'), filename)
    item.setSavePath(savePath)
    mainWindow?.webContents.send('download:start', { filename, totalBytes, savePath })

    item.on('updated', () => {
      if (!item.isPaused()) {
        mainWindow?.webContents.send('download:progress', {
          filename, received: item.getReceivedBytes(), total: item.getTotalBytes(),
        })
      }
    })

    item.on('done', (_e, state) => {
      mainWindow?.webContents.send('download:done', { filename, savePath, state })
    })
  })
}

app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() === 'webview') {
    contents.setWindowOpenHandler(({ url }) => {
      contents.loadURL(url)
      return { action: 'deny' }
    })
  }
})

// Auto-updater
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000
let manualUpdateCheck = false

function updateNotes(notes: unknown): string {
  if (typeof notes === 'string') return notes
  if (Array.isArray(notes)) return notes.map((n) => (typeof n === 'string' ? n : n?.note ?? '')).filter(Boolean).join('\n')
  return ''
}

function setupAutoUpdater() {
  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater:available', {
      version: info.version,
      releaseNotes: updateNotes(info.releaseNotes),
    })
  })
  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('updater:not-available')
  })
  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updater:progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })
  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('updater:downloaded')
  })
  // Background checks stay quiet when offline; a manual check or a failed download shows the error.
  autoUpdater.on('error', (err) => {
    console.warn('[updater]', err?.message ?? err)
    if (manualUpdateCheck) mainWindow?.webContents.send('updater:error', err?.message ?? 'Update failed')
    manualUpdateCheck = false
  })

  const check = () => autoUpdater.checkForUpdates().catch(() => {})
  setTimeout(check, 8000)
  setInterval(check, UPDATE_CHECK_INTERVAL)
}

ipcMain.handle('updater:check', () => {
  manualUpdateCheck = true
  autoUpdater.checkForUpdates().catch(() => {})
  return true
})
ipcMain.handle('updater:download', () => {
  manualUpdateCheck = true
  autoUpdater.downloadUpdate().catch(() => {})
  return true
})
ipcMain.handle('updater:install', () => {
  autoUpdater.quitAndInstall(false, true)
  return true
})
ipcMain.handle('updater:getVersion', () => app.getVersion())

// AI connection check — detects Claude CLI and auth status
interface AIStatus {
  connected: boolean
  cliFound: boolean
  cliVersion: string | null
  model: string
  error: string | null
}

let cachedAIStatus: AIStatus = { connected: false, cliFound: false, cliVersion: null, model: 'claude-sonnet-5-5', error: null }

function checkAIConnection(): Promise<AIStatus> {
  return new Promise((resolve) => {
    execFile('claude', ['--version'], { timeout: 5000 }, (err, stdout) => {
      if (err) {
        cachedAIStatus = { connected: false, cliFound: false, cliVersion: null, model: 'claude-sonnet-5-5', error: 'Claude CLI not found. Install with: npm i -g @anthropic-ai/claude-code' }
        resolve(cachedAIStatus)
        return
      }
      const version = stdout.trim().split('\n')[0] || null
      cachedAIStatus = { connected: true, cliFound: true, cliVersion: version, model: 'claude-sonnet-5-5', error: null }
      resolve(cachedAIStatus)
    })
  })
}

ipcMain.handle('ai:status', () => cachedAIStatus)
ipcMain.handle('ai:check', async () => {
  const status = await checkAIConnection()
  mainWindow?.webContents.send('ai:statusUpdate', status)
  return status
})

// App lifecycle
app.whenReady().then(async () => {
  initDb()
  seedSiteReputation()
  initProfileTable()
  setupBrowserSession()
  createWindow()
  if (app.isPackaged) setupAutoUpdater()
  const status = await checkAIConnection()
  mainWindow?.webContents.send('ai:statusUpdate', status)
})

app.on('before-quit', () => {
  if (agent.isRunning) agent.cancel()
  if (support.isRunning) support.cancel()
  if (rea.isRunning) rea.cancel()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    mainWindow = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
