import { spawn, type ChildProcess } from 'child_process'
import { app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'

const RE_WORK_DIR = path.join(app.getPath('userData'), 're-analysis')

const REA_SYSTEM_PROMPT = `You are the VAEL Reverse Engineering Agent — an AI assistant specialized in binary analysis, reverse engineering, and security research.

YOU HAVE ACCESS TO REA (rea-agents) — a powerful MCP toolset for reverse engineering that covers:
- Native binary analysis (via Ghidra, IDA, Hopper, or Kuna)
- JavaScript/Electron app inspection
- .NET assembly analysis
- Android APK analysis
- Website behavior analysis
- Firmware analysis

WORKFLOW:
1. When given a binary/file to analyze, use REA tools to inspect it
2. Provide structured findings: file type, architecture, strings, imports, functions of interest
3. For deeper analysis, use decompilation and disassembly views
4. Document all findings clearly with code blocks and annotations

RULES:
- Always state which tools and methods you used
- Include evidence (hex dumps, decompiled code, strings) for claims
- Note any limitations in your analysis
- For malware analysis, describe behavior without executing dangerous payloads
- Keep findings organized: Overview → Static Analysis → Dynamic Behavior → Conclusions`

export class ReaAgent {
  private proc: ChildProcess | null = null
  private win: BrowserWindow | null = null
  private aborted = false

  setWindow(win: BrowserWindow) {
    this.win = win
  }

  async run(prompt: string, model: string, targetPath?: string): Promise<void> {
    this.aborted = false

    const workDir = targetPath
      ? path.dirname(targetPath)
      : RE_WORK_DIR
    await fs.promises.mkdir(workDir, { recursive: true })

    const sysPromptFile = path.join(RE_WORK_DIR, '.vael-rea-prompt.md')
    await fs.promises.mkdir(RE_WORK_DIR, { recursive: true })
    await fs.promises.writeFile(sysPromptFile, REA_SYSTEM_PROMPT, 'utf-8')

    const mcpConfig = {
      mcpServers: {
        rea: {
          command: 'npx',
          args: ['-y', 'rea-agents@latest'],
        },
      },
    }
    const mcpConfigFile = path.join(RE_WORK_DIR, '.rea-mcp-config.json')
    await fs.promises.writeFile(mcpConfigFile, JSON.stringify(mcpConfig), 'utf-8')

    const env = { ...process.env }
    delete env.ANTHROPIC_API_KEY
    delete env.ANTHROPIC_AUTH_TOKEN

    const args = [
      '-p',
      '--model', model,
      '--output-format', 'stream-json',
      '--verbose',
      '--append-system-prompt-file', sysPromptFile,
      '--mcp-config', mcpConfigFile,
      '--allowed-tools', 'Bash Edit Write Read Glob Grep WebSearch WebFetch mcp__rea__*',
      '--',
      prompt,
    ]

    this.send('rea:status', { status: 'running' })

    this.proc = spawn('claude', args, {
      cwd: workDir,
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
                this.send('rea:activity', { tool: block.name, label })
              }
            }
            if (text.length > lastSentLen) {
              const delta = text.slice(lastSentLen)
              fullText = text
              lastSentLen = text.length
              this.send('rea:chunk', { delta })
            }
          }

          if (event.type === 'tool_use' || (event.type === 'content_block_start' && event.content_block?.type === 'tool_use')) {
            const block = event.content_block || event
            const label = this.describeToolUse(block.name, block.input || {})
            this.send('rea:activity', { tool: block.name, label })
          }

          if (event.type === 'result') {
            if (event.result && typeof event.result === 'string') {
              const remaining = event.result.slice(lastSentLen)
              if (remaining) this.send('rea:chunk', { delta: remaining })
              fullText = event.result
            }
            if (!this.aborted) {
              this.send('rea:done', { text: fullText })
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
          this.send('rea:error', { error: `REA agent exited with code ${code}` })
        }
        this.proc = null
        resolve()
      })
      this.proc?.on('error', (err) => {
        this.send('rea:error', { error: err.message })
        this.proc = null
        resolve()
      })
    })
  }

  cancel() {
    this.aborted = true
    if (this.proc) {
      this.proc.kill('SIGTERM')
      this.proc = null
    }
    this.send('rea:status', { status: 'cancelled' })
  }

  get isRunning() {
    return this.proc !== null
  }

  private describeToolUse(name: string, input: Record<string, unknown>): string {
    if (name.startsWith('mcp__rea__')) {
      const tool = name.replace('mcp__rea__', '')
      switch (tool) {
        case 'analyze_binary': return `Analyzing binary: ${this.basename(input.path as string)}`
        case 'disassemble': return `Disassembling ${this.basename(input.path as string)}`
        case 'decompile': return `Decompiling ${this.basename(input.path as string)}`
        case 'strings': return `Extracting strings`
        case 'imports': return `Listing imports`
        case 'exports': return `Listing exports`
        case 'inspect_js': return `Inspecting JavaScript`
        case 'inspect_dotnet': return `Inspecting .NET assembly`
        case 'inspect_apk': return `Analyzing APK`
        default: return `REA: ${tool}`
      }
    }
    switch (name) {
      case 'Read': return `Reading ${this.basename(input.file_path as string)}`
      case 'Write': return `Writing ${this.basename(input.file_path as string)}`
      case 'Bash': return `Running: ${String(input.command || '').slice(0, 40)}`
      case 'Grep': return `Searching "${String(input.pattern || '').slice(0, 30)}"`
      case 'Glob': return `Finding files`
      case 'WebSearch': return `Researching: ${String(input.query || '').slice(0, 40)}`
      case 'WebFetch': return `Reading web page`
      default: return name
    }
  }

  private basename(p: string | undefined): string {
    if (!p) return 'file'
    return p.replace(/\\/g, '/').split('/').pop() || 'file'
  }

  private send(channel: string, data: unknown) {
    try {
      this.win?.webContents.send(channel, data)
    } catch {}
  }
}
