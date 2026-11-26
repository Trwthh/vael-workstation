/// <reference types="vite/client" />

declare global {
  interface Window {
    electronAPI?: {
      window: {
        minimize: () => void
        maximize: () => void
        close: () => void
        isMaximized: () => Promise<boolean>
      }
      onMaximizeChange: (callback: (maximized: boolean) => void) => void
      vault: { appendStyle: (word: string, quote: string) => Promise<boolean> }
      agent: {
        run: (opts: { prompt: string; model: string; systemPrompt: string; sessionId: string; agent?: string; subagentContext?: string }) => Promise<boolean>
        listAgents: (sessionId?: string) => Promise<{ agents: import('./stores/agent').AgentInfo[]; errors: { file: string; error: string }[] }>
        openAgentsDir: () => Promise<boolean>
        onSubagent: (cb: (data: import('./stores/agent').SubagentEvent) => void) => () => void
        cancel: () => Promise<boolean>
        openDir: (dir: string) => Promise<boolean>
        showItemInFolder: (fullPath: string) => Promise<boolean>
        onChunk: (cb: (data: { delta: string; model: string }) => void) => () => void
        onDone: (cb: (data: { text: string; model: string; artifacts: string[]; sessionDir: string }) => void) => () => void
        onRefusal: (cb: (data: { model: string; text: string }) => void) => () => void
        onError: (cb: (data: { error: string; model: string }) => void) => () => void
        onStatus: (cb: (data: { status: string; model?: string; agent?: string }) => void) => () => void
        onActivity: (cb: (data: { tool: string; label: string }) => void) => () => void
        onTasks: (cb: (tasks: { text: string; active: string; status: 'pending' | 'in_progress' | 'completed' }[]) => void) => () => void
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
      ai: {
        status: () => Promise<{ connected: boolean; cliFound: boolean; cliVersion: string | null; model: string; error: string | null }>
        check: () => Promise<{ connected: boolean; cliFound: boolean; cliVersion: string | null; model: string; error: string | null }>
        onStatusUpdate: (cb: (data: { connected: boolean; cliFound: boolean; cliVersion: string | null; model: string; error: string | null }) => void) => () => void
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
      updater: {
        check: () => Promise<boolean>
        download: () => Promise<boolean>
        install: () => Promise<boolean>
        getVersion: () => Promise<string>
        onAvailable: (cb: (info: { version: string; releaseNotes: string }) => void) => () => void
        onNotAvailable: (cb: () => void) => () => void
        onProgress: (cb: (p: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => () => void
        onDownloaded: (cb: () => void) => () => void
        onError: (cb: (msg: string) => void) => () => void
      }
    }
  }
}

export {}
