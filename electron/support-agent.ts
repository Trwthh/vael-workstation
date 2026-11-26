import { spawn, type ChildProcess } from 'child_process'
import { app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'

const SUPPORT_SYSTEM_PROMPT = `You are the VAEL Workstation Support Agent — a self-repair assistant built into the app.

YOUR ROLE: When the user reports a bug, broken feature, UI issue, or crash, you:
1. Diagnose the problem by reading the relevant source files
2. Fix the code
3. The app will be rebuilt and restarted automatically after you finish

PROJECT LOCATION: You are working in the VAEL Workstation source code directory.

TECH STACK:
- Electron 33 (frameless, contextIsolation, preload contextBridge)
- React 18, TypeScript, Vite 6 (vite-plugin-electron), Tailwind 3.4, Zustand 5
- Main process: electron/main.ts, electron/agent.ts, electron/preload.ts, electron/db.ts
- Renderer: src/ (pages, components, stores)
- Build: npm run build (tsc + vite build), npm run package:portable (electron-builder)

KEY FILES:
- electron/agent.ts — Agent runner, spawns Claude CLI, parses stream-json
- electron/main.ts — Main process, IPC handlers
- electron/preload.ts — IPC bridge (contextBridge)
- src/pages/MainAgent.tsx — Main chat page
- src/stores/agent.ts — Agent store with model cascade and instructions
- src/stores/app.ts — App state (pages, sessions, settings)
- src/stores/chats.ts — Message types and in-memory cache
- src/vite-env.d.ts — Window type declarations (must match preload.ts)

RULES:
- Fix the actual bug, don't add workarounds
- Keep changes minimal and targeted
- Update type declarations in vite-env.d.ts when changing preload.ts
- Test by running: npm run build (must pass with no errors)
- Reply with what you fixed and what the user should test`

export class SupportAgent {
  private proc: ChildProcess | null = null
  private win: BrowserWindow | null = null
  private aborted = false
  private sourceDir: string

  constructor(sourceDir: string) {
    this.sourceDir = sourceDir
  }

  setWindow(win: BrowserWindow) {
    this.win = win
  }

  async run(prompt: string, model: string): Promise<void> {
    this.aborted = false

    if (!fs.existsSync(path.join(this.sourceDir, 'package.json'))) {
      this.send('support:error', { error: `Source directory not found: ${this.sourceDir}` })
      return
    }

    const sysPromptFile = path.join(this.sourceDir, '.vael-support-prompt.md')
    await fs.promises.writeFile(sysPromptFile, SUPPORT_SYSTEM_PROMPT, 'utf-8')

    const env = { ...process.env }
    delete env.ANTHROPIC_API_KEY
    delete env.ANTHROPIC_AUTH_TOKEN

    const args = [
      '-p',
      '--model', model,
      '--output-format', 'stream-json',
      '--verbose',
      '--append-system-prompt-file', sysPromptFile,
      '--allowed-tools', 'Bash Edit Write Read Glob Grep',
      '--',
      prompt,
    ]

    this.send('support:status', { status: 'running' })

    this.proc = spawn('claude', args, {
      cwd: this.sourceDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let fullText = ''
    let lastSentLen = 0
    let buffer = ''

    this.proc.stdout?.on('data', (chunk: Buffer) => {
      if (this.aborted) return
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const event = JSON.parse(line)
          if (event.type === 'assistant' && event.message?.content) {
            let text = ''
            for (const block of event.message.content) {
              if (block.type === 'text') text += block.text
              if (block.type === 'tool_use') {
                const label = this.describeToolUse(block.name, block.input || {})
                this.send('support:activity', { tool: block.name, label })
              }
            }
            if (text.length > lastSentLen) {
              const delta = text.slice(lastSentLen)
              fullText = text
              lastSentLen = text.length
              this.send('support:chunk', { delta })
            }
          }

          if (event.type === 'tool_use' || (event.type === 'content_block_start' && event.content_block?.type === 'tool_use')) {
            const block = event.content_block || event
            const label = this.describeToolUse(block.name, block.input || {})
            this.send('support:activity', { tool: block.name, label })
          }

          if (event.type === 'result') {
            if (event.result && typeof event.result === 'string') {
              const remaining = event.result.slice(lastSentLen)
              if (remaining) this.send('support:chunk', { delta: remaining })
              fullText = event.result
            }
            if (!this.aborted) {
              this.send('support:done', { text: fullText })
            }
          }
        } catch {
          // skip malformed
        }
      }
    })

    this.proc.stderr?.on('data', () => {})

    return new Promise<void>((resolve) => {
      this.proc?.on('close', (code) => {
        if (!this.aborted && code !== 0 && !fullText) {
          this.send('support:error', { error: `Support agent exited with code ${code}` })
        }
        this.proc = null
        resolve()
      })
      this.proc?.on('error', (err) => {
        this.send('support:error', { error: err.message })
        this.proc = null
        resolve()
      })
    })
  }

  async rebuild(): Promise<{ success: boolean; error?: string }> {
    this.send('support:status', { status: 'rebuilding' })
    return new Promise((resolve) => {
      const proc = spawn('npm', ['run', 'build'], {
        cwd: this.sourceDir,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      })
      let stderr = ''
      proc.stderr?.on('data', (d) => { stderr += d.toString() })
      proc.stdout?.on('data', (d) => {
        this.send('support:activity', { tool: 'Build', label: d.toString().trim().slice(-60) })
      })
      proc.on('close', (code) => {
        if (code === 0) {
          this.send('support:status', { status: 'built' })
          resolve({ success: true })
        } else {
          this.send('support:error', { error: `Build failed:\n${stderr.slice(-500)}` })
          resolve({ success: false, error: stderr })
        }
      })
    })
  }

  cancel() {
    this.aborted = true
    if (this.proc) {
      this.proc.kill('SIGTERM')
      this.proc = null
    }
    this.send('support:status', { status: 'cancelled' })
  }

  get isRunning() {
    return this.proc !== null
  }

  private describeToolUse(name: string, input: Record<string, unknown>): string {
    const basename = (p: string | undefined) => {
      if (!p) return 'file'
      return p.replace(/\\/g, '/').split('/').pop() || 'file'
    }
    switch (name) {
      case 'Read': return `Reading ${basename(input.file_path as string)}`
      case 'Edit': return `Fixing ${basename(input.file_path as string)}`
      case 'Write': return `Writing ${basename(input.file_path as string)}`
      case 'Bash': return `Running: ${String(input.command || '').slice(0, 40)}`
      case 'Grep': return `Searching "${String(input.pattern || '').slice(0, 30)}"`
      case 'Glob': return `Finding files`
      default: return name
    }
  }

  private send(channel: string, data: unknown) {
    try {
      this.win?.webContents.send(channel, data)
    } catch {}
  }
}
