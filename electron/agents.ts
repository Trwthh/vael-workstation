// Agent registry modelled on OpenCode's agent system (opencode.ai/docs/agents):
// primary agents drive a session, subagents are delegated to by the primary
// (via Claude Code's Agent tool) or invoked directly with an @mention.
// Agents are markdown files with YAML frontmatter; the body is the prompt.
// The only provider is Anthropic through the Claude CLI (Max auth, no API keys).
import fs from 'fs'
import path from 'path'

export type AgentMode = 'primary' | 'subagent' | 'all'
export type Effect = 'allow' | 'ask' | 'deny'
export type PermissionAction = 'read' | 'glob' | 'grep' | 'edit' | 'shell' | 'webfetch' | 'websearch' | 'subagent'

export interface AgentDef {
  id: string
  description: string
  mode: AgentMode
  /** `provider/model#variant`, e.g. `anthropic/sonnet` or `anthropic/claude-opus-5-5#high` */
  model?: string
  prompt: string
  permissions: Partial<Record<PermissionAction, Effect>>
  steps?: number
  hidden: boolean
  disabled: boolean
  color?: string
  source: 'builtin' | 'global' | 'project'
  file?: string
}

export interface AgentInfo extends Omit<AgentDef, 'prompt'> {
  tools: string[]
  warnings: string[]
}

export interface LoadResult {
  agents: AgentDef[]
  errors: { file: string; error: string }[]
}

const ACTION_TOOLS: Record<PermissionAction, string[]> = {
  read: ['Read'],
  glob: ['Glob'],
  grep: ['Grep'],
  edit: ['Edit', 'Write', 'NotebookEdit'],
  shell: ['Bash', 'PowerShell'],
  webfetch: ['WebFetch'],
  websearch: ['WebSearch'],
  subagent: ['Agent'],
}
const ACTIONS = Object.keys(ACTION_TOOLS) as PermissionAction[]

// OpenCode's legacy `tools:` / `permission:` keys, so existing agent files work as-is.
const LEGACY_KEYS: Record<string, PermissionAction> = {
  read: 'read', glob: 'glob', grep: 'grep', list: 'glob',
  edit: 'edit', write: 'edit', patch: 'edit',
  bash: 'shell', shell: 'shell',
  webfetch: 'webfetch', websearch: 'websearch',
  task: 'subagent', subagent: 'subagent',
}

const SUPPORTED_PROVIDERS = new Set(['anthropic'])
const EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max'])
const ID_RE = /^[a-z0-9][a-z0-9_/-]*$/

export const BUILTIN_AGENTS: AgentDef[] = [
  {
    id: 'build',
    description: 'Default agent. Full tool access to research, build and verify.',
    mode: 'primary',
    prompt: '',
    permissions: {},
    hidden: false,
    disabled: false,
    source: 'builtin',
  },
  {
    id: 'plan',
    description: 'Analyse and plan without changing anything. File edits and shell commands are off.',
    mode: 'primary',
    prompt: [
      'You are in PLAN mode. Read, search and research only; do not create, edit or delete files and do not run commands.',
      'Delegate wide searches to the explore subagent and web lookups to the research subagent.',
      'Finish with a concrete plan: the files to change, the steps in order, the risks, and one runnable done check.',
    ].join('\n'),
    permissions: { edit: 'deny', shell: 'deny' },
    hidden: false,
    disabled: false,
    source: 'builtin',
  },
  {
    id: 'general',
    description: 'General-purpose subagent for multi-step research or implementation tasks that can run in parallel with the main agent.',
    mode: 'subagent',
    prompt: [
      'You are a general-purpose worker delegated a task by the lead agent.',
      'Do the task completely, verify it, and report back in a few lines: what you did, the evidence (command and output), and anything you could not verify.',
    ].join('\n'),
    permissions: {},
    hidden: false,
    disabled: false,
    source: 'builtin',
  },
  {
    id: 'explore',
    description: 'Fast read-only codebase search. Use to find files, symbols and patterns, or to answer questions about the code without editing it.',
    mode: 'subagent',
    model: 'anthropic/haiku',
    prompt: [
      'You are a fast, read-only search agent. Find what was asked using Glob, Grep and Read.',
      'Read excerpts, not whole files. Report file paths with line numbers and a one-line answer per question. Never guess; say when something was not found.',
    ].join('\n'),
    permissions: { edit: 'deny', shell: 'deny', webfetch: 'deny', websearch: 'deny' },
    hidden: false,
    disabled: false,
    source: 'builtin',
  },
  {
    id: 'research',
    description: 'Web research subagent. Use to look up current docs, APIs, project templates and working examples before building.',
    mode: 'subagent',
    model: 'anthropic/haiku',
    prompt: [
      'You are a research agent. Use WebSearch and WebFetch to find official documentation and real working examples.',
      'Report the facts that matter for the build (versions, file layout, entry points, exact API names) with a source URL for each. No speculation.',
    ].join('\n'),
    permissions: { edit: 'deny', shell: 'deny' },
    hidden: false,
    disabled: false,
    source: 'builtin',
  },
  {
    id: 'review',
    description: 'Code reviewer. Use after a non-trivial change to check correctness against the request and run the build or tests.',
    mode: 'subagent',
    model: 'anthropic/sonnet',
    prompt: [
      'You are a code reviewer with a clean context. Check the changed files against the task for correctness bugs, missing files and runtime failures, not style.',
      'Run the build or tests if they exist. Report each problem with file:line, why it breaks, and the fix. Do not edit files.',
    ].join('\n'),
    permissions: { edit: 'deny', webfetch: 'deny', websearch: 'deny' },
    hidden: false,
    disabled: false,
    source: 'builtin',
  },
]

/** Seeded into the agents folder so the format is discoverable. Disabled until edited. */
export const EXAMPLE_AGENT = `---
description: Writes and updates README and docs files. Use after a feature is finished.
mode: subagent
model: anthropic/haiku
disabled: true
permissions:
  shell: deny
  webfetch: deny
---
You write clear, short documentation for the project you are given.
Read the code first, then update README.md: what it is, how to build it, how to run it.
Set "disabled: false" above to turn this agent on.
`

// ── Frontmatter ──

type FmValue = string | number | boolean | Record<string, string | number | boolean>

function parseScalar(raw: string): string | number | boolean {
  const v = raw.trim()
  if (/^(['"]).*\1$/.test(v)) return v.slice(1, -1)
  if (v === 'true') return true
  if (v === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  return v
}

/** Minimal YAML frontmatter: scalars, `|` blocks and one level of nested maps. */
export function parseFrontmatter(src: string): { data: Record<string, FmValue>; body: string } {
  const text = src.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text)
  if (!m) return { data: {}, body: text.trim() }

  const data: Record<string, FmValue> = {}
  const lines = m[1].split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line)
    if (!kv) throw new Error(`Bad frontmatter line ${i + 2}: "${line.trim()}"`)
    const [, key, rest] = kv

    if (rest === '|' || rest === '>') {
      const block: string[] = []
      while (i + 1 < lines.length && (/^\s+/.test(lines[i + 1]) || !lines[i + 1].trim())) block.push(lines[++i].replace(/^\s{2}/, ''))
      data[key] = block.join(rest === '|' ? '\n' : ' ').trim()
    } else if (rest === '') {
      const map: Record<string, string | number | boolean> = {}
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
        const sub = /^\s+([\w*/-]+):\s*(.*)$/.exec(lines[++i])
        if (!sub) throw new Error(`Bad nested value under "${key}" on line ${i + 2}`)
        map[sub[1]] = parseScalar(sub[2])
      }
      data[key] = map
    } else {
      data[key] = parseScalar(rest)
    }
  }
  return { data, body: m[2].trim() }
}

// ── Models ──

export interface ModelRef {
  provider: string
  model: string
  variant?: string
}

export function parseModel(ref: string): ModelRef {
  const m = /^([a-z0-9-]+)\/([^#\s]+)(?:#(\w+))?$/i.exec(ref.trim())
  if (!m) throw new Error(`Model "${ref}" must look like provider/model or provider/model#variant`)
  const [, provider, model, variant] = m
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new Error(`Provider "${provider}" is not available. VAEL runs models through the Claude CLI, so use anthropic/<model>`)
  }
  if (variant && !EFFORTS.has(variant)) throw new Error(`Variant "#${variant}" must be one of: ${[...EFFORTS].join(', ')}`)
  return { provider, model, variant }
}

// ── Loading ──

function isEffect(v: unknown): v is Effect {
  return v === 'allow' || v === 'ask' || v === 'deny'
}

function toPermissions(data: Record<string, FmValue>): AgentDef['permissions'] {
  const perms: AgentDef['permissions'] = {}
  const legacyTools = data.tools
  if (legacyTools && typeof legacyTools === 'object') {
    for (const [k, v] of Object.entries(legacyTools)) {
      const action = LEGACY_KEYS[k.toLowerCase()]
      if (action && typeof v === 'boolean') perms[action] = v ? 'allow' : 'deny'
    }
  }
  for (const key of ['permission', 'permissions']) {
    const map = data[key]
    if (!map || typeof map !== 'object') continue
    for (const [k, v] of Object.entries(map)) {
      if (k === '*' && isEffect(v)) {
        for (const a of ACTIONS) perms[a] = v
        continue
      }
      const action = LEGACY_KEYS[k.toLowerCase()]
      if (!action) throw new Error(`Unknown permission "${k}". Use one of: ${ACTIONS.join(', ')}`)
      if (!isEffect(v)) throw new Error(`Permission "${k}" must be allow, ask or deny`)
      perms[action] = v
    }
  }
  return perms
}

export function agentFromMarkdown(id: string, src: string, source: AgentDef['source'], file?: string): AgentDef {
  if (!ID_RE.test(id)) throw new Error(`Agent name "${id}" may only use lowercase letters, digits, "-", "_" and "/"`)
  const { data, body } = parseFrontmatter(src)

  const mode = data.mode ?? 'all'
  if (mode !== 'primary' && mode !== 'subagent' && mode !== 'all') throw new Error(`mode must be primary, subagent or all (got "${mode}")`)

  const description = typeof data.description === 'string' ? data.description : ''
  if (!description && mode !== 'primary') throw new Error('description is required so the main agent knows when to use it')

  const model = typeof data.model === 'string' ? data.model : undefined
  if (model) parseModel(model)

  const stepsRaw = data.steps ?? data.maxSteps
  if (stepsRaw !== undefined && (typeof stepsRaw !== 'number' || !Number.isInteger(stepsRaw) || stepsRaw < 1)) {
    throw new Error('steps must be a positive whole number')
  }

  const prompt = body || (typeof data.system === 'string' ? data.system : '') || (typeof data.prompt === 'string' ? data.prompt : '')

  return {
    id,
    description,
    mode,
    model,
    prompt,
    permissions: toPermissions(data),
    steps: stepsRaw as number | undefined,
    hidden: data.hidden === true,
    disabled: data.disabled === true || data.disable === true,
    color: typeof data.color === 'string' ? data.color : undefined,
    source,
    file,
  }
}

function listMarkdown(dir: string): string[] {
  const out: string[] = []
  const walk = (d: string, depth: number) => {
    if (depth > 3) return
    let entries: fs.Dirent[]
    try { entries = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const full = path.join(d, e.name)
      if (e.isDirectory() && !e.name.startsWith('.')) walk(full, depth + 1)
      else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) out.push(full)
    }
  }
  walk(dir, 0)
  return out.sort()
}

/**
 * Built-ins, then global agents, then project agents. A later file with the same
 * id replaces the earlier agent, like OpenCode's config precedence.
 */
export function loadAgents(dirs: { global?: string; project?: string }): LoadResult {
  const byId = new Map<string, AgentDef>(BUILTIN_AGENTS.map((a) => [a.id, a]))
  const errors: LoadResult['errors'] = []

  for (const [source, dir] of [['global', dirs.global], ['project', dirs.project]] as const) {
    if (!dir) continue
    for (const file of listMarkdown(dir)) {
      const id = path.relative(dir, file).replace(/\\/g, '/').replace(/\.md$/i, '').toLowerCase()
      try {
        byId.set(id, agentFromMarkdown(id, fs.readFileSync(file, 'utf-8'), source, file))
      } catch (err) {
        errors.push({ file, error: (err as Error).message })
      }
    }
  }
  return { agents: [...byId.values()], errors }
}

// ── Claude CLI mapping ──

/** Claude CLI agent names can't contain "/", so `team/reviewer` becomes `team-reviewer`. */
export function cliName(id: string): string {
  return id.replace(/\//g, '-')
}

export function resolveTools(agent: AgentDef): { allowed: string[]; denied: string[]; warnings: string[] } {
  const allowed: string[] = []
  const denied: string[] = []
  const warnings: string[] = []
  for (const action of ACTIONS) {
    let effect = agent.permissions[action] ?? 'allow'
    if (effect === 'ask') {
      // Headless runs can't stop to ask, so "ask" is enforced as "deny".
      warnings.push(`${action}: ask is treated as deny in headless runs`)
      effect = 'deny'
    }
    if (action === 'subagent' && agent.mode === 'subagent') effect = 'deny'
    ;(effect === 'allow' ? allowed : denied).push(...ACTION_TOOLS[action])
  }
  return { allowed, denied, warnings }
}

export function describeAgent(agent: AgentDef): AgentInfo {
  const { prompt: _prompt, ...rest } = agent
  const { allowed, warnings } = resolveTools(agent)
  return { ...rest, tools: allowed, warnings }
}

export interface CliAgentDef {
  description: string
  prompt: string
  tools: string[]
  model?: string
  maxTurns?: number
}

/** The JSON passed to `claude --agents`: every enabled agent that can run as a subagent. */
export function buildCliAgents(agents: AgentDef[], sharedContext = ''): Record<string, CliAgentDef> {
  const out: Record<string, CliAgentDef> = {}
  for (const a of agents) {
    if (a.disabled || a.mode === 'primary') continue
    const def: CliAgentDef = {
      description: a.description,
      prompt: [a.prompt, sharedContext].filter(Boolean).join('\n\n'),
      tools: resolveTools(a).allowed,
    }
    if (a.model) def.model = parseModel(a.model).model
    if (a.steps) def.maxTurns = a.steps
    out[cliName(a.id)] = def
  }
  return out
}

export interface RunPlan {
  /** Agent whose prompt and permissions drive the session. */
  agent: AgentDef
  /** Set when the session itself runs as a subagent (`@explore ...`). */
  cliAgent?: string
  prompt: string
}

/** Resolves the session agent: an `@name` prefix picks that agent, otherwise the chosen primary. */
export function planRun(agents: AgentDef[], primaryId: string, prompt: string): RunPlan {
  const enabled = agents.filter((a) => !a.disabled)
  const mention = /^@([a-z0-9][a-z0-9_/-]*)\s+([\s\S]+)$/i.exec(prompt.trim())
  if (mention) {
    const target = enabled.find((a) => a.id === mention[1].toLowerCase())
    if (target) {
      return target.mode === 'primary'
        ? { agent: target, prompt: mention[2] }
        : { agent: target, cliAgent: cliName(target.id), prompt: mention[2] }
    }
  }
  const primary = enabled.find((a) => a.id === primaryId && a.mode !== 'subagent')
    ?? enabled.find((a) => a.id === 'build')
    ?? BUILTIN_AGENTS[0]
  return { agent: primary, prompt }
}

export interface CliArgsOpts {
  plan: RunPlan
  model: string
  sysPromptFile: string
  agentsFile: string
}

export function buildCliArgs({ plan, model, sysPromptFile, agentsFile }: CliArgsOpts): string[] {
  const { allowed, denied } = resolveTools(plan.agent)
  // An agent's own model wins over the session model, as in OpenCode.
  const ref = plan.agent.model ? parseModel(plan.agent.model) : null
  const args = [
    '-p',
    '--model', ref?.model ?? model,
    '--output-format', 'stream-json',
    '--verbose',
    '--append-system-prompt-file', sysPromptFile,
    '--agents', agentsFile,
  ]
  if (plan.cliAgent) args.push('--agent', plan.cliAgent)
  if (ref?.variant) args.push('--effort', ref.variant)
  if (allowed.length) args.push('--allowed-tools', allowed.join(' '))
  if (denied.length) args.push('--disallowed-tools', denied.join(' '))
  args.push('--', plan.prompt)
  return args
}
