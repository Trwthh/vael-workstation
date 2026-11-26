import { contextBridge, ipcRenderer } from 'electron'
import type { AgentInfo } from './agents'
import type { AgentRunOpts, SubagentEvent } from './agent'

type AgentRunRequest = Omit<AgentRunOpts, 'vaultDir'>

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
  onMaximizeChange: (callback: (maximized: boolean) => void) => {
    ipcRenderer.on('window:maximized', (_, val) => callback(val))
  },
  vault: {
    appendStyle: (word: string, quote: string): Promise<boolean> =>
      ipcRenderer.invoke('vault:appendStyle', word, quote),
  },
  agent: {
    run: (opts: AgentRunRequest): Promise<boolean> =>
      ipcRenderer.invoke('agent:run', opts),
    listAgents: (sessionId?: string): Promise<{ agents: AgentInfo[]; errors: { file: string; error: string }[] }> =>
      ipcRenderer.invoke('agents:list', sessionId),
    openAgentsDir: (): Promise<boolean> =>
      ipcRenderer.invoke('agents:openDir'),
    onSubagent: (cb: (data: SubagentEvent) => void) => {
      const handler = (_: unknown, data: SubagentEvent) => cb(data)
      ipcRenderer.on('agent:subagent', handler)
      return () => ipcRenderer.removeListener('agent:subagent', handler)
    },
    cancel: (): Promise<boolean> =>
      ipcRenderer.invoke('agent:cancel'),
    openDir: (dir: string): Promise<boolean> =>
      ipcRenderer.invoke('agent:openDir', dir),
    showItemInFolder: (fullPath: string): Promise<boolean> =>
      ipcRenderer.invoke('shell:showItemInFolder', fullPath),
    onChunk: (cb: (data: { delta: string; model: string }) => void) => {
      const handler = (_: unknown, data: { delta: string; model: string }) => cb(data)
      ipcRenderer.on('agent:chunk', handler)
      return () => ipcRenderer.removeListener('agent:chunk', handler)
    },
    onDone: (cb: (data: { text: string; model: string; artifacts: string[]; sessionDir: string }) => void) => {
      const handler = (_: unknown, data: { text: string; model: string; artifacts: string[]; sessionDir: string }) => cb(data)
      ipcRenderer.on('agent:done', handler)
      return () => ipcRenderer.removeListener('agent:done', handler)
    },
    onRefusal: (cb: (data: { model: string; text: string }) => void) => {
      const handler = (_: unknown, data: { model: string; text: string }) => cb(data)
      ipcRenderer.on('agent:refusal', handler)
      return () => ipcRenderer.removeListener('agent:refusal', handler)
    },
    onError: (cb: (data: { error: string; model: string }) => void) => {
      const handler = (_: unknown, data: { error: string; model: string }) => cb(data)
      ipcRenderer.on('agent:error', handler)
      return () => ipcRenderer.removeListener('agent:error', handler)
    },
    onStatus: (cb: (data: { status: string; model?: string }) => void) => {
      const handler = (_: unknown, data: { status: string; model?: string }) => cb(data)
      ipcRenderer.on('agent:status', handler)
      return () => ipcRenderer.removeListener('agent:status', handler)
    },
    onActivity: (cb: (data: { tool: string; label: string }) => void) => {
      const handler = (_: unknown, data: { tool: string; label: string }) => cb(data)
      ipcRenderer.on('agent:activity', handler)
      return () => ipcRenderer.removeListener('agent:activity', handler)
    },
    onTasks: (cb: (tasks: { text: string; active: string; status: 'pending' | 'in_progress' | 'completed' }[]) => void) => {
      const handler = (_: unknown, tasks: { text: string; active: string; status: 'pending' | 'in_progress' | 'completed' }[]) => cb(tasks)
      ipcRenderer.on('agent:tasks', handler)
      return () => ipcRenderer.removeListener('agent:tasks', handler)
    },
  },
  support: {
    run: (prompt: string, model?: string): Promise<boolean> =>
      ipcRenderer.invoke('support:run', prompt, model),
    cancel: (): Promise<boolean> =>
      ipcRenderer.invoke('support:cancel'),
    rebuild: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('support:rebuild'),
    restart: (): Promise<void> =>
      ipcRenderer.invoke('support:restart'),
    sourceDir: (): Promise<string> =>
      ipcRenderer.invoke('support:sourceDir'),
    onChunk: (cb: (data: { delta: string }) => void) => {
      const handler = (_: unknown, data: { delta: string }) => cb(data)
      ipcRenderer.on('support:chunk', handler)
      return () => ipcRenderer.removeListener('support:chunk', handler)
    },
    onDone: (cb: (data: { text: string }) => void) => {
      const handler = (_: unknown, data: { text: string }) => cb(data)
      ipcRenderer.on('support:done', handler)
      return () => ipcRenderer.removeListener('support:done', handler)
    },
    onError: (cb: (data: { error: string }) => void) => {
      const handler = (_: unknown, data: { error: string }) => cb(data)
      ipcRenderer.on('support:error', handler)
      return () => ipcRenderer.removeListener('support:error', handler)
    },
    onStatus: (cb: (data: { status: string }) => void) => {
      const handler = (_: unknown, data: { status: string }) => cb(data)
      ipcRenderer.on('support:status', handler)
      return () => ipcRenderer.removeListener('support:status', handler)
    },
    onActivity: (cb: (data: { tool: string; label: string }) => void) => {
      const handler = (_: unknown, data: { tool: string; label: string }) => cb(data)
      ipcRenderer.on('support:activity', handler)
      return () => ipcRenderer.removeListener('support:activity', handler)
    },
  },
  rea: {
    run: (prompt: string, model?: string, targetPath?: string): Promise<boolean> =>
      ipcRenderer.invoke('rea:run', prompt, model, targetPath),
    cancel: (): Promise<boolean> =>
      ipcRenderer.invoke('rea:cancel'),
    onChunk: (cb: (data: { delta: string }) => void) => {
      const handler = (_: unknown, data: { delta: string }) => cb(data)
      ipcRenderer.on('rea:chunk', handler)
      return () => ipcRenderer.removeListener('rea:chunk', handler)
    },
    onDone: (cb: (data: { text: string }) => void) => {
      const handler = (_: unknown, data: { text: string }) => cb(data)
      ipcRenderer.on('rea:done', handler)
      return () => ipcRenderer.removeListener('rea:done', handler)
    },
    onError: (cb: (data: { error: string }) => void) => {
      const handler = (_: unknown, data: { error: string }) => cb(data)
      ipcRenderer.on('rea:error', handler)
      return () => ipcRenderer.removeListener('rea:error', handler)
    },
    onStatus: (cb: (data: { status: string }) => void) => {
      const handler = (_: unknown, data: { status: string }) => cb(data)
      ipcRenderer.on('rea:status', handler)
      return () => ipcRenderer.removeListener('rea:status', handler)
    },
    onActivity: (cb: (data: { tool: string; label: string }) => void) => {
      const handler = (_: unknown, data: { tool: string; label: string }) => cb(data)
      ipcRenderer.on('rea:activity', handler)
      return () => ipcRenderer.removeListener('rea:activity', handler)
    },
  },
  searchAgent: {
    run: (query: string, model?: string, images?: Array<{ data: string; name: string }>): Promise<boolean> =>
      ipcRenderer.invoke('search-agent:run', query, model, images),
    followUp: (message: string): Promise<boolean> =>
      ipcRenderer.invoke('search-agent:followup', message),
    cancel: (): Promise<boolean> =>
      ipcRenderer.invoke('search-agent:cancel'),
    clicked: (query: string): Promise<boolean> =>
      ipcRenderer.invoke('search-agent:clicked', query),
    stats: (): Promise<{ totalSearches: number; avgQuality: number; topModel: string | null; escalationRate: number }> =>
      ipcRenderer.invoke('search-agent:stats'),
    onChunk: (cb: (data: { delta: string }) => void) => {
      const handler = (_: unknown, data: { delta: string }) => cb(data)
      ipcRenderer.on('search-agent:chunk', handler)
      return () => ipcRenderer.removeListener('search-agent:chunk', handler)
    },
    onDone: (cb: (data: { text: string; model?: string }) => void) => {
      const handler = (_: unknown, data: { text: string; model?: string }) => cb(data)
      ipcRenderer.on('search-agent:done', handler)
      return () => ipcRenderer.removeListener('search-agent:done', handler)
    },
    onError: (cb: (data: { error: string }) => void) => {
      const handler = (_: unknown, data: { error: string }) => cb(data)
      ipcRenderer.on('search-agent:error', handler)
      return () => ipcRenderer.removeListener('search-agent:error', handler)
    },
    onStatus: (cb: (data: { status: string; model?: string }) => void) => {
      const handler = (_: unknown, data: { status: string; model?: string }) => cb(data)
      ipcRenderer.on('search-agent:status', handler)
      return () => ipcRenderer.removeListener('search-agent:status', handler)
    },
    onActivity: (cb: (data: { tool: string; label: string }) => void) => {
      const handler = (_: unknown, data: { tool: string; label: string }) => cb(data)
      ipcRenderer.on('search-agent:activity', handler)
      return () => ipcRenderer.removeListener('search-agent:activity', handler)
    },
    onRefusal: (cb: (data: { url: string; query: string }) => void) => {
      const handler = (_: unknown, data: { url: string; query: string }) => cb(data)
      ipcRenderer.on('search-agent:refusal', handler)
      return () => ipcRenderer.removeListener('search-agent:refusal', handler)
    },
    onClear: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('search-agent:clear', handler)
      return () => ipcRenderer.removeListener('search-agent:clear', handler)
    },
    onLinks: (cb: (data: { links: Array<{ url: string; title: string; domain: string; trust: number; tier: 'recommended' | 'alternative' | 'caution' }> }) => void) => {
      const handler = (_: unknown, data: { links: Array<{ url: string; title: string; domain: string; trust: number; tier: 'recommended' | 'alternative' | 'caution' }> }) => cb(data)
      ipcRenderer.on('search-agent:links', handler)
      return () => ipcRenderer.removeListener('search-agent:links', handler)
    },
  },
  ai: {
    status: (): Promise<{ connected: boolean; cliFound: boolean; cliVersion: string | null; model: string; error: string | null }> =>
      ipcRenderer.invoke('ai:status'),
    check: (): Promise<{ connected: boolean; cliFound: boolean; cliVersion: string | null; model: string; error: string | null }> =>
      ipcRenderer.invoke('ai:check'),
    onStatusUpdate: (cb: (data: { connected: boolean; cliFound: boolean; cliVersion: string | null; model: string; error: string | null }) => void) => {
      const handler = (_: unknown, data: any) => cb(data)
      ipcRenderer.on('ai:statusUpdate', handler)
      return () => ipcRenderer.removeListener('ai:statusUpdate', handler)
    },
  },
  profile: {
    get: (): Promise<Record<string, string>> => ipcRenderer.invoke('profile:get'),
    set: (key: string, value: string): Promise<boolean> => ipcRenderer.invoke('profile:set', key, value),
  },
  browser: {
    onDownloadStart: (cb: (data: { filename: string; totalBytes: number; savePath: string }) => void) => {
      const handler = (_: unknown, data: { filename: string; totalBytes: number; savePath: string }) => cb(data)
      ipcRenderer.on('download:start', handler)
      return () => ipcRenderer.removeListener('download:start', handler)
    },
    onDownloadProgress: (cb: (data: { filename: string; received: number; total: number }) => void) => {
      const handler = (_: unknown, data: { filename: string; received: number; total: number }) => cb(data)
      ipcRenderer.on('download:progress', handler)
      return () => ipcRenderer.removeListener('download:progress', handler)
    },
    onDownloadDone: (cb: (data: { filename: string; savePath: string; state: string }) => void) => {
      const handler = (_: unknown, data: { filename: string; savePath: string; state: string }) => cb(data)
      ipcRenderer.on('download:done', handler)
      return () => ipcRenderer.removeListener('download:done', handler)
    },
  },
  db: {
    loadSessions: (): Promise<Array<{ id: string; title: string; createdAt: number }>> =>
      ipcRenderer.invoke('db:loadSessions'),
    upsertSession: (id: string, title: string, createdAt: number): Promise<boolean> =>
      ipcRenderer.invoke('db:upsertSession', id, title, createdAt),
    deleteSession: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('db:deleteSession', id),
    renameSession: (id: string, title: string): Promise<boolean> =>
      ipcRenderer.invoke('db:renameSession', id, title),
    loadMessages: (sessionId: string): Promise<unknown[]> =>
      ipcRenderer.invoke('db:loadMessages', sessionId),
    saveMessage: (sessionId: string, msg: unknown): Promise<boolean> =>
      ipcRenderer.invoke('db:saveMessage', sessionId, msg),
    deleteMessage: (sessionId: string, msgId: string): Promise<boolean> =>
      ipcRenderer.invoke('db:deleteMessage', sessionId, msgId),
  },
  brain: {
    logSearch: (query: string, engine: string, resultUrl?: string, success?: boolean, downloadFound?: boolean, notes?: string): Promise<boolean> =>
      ipcRenderer.invoke('brain:logSearch', query, engine, resultUrl, success, downloadFound, notes),
    findSimilar: (query: string): Promise<unknown[]> =>
      ipcRenderer.invoke('brain:findSimilar', query),
    searchHistory: (limit?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('brain:searchHistory', limit),
    getSite: (domain: string): Promise<unknown> =>
      ipcRenderer.invoke('brain:getSite', domain),
    updateSite: (domain: string, data: unknown): Promise<boolean> =>
      ipcRenderer.invoke('brain:updateSite', domain, data),
    topSites: (limit?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('brain:topSites', limit),
    logDownload: (filename: string, url?: string, sourceDomain?: string, fileSize?: number, fileHash?: string, safe?: boolean): Promise<boolean> =>
      ipcRenderer.invoke('brain:logDownload', filename, url, sourceDomain, fileSize, fileHash, safe),
    downloadHistory: (limit?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('brain:downloadHistory', limit),
    rankedSites: (domains: string[]): Promise<Array<{ domain: string; trust_score: number; notes: string | null }>> =>
      ipcRenderer.invoke('brain:rankedSites', domains),
    // Prompt engineering
    savePrompt: (name: string, content: string, modelTarget?: string, notes?: string): Promise<number> =>
      ipcRenderer.invoke('brain:savePrompt', name, content, modelTarget, notes),
    getActivePrompt: (name: string): Promise<{ id: number; version: number; content: string; avgQuality: number } | null> =>
      ipcRenderer.invoke('brain:getActivePrompt', name),
    getPromptHistory: (name: string): Promise<unknown[]> =>
      ipcRenderer.invoke('brain:getPromptHistory', name),
    rollbackPrompt: (name: string, version: number): Promise<boolean> =>
      ipcRenderer.invoke('brain:rollbackPrompt', name, version),
    // Test results
    logTest: (data: unknown): Promise<boolean> =>
      ipcRenderer.invoke('brain:logTest', data),
    getTestResults: (category?: string, limit?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('brain:getTestResults', category, limit),
    getTestStats: (): Promise<unknown> =>
      ipcRenderer.invoke('brain:getTestStats'),
    // Improvement tracking
    logImprovement: (data: unknown): Promise<boolean> =>
      ipcRenderer.invoke('brain:logImprovement', data),
    getImprovements: (): Promise<unknown[]> =>
      ipcRenderer.invoke('brain:getImprovements'),
  },
  updater: {
    check: (): Promise<boolean> => ipcRenderer.invoke('updater:check'),
    download: (): Promise<boolean> => ipcRenderer.invoke('updater:download'),
    install: (): Promise<boolean> => ipcRenderer.invoke('updater:install'),
    getVersion: (): Promise<string> => ipcRenderer.invoke('updater:getVersion'),
    onAvailable: (cb: (info: { version: string; releaseNotes: string }) => void) => {
      const handler = (_: unknown, info: { version: string; releaseNotes: string }) => cb(info)
      ipcRenderer.on('updater:available', handler)
      return () => ipcRenderer.removeListener('updater:available', handler)
    },
    onNotAvailable: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('updater:not-available', handler)
      return () => ipcRenderer.removeListener('updater:not-available', handler)
    },
    onProgress: (cb: (p: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => {
      const handler = (_: unknown, p: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => cb(p)
      ipcRenderer.on('updater:progress', handler)
      return () => ipcRenderer.removeListener('updater:progress', handler)
    },
    onDownloaded: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('updater:downloaded', handler)
      return () => ipcRenderer.removeListener('updater:downloaded', handler)
    },
    onError: (cb: (msg: string) => void) => {
      const handler = (_: unknown, msg: string) => cb(msg)
      ipcRenderer.on('updater:error', handler)
      return () => ipcRenderer.removeListener('updater:error', handler)
    },
  },
})

declare global {
  interface Window {
    electronAPI: {
      window: {
        minimize: () => void
        maximize: () => void
        close: () => void
        isMaximized: () => Promise<boolean>
      }
      onMaximizeChange: (callback: (maximized: boolean) => void) => void
      vault: { appendStyle: (word: string, quote: string) => Promise<boolean> }
      agent: {
        run: (opts: AgentRunRequest) => Promise<boolean>
        listAgents: (sessionId?: string) => Promise<{ agents: AgentInfo[]; errors: { file: string; error: string }[] }>
        openAgentsDir: () => Promise<boolean>
        onSubagent: (cb: (data: SubagentEvent) => void) => () => void
        cancel: () => Promise<boolean>
        openDir: (dir: string) => Promise<boolean>
        showItemInFolder: (fullPath: string) => Promise<boolean>
        onChunk: (cb: (data: { delta: string; model: string }) => void) => () => void
        onDone: (cb: (data: { text: string; model: string; artifacts: string[]; sessionDir: string }) => void) => () => void
        onRefusal: (cb: (data: { model: string; text: string }) => void) => () => void
        onError: (cb: (data: { error: string; model: string }) => void) => () => void
        onStatus: (cb: (data: { status: string; model?: string }) => void) => () => void
        onActivity: (cb: (data: { tool: string; label: string }) => void) => () => void
      }
      support: {
        run: (prompt: string, model?: string) => Promise<boolean>
        cancel: () => Promise<boolean>
        rebuild: () => Promise<{ success: boolean; error?: string }>
        restart: () => Promise<void>
        sourceDir: () => Promise<string>
        onChunk: (cb: (data: { delta: string }) => void) => () => void
        onDone: (cb: (data: { text: string }) => void) => () => void
        onError: (cb: (data: { error: string }) => void) => () => void
        onStatus: (cb: (data: { status: string }) => void) => () => void
        onActivity: (cb: (data: { tool: string; label: string }) => void) => () => void
      }
      rea: {
        run: (prompt: string, model?: string, targetPath?: string) => Promise<boolean>
        cancel: () => Promise<boolean>
        onChunk: (cb: (data: { delta: string }) => void) => () => void
        onDone: (cb: (data: { text: string }) => void) => () => void
        onError: (cb: (data: { error: string }) => void) => () => void
        onStatus: (cb: (data: { status: string }) => void) => () => void
        onActivity: (cb: (data: { tool: string; label: string }) => void) => () => void
      }
      searchAgent: {
        run: (query: string, model?: string, images?: Array<{ data: string; name: string }>) => Promise<boolean>
        followUp: (message: string) => Promise<boolean>
        cancel: () => Promise<boolean>
        clicked: (query: string) => Promise<boolean>
        stats: () => Promise<{ totalSearches: number; avgQuality: number; topModel: string | null; escalationRate: number }>
        onChunk: (cb: (data: { delta: string }) => void) => () => void
        onDone: (cb: (data: { text: string; model?: string }) => void) => () => void
        onError: (cb: (data: { error: string }) => void) => () => void
        onStatus: (cb: (data: { status: string; model?: string }) => void) => () => void
        onActivity: (cb: (data: { tool: string; label: string }) => void) => () => void
        onRefusal: (cb: (data: { url: string; query: string }) => void) => () => void
        onClear: (cb: () => void) => () => void
        onLinks: (cb: (data: { links: Array<{ url: string; title: string; domain: string; trust: number; tier: 'recommended' | 'alternative' | 'caution' }> }) => void) => () => void
      }
      profile: {
        get: () => Promise<Record<string, string>>
        set: (key: string, value: string) => Promise<boolean>
      }
      browser: {
        onDownloadStart: (cb: (data: { filename: string; totalBytes: number; savePath: string }) => void) => () => void
        onDownloadProgress: (cb: (data: { filename: string; received: number; total: number }) => void) => () => void
        onDownloadDone: (cb: (data: { filename: string; savePath: string; state: string }) => void) => () => void
      }
      db: {
        loadSessions: () => Promise<Array<{ id: string; title: string; createdAt: number }>>
        upsertSession: (id: string, title: string, createdAt: number) => Promise<boolean>
        deleteSession: (id: string) => Promise<boolean>
        renameSession: (id: string, title: string) => Promise<boolean>
        loadMessages: (sessionId: string) => Promise<unknown[]>
        saveMessage: (sessionId: string, msg: unknown) => Promise<boolean>
        deleteMessage: (sessionId: string, msgId: string) => Promise<boolean>
        clearMessages: (sessionId: string) => Promise<boolean>
      }
      brain: {
        logSearch: (query: string, engine: string, resultUrl?: string, success?: boolean, downloadFound?: boolean, notes?: string) => Promise<boolean>
        findSimilar: (query: string) => Promise<unknown[]>
        searchHistory: (limit?: number) => Promise<unknown[]>
        getSite: (domain: string) => Promise<unknown>
        updateSite: (domain: string, data: unknown) => Promise<boolean>
        topSites: (limit?: number) => Promise<unknown[]>
        logDownload: (filename: string, url?: string, sourceDomain?: string, fileSize?: number, fileHash?: string, safe?: boolean) => Promise<boolean>
        downloadHistory: (limit?: number) => Promise<unknown[]>
        rankedSites: (domains: string[]) => Promise<Array<{ domain: string; trust_score: number; notes: string | null }>>
        savePrompt: (name: string, content: string, modelTarget?: string, notes?: string) => Promise<number>
        getActivePrompt: (name: string) => Promise<{ id: number; version: number; content: string; avgQuality: number } | null>
        getPromptHistory: (name: string) => Promise<unknown[]>
        rollbackPrompt: (name: string, version: number) => Promise<boolean>
        logTest: (data: unknown) => Promise<boolean>
        getTestResults: (category?: string, limit?: number) => Promise<unknown[]>
        getTestStats: () => Promise<unknown>
        logImprovement: (data: unknown) => Promise<boolean>
        getImprovements: () => Promise<unknown[]>
      }
    }
  }
}
