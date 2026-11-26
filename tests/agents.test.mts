// Run: node --test tests/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  parseFrontmatter, parseModel, agentFromMarkdown, loadAgents, resolveTools,
  buildCliAgents, buildCliArgs, planRun, BUILTIN_AGENTS, EXAMPLE_AGENT,
} from '../electron/agents.ts'

test('frontmatter: scalars, nested maps and block text', () => {
  const { data, body } = parseFrontmatter(`---\r\ndescription: "Hi: there"\r\nsteps: 4\r\nhidden: true\r\npermissions:\r\n  edit: deny\r\n  shell: ask\r\nsystem: |\r\n  line one\r\n  line two\r\n---\r\nBody text\r\n`)
  assert.equal(data.description, 'Hi: there')
  assert.equal(data.steps, 4)
  assert.equal(data.hidden, true)
  assert.deepEqual(data.permissions, { edit: 'deny', shell: 'ask' })
  assert.equal(data.system, 'line one\nline two')
  assert.equal(body, 'Body text')
})

test('models: provider/model#variant, anthropic only', () => {
  assert.deepEqual(parseModel('anthropic/claude-opus-5-5#high'), { provider: 'anthropic', model: 'claude-opus-5-5', variant: 'high' })
  assert.deepEqual(parseModel('anthropic/haiku'), { provider: 'anthropic', model: 'haiku', variant: undefined })
  assert.throws(() => parseModel('openai/gpt-5'), /not available/)
  assert.throws(() => parseModel('claude-opus-5-5'), /provider\/model/)
  assert.throws(() => parseModel('anthropic/sonnet#turbo'), /Variant/)
})

test('opencode legacy agent files load unchanged', () => {
  const a = agentFromMarkdown('docs-writer', `---
description: Writes docs
mode: subagent
model: anthropic/sonnet
temperature: 0.1
tools:
  write: true
  bash: false
permission:
  webfetch: deny
---
Write good docs.`, 'global')
  assert.equal(a.mode, 'subagent')
  assert.equal(a.prompt, 'Write good docs.')
  assert.deepEqual(a.permissions, { edit: 'allow', shell: 'deny', webfetch: 'deny' })
  const { allowed, denied } = resolveTools(a)
  assert.ok(allowed.includes('Write') && allowed.includes('Read'))
  assert.ok(denied.includes('Bash') && denied.includes('WebFetch'))
  assert.ok(denied.includes('Agent'), 'subagents never spawn subagents')
})

test('invalid agent files are rejected with a reason', () => {
  assert.throws(() => agentFromMarkdown('x', '---\nmode: subagent\n---\nbody', 'global'), /description is required/)
  assert.throws(() => agentFromMarkdown('x', '---\ndescription: d\nmode: boss\n---\n', 'global'), /mode must be/)
  assert.throws(() => agentFromMarkdown('x', '---\ndescription: d\npermissions:\n  fly: allow\n---\n', 'global'), /Unknown permission/)
  assert.throws(() => agentFromMarkdown('x', '---\ndescription: d\nsteps: 0\n---\n', 'global'), /steps/)
  assert.throws(() => agentFromMarkdown('Bad Name', '---\ndescription: d\n---\n', 'global'), /Agent name/)
})

test('ask is enforced as deny in headless runs', () => {
  const a = agentFromMarkdown('x', '---\ndescription: d\npermissions:\n  shell: ask\n---\n', 'global')
  const r = resolveTools(a)
  assert.ok(r.denied.includes('Bash'))
  assert.equal(r.warnings.length, 1)
})

test('loadAgents: project overrides global overrides builtin; bad files reported', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vael-agents-'))
  const global = path.join(root, 'global')
  const project = path.join(root, 'project')
  fs.mkdirSync(path.join(global, 'team'), { recursive: true })
  fs.mkdirSync(project, { recursive: true })
  fs.writeFileSync(path.join(global, 'explore.md'), '---\ndescription: global explore\nmode: subagent\n---\nG')
  fs.writeFileSync(path.join(project, 'explore.md'), '---\ndescription: project explore\nmode: subagent\n---\nP')
  fs.writeFileSync(path.join(global, 'team', 'reviewer.md'), '---\ndescription: team reviewer\nmode: subagent\n---\nR')
  fs.writeFileSync(path.join(global, 'broken.md'), '---\nmode: subagent\n---\n')
  fs.writeFileSync(path.join(global, 'example-docs.md'), EXAMPLE_AGENT)
  try {
    const { agents, errors } = loadAgents({ global, project })
    const explore = agents.find((a) => a.id === 'explore')!
    assert.equal(explore.description, 'project explore')
    assert.equal(explore.source, 'project')
    assert.ok(agents.some((a) => a.id === 'team/reviewer'))
    assert.equal(errors.length, 1)
    assert.match(errors[0].file, /broken\.md$/)

    const cli = buildCliAgents(agents, 'PERSONA')
    assert.ok(cli['team-reviewer'], 'slashes become dashes for the CLI')
    assert.ok(!cli['example-docs'], 'disabled agents are left out')
    assert.ok(!cli.build && !cli.plan, 'primary agents are not subagents')
    assert.match(cli.explore.prompt, /PERSONA$/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('builtins: plan is read-only, explore is cheap and read-only', () => {
  const cli = buildCliAgents(BUILTIN_AGENTS)
  assert.deepEqual(Object.keys(cli).sort(), ['explore', 'general', 'research', 'review'])
  assert.equal(cli.explore.model, 'haiku')
  assert.deepEqual(cli.explore.tools, ['Read', 'Glob', 'Grep'])
  const plan = resolveTools(BUILTIN_AGENTS.find((a) => a.id === 'plan')!)
  assert.ok(plan.denied.includes('Edit') && plan.denied.includes('Bash'))
  assert.ok(plan.allowed.includes('Agent'))
})

test('planRun: primary choice, @mentions, unknown mentions pass through', () => {
  assert.equal(planRun(BUILTIN_AGENTS, 'plan', 'hi').agent.id, 'plan')
  assert.equal(planRun(BUILTIN_AGENTS, 'nope', 'hi').agent.id, 'build')
  assert.equal(planRun(BUILTIN_AGENTS, 'explore', 'hi').agent.id, 'build', 'a subagent cannot be the primary')

  const m = planRun(BUILTIN_AGENTS, 'build', '@explore find the router')
  assert.equal(m.cliAgent, 'explore')
  assert.equal(m.prompt, 'find the router')

  const p = planRun(BUILTIN_AGENTS, 'build', '@plan sketch it')
  assert.equal(p.agent.id, 'plan')
  assert.equal(p.cliAgent, undefined)

  const u = planRun(BUILTIN_AGENTS, 'build', '@someone hello')
  assert.equal(u.agent.id, 'build')
  assert.equal(u.prompt, '@someone hello')
})

test('buildCliArgs: model override, effort, tools and --agent', () => {
  const explore = planRun(BUILTIN_AGENTS, 'build', '@explore x')
  const args = buildCliArgs({ plan: explore, model: 'claude-opus-5-5', sysPromptFile: 's.md', agentsFile: 'a.json' })
  assert.equal(args[args.indexOf('--model') + 1], 'haiku')
  assert.equal(args[args.indexOf('--agent') + 1], 'explore')
  assert.equal(args[args.indexOf('--agents') + 1], 'a.json')
  assert.match(args[args.indexOf('--disallowed-tools') + 1], /Bash/)
  assert.deepEqual(args.slice(-2), ['--', 'x'])

  const custom = agentFromMarkdown('deep', '---\nmode: primary\nmodel: anthropic/claude-opus-5-5#max\n---\n', 'global')
  const a2 = buildCliArgs({ plan: { agent: custom, prompt: 'go' }, model: 'claude-sonnet-5-5', sysPromptFile: 's', agentsFile: 'a' })
  assert.equal(a2[a2.indexOf('--effort') + 1], 'max')
  assert.equal(a2[a2.indexOf('--model') + 1], 'claude-opus-5-5')
  assert.equal(a2.indexOf('--disallowed-tools'), -1)
})
