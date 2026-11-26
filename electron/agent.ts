import { spawn, type ChildProcess } from 'child_process'
import { app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { loadAgents, describeAgent, planRun, buildCliAgents, buildCliArgs, resolveTools } from './agents'

const BUILDS_DIR = path.join(app.getPath('userData'), 'builds')

const REFUSAL_PATTERNS = [
  /i can'?t help with/i,
  /i'?m not able to/i,
  /i can'?t assist/i,
  /i must decline/i,
  /i won'?t (?:help|assist|create|build|make)/i,
  /(?:against|violates?) my (?:usage |)(?:guidelines|policies)/i,
  /i'?m unable to/i,
  /i cannot (?:help|assist|create|build|make)/i,
  /not something i can/i,
  /i can'?t (?:create|generate|write|produce|provide)/i,
  /outside (?:my|what)/i,
  /i'm not (?:going to|comfortable)/i,
  /unfortunately.*(?:can't|cannot|unable)/i,
  /i (?:need to |must )(?:decline|refuse)/i,
]

const HELPFUL_SIGNALS = [
  /tell me/i,
  /give me/i,
  /which (?:game|project|file)/i,
  /let me know/i,
  /here(?:'s| is) (?:what|how)/i,
  /i(?:'ll| will) (?:do|build|create|make|write|add|handle)/i,
  /```/,
  /\?$/m,
  /https?:\/\//,
  /step \d/i,
  /first,|next,|then,|finally,/i,
]

function isActualRefusal(text: string): boolean {
  const hasRefusal = REFUSAL_PATTERNS.some((p) => p.test(text))
  if (!hasRefusal) return false

  const helpfulCount = HELPFUL_SIGNALS.filter((p) => p.test(text)).length
  if (helpfulCount >= 2) return false

  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length > 8) return false

  return true
}

const ARTIFACT_EXTS = /\.(jar|exe|zip|apk|msi|dmg|app|wasm|dll|so)$/i

const AGENT_MODEL_CASCADE = [
  'claude-opus-5-5',
  'claude-sonnet-5-5',
  'claude-haiku-5-5',
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-opus-4-6',
]

export const GLOBAL_AGENTS_DIR = path.join(app.getPath('userData'), 'agents')

export interface AgentRunOpts {
  prompt: string
  model: string
  systemPrompt: string
  sessionId: string
  /** Primary agent id (`build`, `plan` or a custom primary). */
  agent?: string
  /** Appended to every subagent prompt, e.g. the active persona. */
  subagentContext?: string
  vaultDir?: string
}

export interface SubagentEvent {
  id: string
  agent: string
  description: string
  status: 'running' | 'done' | 'failed'
  activity?: string
  summary?: string
}

export function projectAgentsDir(sessionId: string): string {
  return path.join(BUILDS_DIR, sessionId, '.vael', 'agents')
}

export function listAgents(sessionId?: string) {
  const { agents, errors } = loadAgents({
    global: GLOBAL_AGENTS_DIR,
    project: sessionId ? projectAgentsDir(sessionId) : undefined,
  })
  return { agents: agents.map(describeAgent), errors }
}

export class AgentRunner {
  private proc: ChildProcess | null = null
  private win: BrowserWindow | null = null
  private aborted = false
  private lastOpts: AgentRunOpts | null = null
  private cycleIndex = 0

  setWindow(win: BrowserWindow) {
    this.win = win
  }

  async run(opts: AgentRunOpts): Promise<void> {
    const { prompt, model, systemPrompt, sessionId, vaultDir } = opts
    this.aborted = false
    this.lastOpts = opts
    this.cycleIndex = AGENT_MODEL_CASCADE.indexOf(model)
    if (this.cycleIndex === -1) this.cycleIndex = 0

    const workDir = path.join(BUILDS_DIR, sessionId)
    await fs.promises.mkdir(path.join(workDir, 'dist'), { recursive: true })

    const { agents, errors } = loadAgents({ global: GLOBAL_AGENTS_DIR, project: projectAgentsDir(sessionId) })
    for (const { file, error } of errors) {
      this.send('agent:activity', { tool: 'agents', label: `Skipped agent ${path.basename(file)}: ${error}` })
    }
    const plan = planRun(agents, opts.agent ?? 'build', prompt)

    // Load vault knowledge if available
    let vaultContext = ''
    if (vaultDir) {
      vaultContext = await this.loadVaultContext(vaultDir)
    }

    // System prompt and agent definitions go in files (too long for CLI args)
    const fullPrompt = [
      systemPrompt,
      plan.agent.prompt && !plan.cliAgent ? `--- ACTIVE AGENT: ${plan.agent.id} ---\n${plan.agent.prompt}` : '',
      vaultContext ? `--- VAULT KNOWLEDGE ---\n${vaultContext}` : '',
    ].filter(Boolean).join('\n\n')
    const sysPromptFile = path.join(workDir, '.vael-system-prompt.md')
    await fs.promises.writeFile(sysPromptFile, fullPrompt, 'utf-8')
    const agentsFile = path.join(workDir, '.vael-agents.json')
    await fs.promises.writeFile(agentsFile, JSON.stringify(buildCliAgents(agents, opts.subagentContext), null, 2), 'utf-8')

    // Strip API keys so it uses Max auth (keychain/OAuth)
    const env = { ...process.env }
    delete env.ANTHROPIC_API_KEY
    delete env.ANTHROPIC_AUTH_TOKEN

    const args = buildCliArgs({ plan, model, sysPromptFile, agentsFile })

    if (plan.cliAgent) this.send('agent:activity', { tool: 'Agent', label: `Running as @${plan.agent.id}` })
    this.send('agent:status', { status: 'running', model, agent: plan.agent.id })

    this.proc = spawn('claude', args, {
      cwd: workDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    // Background subagents make the CLI emit one `result` per main-agent turn,
    // so the run only finishes when the process exits.
    let fullText = ''
    let lastMessageId = ''
    let lastResult: { text: string; isError: boolean } | null = null
    let buffer = ''
    const subagents = new Map<string, SubagentEvent>()

    const updateSubagent = (id: string, patch: Partial<SubagentEvent>) => {
      const prev = subagents.get(id) ?? { id, agent: 'general', description: '', status: 'running' as const }
      const next = { ...prev, ...patch }
      subagents.set(id, next)
      this.send('agent:subagent', next)
    }

    const processLine = (line: string) => {
      if (!line.trim()) return
      let event: any
      try {
        event = JSON.parse(line)
      } catch {
        return // skip malformed lines
      }

      const parentId: string | null = event.parent_tool_use_id ?? null

      if (event.type === 'assistant' && Array.isArray(event.message?.content)) {
        for (const block of event.message.content) {
          if (block.type === 'tool_use') {
            if (block.name === 'Agent' || block.name === 'Task') {
              const input = block.input ?? {}
              const name = String(input.subagent_type || 'general')
              updateSubagent(block.id, { agent: name, description: String(input.description || ''), status: 'running' })
              this.send('agent:activity', { tool: 'Agent', label: `Delegating to @${name}: ${String(input.description || '').slice(0, 40)}` })
              continue
            }
            if (block.name === 'TodoWrite' && !parentId && Array.isArray(block.input?.todos)) {
              this.send('agent:tasks', block.input.todos.map((t: any) => ({
                text: String(t.content ?? ''),
                active: String(t.activeForm ?? t.content ?? ''),
                status: t.status === 'completed' || t.status === 'in_progress' ? t.status : 'pending',
              })))
            }
            const label = this.describeToolUse(block.name, block.input ?? {})
            if (parentId) {
              const sub = subagents.get(parentId)
              updateSubagent(parentId, { activity: label })
              this.send('agent:activity', { tool: block.name, label: `@${sub?.agent ?? 'agent'} · ${label}` })
            } else {
              this.send('agent:activity', { tool: block.name, label })
            }
          }
          // Subagent text goes back to the main agent, not into the chat.
          if (block.type === 'text' && block.text && !parentId) {
            const sep = fullText && event.message.id !== lastMessageId ? '\n\n' : ''
            lastMessageId = event.message.id
            fullText += sep + block.text
            this.send('agent:chunk', { delta: sep + block.text, model })
          }
        }
      }

      // Synchronous subagents finish when their Agent tool result comes back.
      if (event.type === 'user' && !parentId && Array.isArray(event.message?.content)) {
        for (const block of event.message.content) {
          const sub = block.type === 'tool_result' ? subagents.get(block.tool_use_id) : undefined
          if (!sub || sub.status !== 'running') continue
          const text = typeof block.content === 'string' ? block.content : JSON.stringify(block.content ?? '')
          if (block.is_error) updateSubagent(sub.id, { status: 'failed', summary: text.slice(0, 300) })
          else if (!/async agent launched/i.test(text)) updateSubagent(sub.id, { status: 'done' })
        }
      }

      if (event.type === 'system' && event.tool_use_id) {
        if (event.subtype === 'task_started') {
          updateSubagent(event.tool_use_id, { agent: event.subagent_type || 'general', description: event.description || '', status: 'running' })
        } else if (event.subtype === 'task_progress') {
          updateSubagent(event.tool_use_id, { activity: event.description })
        } else if (event.subtype === 'task_notification') {
          updateSubagent(event.tool_use_id, {
            status: event.status === 'completed' ? 'done' : 'failed',
            summary: typeof event.summary === 'string' ? event.summary.slice(0, 300) : undefined,
            activity: undefined,
          })
        }
      }

      if (event.type === 'result') {
        const text = typeof event.result === 'string' ? event.result : ''
        lastResult = { text, isError: !!event.is_error }
        // The result text normally repeats what was streamed; send it only if nothing was.
        if (text && !fullText) {
          fullText = text
          this.send('agent:chunk', { delta: text, model })
        }
      }
    }

    this.proc.stdout?.on('data', (chunk: Buffer) => {
      if (this.aborted) return
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) processLine(line)
    })

    let stderrBuf = ''
    this.proc.stderr?.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString()
    })

    return new Promise<void>((resolve) => {
      this.proc?.on('close', (code) => {
        // Flush any remaining buffered data
        if (buffer.trim()) processLine(buffer)
        buffer = ''

        this.proc = null
        if (this.aborted) return resolve()

        // Anything still marked running died with the process.
        for (const sub of subagents.values()) {
          if (sub.status === 'running') updateSubagent(sub.id, { status: 'failed', activity: undefined, summary: 'Stopped before it finished' })
        }

        const result = lastResult as { text: string; isError: boolean } | null
        // A read-only agent saying it can't write files is doing its job, not refusing.
        const readOnly = !resolveTools(plan.agent).allowed.includes('Edit')
        if (result && (result.isError || (!readOnly && isActualRefusal(result.text)))) {
          const nextModel = this.getNextCycleModel()
          if (nextModel) {
            this.send('agent:activity', { tool: 'cycle', label: `Model refused — cycling to ${nextModel.replace('claude-', '').replace(/-/g, ' ')}...` })
            this.runWithModel(nextModel, opts).catch(() => {})
          } else {
            this.send('agent:refusal', { model, text: result.text || fullText })
          }
        } else if (fullText) {
          const artifacts = this.scanArtifacts(workDir)
          this.send('agent:done', { text: fullText, model, artifacts, sessionDir: workDir })
        } else {
          const errMsg = stderrBuf.trim().split('\n').slice(-3).join('\n') || `Agent exited with code ${code}`
          this.send('agent:error', { error: errMsg, model })
        }
        resolve()
      })
      this.proc?.on('error', (err) => {
        const msg = err.message.includes('ENOENT')
          ? 'Claude CLI not found. Install it with: npm i -g @anthropic-ai/claude-code'
          : err.message
        this.send('agent:error', { error: msg, model })
        this.proc = null
        resolve()
      })
    })
  }

  private getNextCycleModel(): string | null {
    this.cycleIndex++
    if (this.cycleIndex >= AGENT_MODEL_CASCADE.length) return null
    return AGENT_MODEL_CASCADE[this.cycleIndex]
  }

  private async runWithModel(model: string, opts: AgentRunOpts): Promise<void> {
    // Re-run with a different model, same everything else
    await this.run({ ...opts, model })
  }

  cancel() {
    this.aborted = true
    if (this.proc) {
      this.proc.kill('SIGTERM')
      this.proc = null
    }
    this.send('agent:status', { status: 'cancelled' })
  }

  get isRunning() {
    return this.proc !== null
  }

  private describeToolUse(name: string, input: Record<string, unknown>): string {
    switch (name) {
      case 'Read': return `Reading ${this.basename(input.file_path as string)}`
      case 'Edit': return `Editing ${this.basename(input.file_path as string)}`
      case 'Write': return `Writing ${this.basename(input.file_path as string)}`
      case 'Bash': {
        const cmd = String(input.command || '').slice(0, 40)
        return cmd ? `Running: ${cmd}` : 'Running command'
      }
      case 'PowerShell': {
        const cmd = String(input.command || '').slice(0, 40)
        return cmd ? `Running: ${cmd}` : 'Running command'
      }
      case 'Grep': return `Searching "${String(input.pattern || '').slice(0, 30)}"`
      case 'Glob': return `Finding files`
      case 'TodoWrite': return 'Updating tasks'
      case 'WebSearch': return `Researching: ${String(input.query || '').slice(0, 40)}`
      case 'WebFetch': return `Reading web page`
      default: return name
    }
  }

  private basename(p: string | undefined): string {
    if (!p) return 'file'
    const parts = p.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] || 'file'
  }

  private send(channel: string, data: unknown) {
    try {
      this.win?.webContents.send(channel, data)
    } catch {
      // window might be destroyed
    }
  }

  private async loadVaultContext(vaultDir: string): Promise<string> {
    const sections: string[] = []
    const relevantPaths = [
      'Claude Workspace/VAEL Workstation Style.md',
      'Claude Workspace/Routing.md',
      'Claude Workspace/Skills and Agents.md',
      'Preferences.md',
    ]
    for (const rel of relevantPaths) {
      const full = path.join(vaultDir, rel)
      try {
        const content = await fs.promises.readFile(full, 'utf-8')
        if (content.length > 0 && content.length < 8000) {
          sections.push(`## ${rel}\n${content}`)
        } else if (content.length >= 8000) {
          sections.push(`## ${rel}\n${content.slice(0, 8000)}\n... (truncated)`)
        }
      } catch {
        // file doesn't exist, skip
      }
    }
    return sections.join('\n\n')
  }

  private scanArtifacts(dir: string): string[] {
    const results: string[] = []
    const scan = (d: string, depth = 0) => {
      if (depth > 3) return
      try {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
          const full = path.join(d, entry.name)
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            scan(full, depth + 1)
          } else if (entry.isFile() && ARTIFACT_EXTS.test(entry.name)) {
            results.push(full)
          }
        }
      } catch { /* skip unreadable dirs */ }
    }
    scan(path.join(dir, 'dist'))
    scan(path.join(dir, 'build'))
    scan(path.join(dir, 'out'))
    return results
  }
}
