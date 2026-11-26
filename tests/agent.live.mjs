// Live check of AgentRunner + subagents against the real Claude CLI (Max auth).
// Uses Haiku to keep it cheap. Run: node tests/agent.live.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const pnpmDir = path.join(root, 'node_modules', '.pnpm')
const esbuildDir = fs.readdirSync(pnpmDir).find((d) => d.startsWith('esbuild@'))
const esbuild = require(path.join(pnpmDir, esbuildDir, 'node_modules', 'esbuild'))

const data = fs.mkdtempSync(path.join(os.tmpdir(), 'vael-live-'))
process.env.VAEL_TEST_DATA = data
const bundle = path.join(data, 'agent.cjs')
esbuild.buildSync({
  entryPoints: [path.join(root, 'electron', 'agent.ts')],
  bundle: true, platform: 'node', format: 'cjs', outfile: bundle, logLevel: 'error',
  alias: { electron: path.join(root, 'tests', 'electron-stub.cjs') },
})
const { AgentRunner } = require(bundle)

const MODEL = 'claude-haiku-4-5-20251001'

async function run(name, opts) {
  const events = []
  const runner = new AgentRunner()
  runner.setWindow({ webContents: { send: (channel, payload) => events.push({ channel, payload }) } })
  const started = Date.now()
  await runner.run({ model: MODEL, systemPrompt: 'Be brief.', sessionId: name, ...opts })
  const of = (ch) => events.filter((e) => e.channel === ch).map((e) => e.payload)
  return {
    events, of,
    secs: ((Date.now() - started) / 1000).toFixed(0),
    dir: path.join(data, 'builds', name),
    final: of('agent:done')[0] ?? of('agent:error')[0] ?? of('agent:refusal')[0],
  }
}

const results = []
function check(name, ok, detail) {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}

// 1. Build agent delegates to the explore subagent.
{
  const r = await run('delegate', {
    agent: 'build',
    prompt: 'Create a file named marker.txt containing the word VAEL. Then use the explore subagent to find which files exist in the current folder, and reply with its answer.',
  })
  const subs = r.of('agent:subagent')
  // Final state per call; the model may retry a call, so any finished explore call counts.
  const calls = [...new Map(subs.map((s) => [s.id, s])).values()].filter((s) => s.agent === 'explore')
  check('build: delegates to @explore', calls.length > 0, `${calls.length} call(s)`)
  check('build: subagent finishes as done', calls.some((s) => s.status === 'done'), calls.map((s) => s.status).join(','))
  check('build: subagent tool use is reported', r.of('agent:activity').some((a) => a.label.startsWith('@explore')))
  check('build: run ends with agent:done', r.of('agent:done').length === 1, `${r.secs}s`)
  check('build: answer mentions marker.txt', /marker\.txt/i.test(r.final?.text ?? ''), (r.final?.text ?? r.final?.error ?? '').slice(0, 80).replace(/\n/g, ' '))
  check('build: agents file written', fs.existsSync(path.join(r.dir, '.vael-agents.json')))
}

// 2. Plan agent cannot edit.
{
  const r = await run('plan', {
    agent: 'plan',
    prompt: 'Create a file named should-not-exist.txt with any content. If you cannot, say so in one line.',
  })
  check('plan: no file written', !fs.existsSync(path.join(r.dir, 'should-not-exist.txt')))
  check('plan: run completes without a refusal cascade', r.of('agent:done').length === 1 && !r.of('agent:activity').some((a) => a.tool === 'cycle'), `${r.secs}s`)
}

// 3. @mention runs a subagent directly, with its own model and tools.
{
  fs.mkdirSync(path.join(data, 'builds', 'mention'), { recursive: true })
  fs.writeFileSync(path.join(data, 'builds', 'mention', 'hello.txt'), 'hi')
  const r = await run('mention', { agent: 'build', prompt: '@explore list the .txt files here' })
  check('@explore: runs as explore', r.of('agent:activity').some((a) => a.label === 'Running as @explore'))
  check('@explore: answers with hello.txt', /hello\.txt/.test(r.final?.text ?? ''), `${r.secs}s`)
}

// 4. A custom OpenCode-format agent in the project folder is picked up and used.
{
  const agentsDir = path.join(data, 'builds', 'custom', '.vael', 'agents')
  fs.mkdirSync(agentsDir, { recursive: true })
  fs.writeFileSync(path.join(agentsDir, 'counter.md'), `---
description: Counts the words in a sentence. Use when asked to count words.
mode: subagent
model: anthropic/haiku
tools:
  write: false
  bash: false
---
Count the words in the sentence you are given. Reply with only the number.`)
  const r = await run('custom', {
    agent: 'build',
    prompt: 'Use the counter subagent to count the words in: "the quick brown fox jumps". Reply with its number only.',
  })
  const used = r.of('agent:subagent').some((s) => s.agent === 'counter')
  check('custom: project agent is delegated to', used)
  check('custom: correct answer', /\b5\b/.test(r.final?.text ?? ''), (r.final?.text ?? '').slice(0, 40))
}

try { fs.rmSync(data, { recursive: true, force: true }) } catch { /* Windows may still hold a handle; it's in %TEMP% */ }
const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
