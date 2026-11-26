# VAEL Workstation — Complete Build Prompt

Build the Windows desktop app **VAEL Workstation** from scratch. This document is a complete technical specification taken from the working source (v0.1.4). Follow the names, channels, tokens, schemas, and patterns exactly.

> **For your friend:** This prompt tells an AI assistant (or a developer) everything needed to recreate the entire app. Start at Section 1, work through in order. Each section builds on the last.

---

## 1. Project Overview

VAEL Workstation is a **frameless Electron 33 desktop app** — an "Advanced Autonomous AI Engineering Workstation". It wraps the locally installed **Claude CLI** (`claude` command, authenticated via Claude Max subscription) in a polished desktop UI with multiple specialized AI agents.

### What it does

- **Main Agent** — Multi-session chat that builds software in per-session work directories, with subagents, a todo list, and artifact detection (finds .jar/.exe/.zip/.apk files in build output).
- **Search Agent** — AI-powered web research with query rewriting, model cascade, self-learning from past searches, trust-ranked links, and an embedded ad-blocking browser.
- **Reverse Engineering Agent** — Binary analysis via REA MCP tools (Ghidra, IDA, .NET, APK inspection).
- **Support Agent** — Self-repair: reads the app's own source, fixes bugs, rebuilds, and restarts.
- **Dashboard** — Landing page with rotating placeholder text, suggestion cards, quick-start prompts.
- **Additional pages** — Personas, code editor (Monaco), game modding, cybersecurity, settings, and more.
- **Local persistence** — SQLite database for sessions, messages, search memory, site trust scores, agent learnings, prompt versions, and test results.
- **Auto-updates** — electron-updater with a generic provider hosted on Vercel.
- **Themes** — Four dark themes (Midnight, Noir, Ocean, Dusk) with ambient color tokens.

### Authentication — Claude Max by Default, Optional API Key

**Default mode (no API keys):** The app authenticates through the Claude CLI's built-in OAuth/keychain auth (Claude Max subscription). Every agent spawn explicitly strips API keys from the child environment:

```typescript
const env = { ...process.env }
delete env.ANTHROPIC_API_KEY
delete env.ANTHROPIC_AUTH_TOKEN
```

**Optional API key mode:** If the user wants to use their own API key instead of Claude Max:
1. Add a Settings page field for `ANTHROPIC_API_KEY`.
2. Store it in the SQLite `user_profile` table (key: `apiKey`).
3. When spawning agents, if the user has set an API key, pass it in the child env instead of deleting it:
```typescript
const env = { ...process.env }
const userKey = getUserApiKey() // from db
if (userKey) {
  env.ANTHROPIC_API_KEY = userKey
} else {
  delete env.ANTHROPIC_API_KEY
  delete env.ANTHROPIC_AUTH_TOKEN
}
```
4. The AI status check (`ai:check` IPC) should detect both CLI auth and API key auth.

The app works fully without any API key — that's the default. The API key field is an optional power-user feature.

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Shell | Electron | ^33.2.0 |
| Frontend | React | ^18.3.1 |
| Bundler | Vite + vite-plugin-electron | ^6.0.0 / ^0.28.8 |
| Styling | Tailwind CSS | ^3.4.15 |
| State | Zustand | ^5.0.0 |
| Animation | Framer Motion | ^11.11.0 |
| Icons | Lucide React | ^0.460.0 |
| Code Editor | @monaco-editor/react | ^4.6.0 |
| Database | better-sqlite3 | ^11.6.0 |
| Updates | electron-updater | ^6.8.11 |
| Build | electron-builder | ^25.1.8 |
| AI | Claude CLI (npm: `@anthropic-ai/claude-code`) | latest |

**Package manager:** pnpm (workspace config: `pnpm-workspace.yaml`, `.npmrc`).

**Package name:** `vael-workstation`, main entry: `dist-electron/main.js`.

---

## 3. Project Structure

```
vael-workstation/
├── electron/                  # Main process (TypeScript, compiled to dist-electron/)
│   ├── main.ts                # App lifecycle, IPC handlers, window, ad blocker, updater
│   ├── agent.ts               # AgentRunner class — spawns Claude CLI for builds
│   ├── agents.ts              # Agent registry — markdown frontmatter parser, CLI mapping
│   ├── search-agent.ts        # SearchAgent class — web research with cascade
│   ├── support-agent.ts       # SupportAgent class — self-repair
│   ├── rea-agent.ts           # ReaAgent class — reverse engineering
│   ├── preload.ts             # contextBridge IPC — the ONLY bridge between main↔renderer
│   └── db.ts                  # SQLite database — all tables, queries, seed data
├── src/                       # Renderer process (React, compiled to dist/)
│   ├── main.tsx               # React entry point
│   ├── App.tsx                # Root component with routing
│   ├── vite-env.d.ts          # Window.electronAPI type declarations (THIS is what tsc uses)
│   ├── pages/
│   │   ├── Dashboard.tsx       # Landing page with suggestions and rotating text
│   │   ├── MainAgent.tsx       # Chat UI — messages, streaming, personas, subagents
│   │   ├── Search.tsx          # Search page with browser panel, tabs, results
│   │   └── ...                 # Other pages (code editor, settings, etc.)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx      # Main layout with sidebar and content area
│   │   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   │   └── WindowControls.tsx  # Custom title bar buttons (minimize/maximize/close)
│   │   ├── browser/
│   │   │   └── BrowserPanel.tsx    # Embedded webview browser with tabs
│   │   ├── agent/
│   │   │   ├── LiveActivity.tsx    # Real-time tool use display
│   │   │   ├── Subagents.tsx       # Agent mode switch and @mention menu
│   │   │   └── PreviewPanel.tsx    # File preview for artifacts
│   │   └── ui/
│   │       ├── Markdown.tsx    # Markdown renderer
│   │       ├── ContextMenu.tsx # Right-click context menu
│   │       ├── VaelLogo.tsx    # VAEL brand mark (inverted triangle)
│   │       └── Attach.tsx      # File attachment UI
│   ├── stores/
│   │   ├── app.ts             # App state: pages, sessions, themes, profile
│   │   ├── agent.ts           # Agent config, model cascade, instructions
│   │   ├── messages.ts        # Message store with persistence
│   │   └── style.ts           # Style learning store
│   └── styles/
│       └── index.css          # Tailwind imports + custom styles
├── build/                     # Electron-builder resources (icons, installer.nsh)
├── scripts/
│   └── release.ps1            # PowerShell release script
├── updates-site/              # Vercel-hosted update server files
├── tests/                     # Agent system tests
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

### Critical: Type Declaration Files

The `tsconfig.json` includes only `src/` for the renderer build. This means:
- **`src/vite-env.d.ts`** is the type declaration file that tsc actually uses for `Window.electronAPI`.
- `electron/preload.ts` has its own `declare global` block but it's NOT seen by the renderer build.
- **Both files must stay in sync.** When you add an IPC channel in preload.ts, also add the type in `src/vite-env.d.ts`.

---

## 4. Electron Main Process (`electron/main.ts`)

### Window Creation

```typescript
mainWindow = new BrowserWindow({
  width: 1440, height: 900,
  minWidth: 1024, minHeight: 640,
  frame: false,              // Frameless — custom title bar
  backgroundColor: '#0f0f11',
  show: false,               // Show after ready-to-show
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    nodeIntegration: false,
    contextIsolation: true,
    webviewTag: true,        // For embedded browser
  },
})
// Show inactive so it doesn't steal focus
mainWindow.once('ready-to-show', () => mainWindow?.showInactive())
```

### IPC Handlers — Complete List

Every feature communicates through `ipcMain.handle()` / `ipcMain.on()`. Here's every channel:

**Window controls:**
- `window:minimize` / `window:maximize` / `window:close` (on)
- `window:isMaximized` (handle → boolean)

**Main Agent:**
- `agent:run` (handle) — takes `AgentRunOpts`, cancels previous, starts `AgentRunner.run()`
- `agent:cancel` (handle) — kills running agent
- `agents:list` (handle) — returns loaded agents from global + project dirs
- `agents:openDir` (handle) — opens agents folder in explorer, seeds example agent
- `agent:openDir` (handle) — opens any directory
- `shell:showItemInFolder` (handle) — reveals file in explorer

**Support Agent:**
- `support:run` / `support:cancel` / `support:rebuild` / `support:restart` / `support:sourceDir`

**REA Agent:**
- `rea:run` / `rea:cancel`

**Search Agent:**
- `search-agent:run` — accepts query, optional model, optional images (base64 → temp files)
- `search-agent:followup` — continues a search conversation
- `search-agent:cancel` / `search-agent:clicked` / `search-agent:stats`

**Database:**
- `db:loadSessions` / `db:upsertSession` / `db:deleteSession` / `db:renameSession`
- `db:loadMessages` / `db:saveMessage` / `db:deleteMessage` / `db:clearMessages`

**Profile:**
- `profile:get` / `profile:set`

**Brain (search intelligence):**
- `brain:logSearch` / `brain:findSimilar` / `brain:searchHistory`
- `brain:getSite` / `brain:updateSite` / `brain:topSites`
- `brain:logDownload` / `brain:downloadHistory` / `brain:rankedSites`
- `brain:savePrompt` / `brain:getActivePrompt` / `brain:getPromptHistory` / `brain:rollbackPrompt`
- `brain:logTest` / `brain:getTestResults` / `brain:getTestStats`
- `brain:logImprovement` / `brain:getImprovements`

**Updater:**
- `updater:check` / `updater:download` / `updater:install` / `updater:getVersion`

**AI Status:**
- `ai:status` — returns cached status
- `ai:check` — runs `claude --version`, updates cached status, emits `ai:statusUpdate`

**Vault:**
- `vault:appendStyle` — appends style learning to a vault note file (safe: validates word format, truncates quote)

### Ad Blocker

The embedded browser uses a partitioned session (`persist:vael-browser`) with:
- A randomized User-Agent from a pool of 4 real browser strings
- Request blocking for ~100 ad/tracking domains
- Path-based ad blocking (`/ads/`, `/tracking/`, `/analytics/`, etc.)
- Download handling with progress events back to the renderer

```typescript
function setupBrowserSession() {
  const browserSess = session.fromPartition('persist:vael-browser')
  browserSess.setUserAgent(randomUA)
  browserSess.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    // Block known ad domains and ad-like paths
  })
  browserSess.on('will-download', /* progress events */)
}
```

### Auto-Updater

```typescript
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true
// Checks every 4 hours, first check 8s after launch
// Events: update-available, download-progress, update-downloaded, error
// Manual check flag suppresses error noise for background checks
```

The update server is a **generic provider** at `https://updates.trwhub.com/vael-workstation` (hosted on Vercel). It serves `latest.yml` and the NSIS installer `.exe`.

---

## 5. IPC Bridge (`electron/preload.ts`)

The preload script uses `contextBridge.exposeInMainWorld('electronAPI', { ... })` to create a typed API surface. The renderer accesses everything through `window.electronAPI`.

**Key pattern:** Every IPC listener returns an unsubscribe function:

```typescript
onChunk: (cb) => {
  const handler = (_: unknown, data) => cb(data)
  ipcRenderer.on('agent:chunk', handler)
  return () => ipcRenderer.removeListener('agent:chunk', handler)
}
```

**API namespaces on `window.electronAPI`:**
- `window` — minimize, maximize, close, isMaximized
- `vault` — appendStyle
- `agent` — run, cancel, listAgents, openAgentsDir, on* (Chunk, Done, Refusal, Error, Status, Activity, Tasks, Subagent)
- `support` — run, cancel, rebuild, restart, sourceDir, on* (Chunk, Done, Error, Status, Activity)
- `rea` — run, cancel, on* (Chunk, Done, Error, Status, Activity)
- `searchAgent` — run, followUp, cancel, clicked, stats, on* (Chunk, Done, Error, Status, Activity, Refusal, Clear, Links)
- `ai` — status, check, onStatusUpdate
- `profile` — get, set
- `browser` — onDownloadStart, onDownloadProgress, onDownloadDone
- `db` — loadSessions, upsertSession, deleteSession, renameSession, loadMessages, saveMessage, deleteMessage, clearMessages
- `brain` — logSearch, findSimilar, searchHistory, getSite, updateSite, topSites, logDownload, downloadHistory, rankedSites, savePrompt, getActivePrompt, getPromptHistory, rollbackPrompt, logTest, getTestResults, getTestStats, logImprovement, getImprovements
- `updater` — check, download, install, getVersion, on* (Available, NotAvailable, Progress, Downloaded, Error)

---

## 6. Agent System (`electron/agent.ts` + `electron/agents.ts`)

### 6.1 Agent Registry (agents.ts)

Agents are **markdown files with YAML frontmatter**. The body is the system prompt. Format:

```markdown
---
description: What this agent does (required for subagents)
mode: primary | subagent | all
model: anthropic/haiku          # optional, provider/model#variant
permissions:
  edit: deny
  shell: deny
disabled: false
---
Your system prompt here.
```

**Frontmatter fields:**
- `mode` — `primary` (drives a session), `subagent` (delegated to), `all` (either)
- `model` — `anthropic/<model>#<effort>` (e.g. `anthropic/sonnet`, `anthropic/claude-opus-5-5#high`)
- `permissions` — per-action: `allow`, `ask`, `deny`. Actions: read, glob, grep, edit, shell, webfetch, websearch, subagent
- `steps` — max turns for the agent
- `hidden`, `disabled`, `color`

**Permission → Tool mapping:**
```
read → Read
glob → Glob
grep → Grep
edit → Edit, Write, NotebookEdit
shell → Bash, PowerShell
webfetch → WebFetch
websearch → WebSearch
subagent → Agent
```

**Built-in agents:**

| ID | Mode | Model | Description |
|----|------|-------|-------------|
| `build` | primary | (session default) | Full tool access — research, build, verify |
| `plan` | primary | (session default) | Read-only analysis and planning (edit+shell denied) |
| `general` | subagent | (default) | Multi-step worker for parallel tasks |
| `explore` | subagent | haiku | Fast read-only codebase search |
| `research` | subagent | haiku | Web research — docs, APIs, examples |
| `review` | subagent | sonnet | Code reviewer — correctness, not style |

**Loading order:** Built-ins → Global agents dir → Project agents dir. Later files with the same ID replace earlier ones.

**Agent files location:**
- Global: `{userData}/agents/` (seeded with `example-docs.md`)
- Project: `{userData}/builds/{sessionId}/.vael/agents/`

### 6.2 AgentRunner (agent.ts)

The core class that spawns Claude CLI processes.

**How a run works:**

1. Create the work directory: `{userData}/builds/{sessionId}/dist/`
2. Load agents from global + project dirs
3. Plan the run: resolve `@mention` prefix or use the default primary agent
4. Load vault context (reads specific vault files for style/knowledge)
5. Write the full system prompt to `.vael-system-prompt.md`
6. Write agent definitions to `.vael-agents.json`
7. **Strip API keys** from child env
8. Build CLI args and spawn `claude` with `--output-format stream-json`

**CLI args construction:**

```typescript
const args = [
  '-p',                           // print mode (non-interactive)
  '--model', model,
  '--output-format', 'stream-json',
  '--verbose',
  '--append-system-prompt-file', sysPromptFile,
  '--agents', agentsFile,
  // Optional: --agent <name> (if running as a specific agent via @mention)
  // Optional: --effort <variant>
  '--allowed-tools', 'Read Edit Write Bash ...',
  '--disallowed-tools', '...',
  '--', prompt
]
```

**Stream parsing:** The process stdout emits newline-delimited JSON events:

- `type: "assistant"` with `message.content[]` blocks:
  - `tool_use` blocks → activity labels, subagent tracking, todo list updates
  - `text` blocks → streamed to renderer via `agent:chunk` IPC
- `type: "user"` with tool results → marks subagents as done/failed
- `type: "system"` with task lifecycle events
- `type: "result"` → final output

**Subagent tracking:** When the CLI creates an Agent/Task tool use, the runner tracks it in a Map. It emits `agent:subagent` events to show subagent status in the UI (running/done/failed with activity labels).

**Vault context loading:** Reads up to 4 specific vault files (style guide, routing, skills, preferences) and injects them into the system prompt under `--- VAULT KNOWLEDGE ---`.

**Artifact scanning:** After completion, scans `dist/`, `build/`, `out/` (3 levels deep) for files matching `.jar|.exe|.zip|.apk|.msi|.dmg|.app|.wasm|.dll|.so`.

### 6.3 Refusal Detection and Model Cascade

**Refusal patterns** — 14 regex patterns that detect model refusals:
```typescript
const REFUSAL_PATTERNS = [
  /i can'?t help with/i,
  /i'?m not able to/i,
  /(?:against|violates?) my (?:usage |)(?:guidelines|policies)/i,
  // ... 11 more
]
```

**Helpful signals** — 11 patterns that indicate the response is actually helpful despite matching a refusal pattern:
```typescript
const HELPFUL_SIGNALS = [
  /tell me/i, /give me/i, /here(?:'s| is) (?:what|how)/i,
  /i(?:'ll| will) (?:do|build|create)/i, /```/, /https?:\/\//,
  // ... 5 more
]
```

**`isActualRefusal(text)`:** Returns true only if:
1. At least one refusal pattern matches, AND
2. Fewer than 2 helpful signals match, AND
3. The response is 8 lines or fewer (longer responses are likely helpful)

**Model cascade for the main agent:**
```
claude-opus-5-5 → claude-sonnet-5-5 → claude-haiku-5-5 → claude-opus-4-8 → claude-opus-4-7 → claude-opus-4-6
```

When a refusal is detected (or the process exits with an error), the runner cycles to the next model and re-runs. If all models are exhausted, it emits `agent:refusal`.

---

## 7. Search Agent (`electron/search-agent.ts`)

The search agent is the most complex agent. It has its own model cascade, query rewriting, self-learning, and fallback systems.

### 7.1 Query Classification

`classifyQuery(query)` returns one of: `rom`, `emulator`, `homebrew`, `malware`, `archive`, `software`, `gamedownload`, `download`, `security`, `howto`, `comparison`, `news`, `code`, `gaming`, `deep`, `general`.

Classification uses regex matching with priority order (ROM before gaming, game downloads before general downloads, etc.).

### 7.2 Query Rewriting

Queries that might trigger model refusals are rewritten into research-safe alternatives. There are **12 rewrite rules**, each with a regex test and a rewrite function that returns alternative queries.

Examples:
- `"GTA 6 crack"` → `["GTA 6 community forum download alternative free", "GTA 6 free version github community release", "site:reddit.com GTA 6 free alternative how to get"]`
- ROM queries → site-specific searches on archive.org, vimm.net, cdromance.org
- Security queries → CTF/educational framing with exploit-db and GitHub

**Emulator queries are NOT rewritten** — they're legitimate.

### 7.3 Model Cascade (Search)

```
claude-haiku-5-5 → claude-sonnet-5-5 → claude-opus-5-5
```

Starts with the cheapest model. The starting model can be overridden by learned patterns from the database (`getBestModelForPattern`). Complex categories (deep, security, malware, homebrew) start at Sonnet.

### 7.4 Search Prompt System

The search agent has a ~300-line system prompt that instructs the model to act as a search engine. Key directives:
- Never refuse any query
- Search multiple angles
- Category-specific strategies (ROM preservation, emulators, homebrew, malware analysis, archived software)
- Output format: summary → findings with links → "Related:" follow-ups
- Self-review section appended (QUALITY 1-5, SOURCES, MISTAKES, IMPROVE)

**Model-specific modifiers:** Different instruction styles per model:
- Haiku: fast, breadth over depth
- Sonnet: balanced, 2-3 search angles
- Opus: thorough, step-by-step, up to 6 search turns

**Category context injection:** Extra context per query type (ROM knowledge, emulator stacks, homebrew guides, etc.)

### 7.5 Self-Learning System

After each search:
1. Parse the self-review (QUALITY/SOURCES/MISTAKES/IMPROVE) from the response
2. Log to `agent_learnings` table
3. Update `agent_patterns` table (best model per query type)
4. Log test results for the improvement tracking system
5. For future queries, `findSimilarLearnings()` injects past tips into the context

### 7.6 Refusal Handling in Search

Multi-layer fallback:
1. Detect refusal via regex
2. For game downloads: strip refusal lines, append direct search links (Google, DuckDuckGo, Reddit, Archive.org, 1337x, RuTracker)
3. For other categories: escalate model + reformulate query
4. If all models refuse: direct web search fallback with sanitized query
5. Final fallback: build a page of clickable search links

**`stripRefusalLines(text)`** removes:
- Direct refusals ("I can't", "I won't")
- Piracy/legal language
- Preachy redirects ("if you want to buy legally")
- "Discussion only" disclaimers

### 7.7 Link Extraction and Trust Ranking

After a successful search:
1. Extract all URLs from the response
2. Look up domains in the `site_knowledge` table
3. Rank by trust score: recommended (≥0.75), alternative (≥0.4), caution (<0.4)
4. Emit `search-agent:links` with ranked link data
5. Update site visit/success counts

### 7.8 Site-Specific Search Strategies

Category → recommended sites mapping. 11 categories with curated domain lists:
- `rom`: archive.org, vimm.net, cdromance.org, myrient, romhacking.net
- `emulator`: emulation.gametechwiki.com, github.com, retroarch.com
- `homebrew`: gbatemp.net, 3ds.hacks.guide, switch.homebrew.guide
- `malware`: virustotal.com, malwarebazaar, hybrid-analysis.com
- `gamedownload`: reddit.com, archive.org, fitgirl-repacks.site
- etc.

---

## 8. Support Agent (`electron/support-agent.ts`)

Self-repair agent that can fix the app while it's running.

**System prompt** tells the agent:
- Project tech stack and key files
- Rules: fix the actual bug, minimal changes, update types in vite-env.d.ts, test with `npm run build`

**Allowed tools:** `Bash Edit Write Read Glob Grep`

**Workflow:**
1. User reports a bug via the support page
2. SupportAgent spawns Claude CLI pointing at the app's source directory
3. Agent reads source files, makes edits
4. After completion, `support:rebuild` runs `npm run build`
5. If build succeeds, `support:restart` calls `app.relaunch()` + `app.exit(0)`

---

## 9. Reverse Engineering Agent (`electron/rea-agent.ts`)

Binary analysis agent using REA MCP tools.

**MCP config** (written to `.rea-mcp-config.json`):
```json
{ "mcpServers": { "rea": { "command": "npx", "args": ["-y", "rea-agents@latest"] } } }
```

**Allowed tools:** `Bash Edit Write Read Glob Grep WebSearch WebFetch mcp__rea__*`

**REA tools described in activity labels:**
- `analyze_binary`, `disassemble`, `decompile`, `strings`, `imports`, `exports`
- `inspect_js`, `inspect_dotnet`, `inspect_apk`

---

## 10. Database Schema (`electron/db.ts`)

SQLite database at `{userData}/data/vael.db` with WAL mode.

### Tables

**Core:**
```sql
sessions (id TEXT PK, title TEXT, created_at INT, updated_at INT)
messages (id TEXT PK, session_id TEXT FK, role TEXT, content TEXT, model TEXT,
          verified INT, is_refusal INT, suggestions TEXT, attachments TEXT, ts INT)
user_profile (key TEXT PK, value TEXT)
```

**Search Intelligence:**
```sql
search_memory (id INT PK, query TEXT, engine TEXT, result_url TEXT, success INT,
               download_found INT, notes TEXT, ts INT)

site_knowledge (domain TEXT PK, trust_score REAL default 0.5, has_captcha INT,
                has_adwall INT, is_shortener INT, bypass_method TEXT,
                download_selector TEXT, visit_count INT, success_count INT,
                last_visit INT, notes TEXT)

agent_learnings (id INT PK, query TEXT, query_type TEXT, model_used TEXT,
                 escalated INT, result_quality INT, tokens_est INT,
                 response_summary TEXT, useful_sources TEXT, mistakes TEXT,
                 improvements TEXT, user_clicked INT, ts INT)

agent_patterns (id INT PK, pattern_type TEXT, pattern TEXT, best_model TEXT,
                avg_quality REAL, use_count INT, last_used INT)
                -- UNIQUE(pattern_type, pattern)
```

**Downloads:**
```sql
download_log (id INT PK, filename TEXT, url TEXT, source_domain TEXT,
              file_size INT, file_hash TEXT, safe INT, ts INT)
```

**Self-Improvement:**
```sql
prompt_versions (id INT PK, prompt_name TEXT, version INT, content TEXT,
                 model_target TEXT, avg_quality REAL, test_count INT,
                 active INT, notes TEXT, created_at INT)
                 -- UNIQUE(prompt_name, version)

test_results (id INT PK, test_name TEXT, category TEXT, query TEXT,
              model_used TEXT, prompt_version_id INT FK, result_type TEXT,
              was_refused INT, was_incomplete INT, quality_score INT,
              response_length INT, had_links INT, had_code INT,
              error_msg TEXT, notes TEXT, ts INT)

improvement_log (id INT PK, round INT, changes_made TEXT, before_avg_quality REAL,
                 after_avg_quality REAL, refusal_rate_before REAL,
                 refusal_rate_after REAL, notes TEXT, ts INT)
```

### Seed Data

`seedSiteReputation()` inserts ~40 domains with pre-set trust scores:
- Trusted (0.85-0.95): archive.org, github.com, pcgamingwiki.com, nexusmods.com, virustotal.com
- Community (0.80-0.90): reddit.com, gbatemp.net, vimm.net, steamrip.com, fitgirl-repacks.site
- Caution (0.15-0.45): ocean-of-games.com (0.20), igg-games.com (0.15), softonic.com (0.30)

### Key Query Functions

- `findSimilarLearnings(query)` — splits query into words, finds past learnings with quality ≥ 3
- `getBestModelForPattern(type, pattern)` — returns the best model for a pattern (requires ≥ 2 uses)
- `getAgentStats()` — 7-day stats: total searches, avg quality, escalation rate, top model
- `getActivePrompt(name)` — returns the active versioned prompt for runtime optimization
- `getRankedSites(domains)` — bulk trust score lookup

---

## 11. Frontend Architecture

### 11.1 State Management (Zustand Stores)

**`stores/app.ts` — App State:**
- Pages enum: dashboard, main-agent, search, supervisor, agent-manager, personas, code-editor, project-manager, game-modding, cybersecurity, reverse-engineering, obsidian-memory, model-manager, tool-integrations, terminal, task-queue, build-manager, support, settings
- Themes: midnight (default), noir, ocean, dusk — each with bg0, bg1, accent, accentAlt, ambient RGB values
- Sessions: load from DB, create/delete/rename, with demo sessions as fallback
- Profile: name, avatar, bio, email — synced to both localStorage and SQLite
- Startup animation options: shatter, pulse, glitch

**`stores/agent.ts` — Agent Config:**
- `primaryAgent`: 'build' or 'plan'
- `instructions`: the full ~170-line default system prompt (see Section 12)
- Feature flags: autoTest, suggestFeatures, goAboveAndBeyond, vaelBranding, animatedUI, enforcePersona, researchAgent, tokenOptimize
- `maxRefusals`: 2 (refusals before cascade)
- `modelCascade`: the 6-model cascade array
- Pending persona/prompt for session handoff

**`stores/messages.ts`:**
- Per-session message array with SQLite persistence
- Message type: id, role (user/assistant), content, model, verified, isRefusal, suggestions, attachments, ts

### 11.2 Layout System

**Layout.tsx:**
- Full-bleed pages (search, etc.) skip the Topbar, show floating WindowControls instead
- Floating WindowControls: `absolute top-0 right-0 z-30` div with `h-[52px]`
- Toolbars on full-bleed pages must have `pr-[140px]` right padding to clear the window controls

**WindowControls.tsx:**
- 3 buttons: minimize (Minus icon), maximize/restore (Square/restore SVG), close (X icon)
- Styling: `gap-0.5`, `px-2`, lucide icons size 10-13
- CSS class `win-ctrl-btn` for base style, `win-ctrl-close` for the close button (red hover)

**Sidebar.tsx:**
- Resizable width (200-420px range, default 260)
- Collapsible
- Session list with context menus (rename, delete)
- Navigation items for all pages

### 11.3 Design Tokens

```css
/* Backgrounds */
--bg-base: #0f0f11;
--bg-surface: #18181b;
--bg-elevated: #1e1e21;
--bg-overlay: #232326;

/* Text */
--fg-primary: #f5f5f7;
--fg-secondary: #e0e0e3;
--fg-muted: #a0a0a8;
--fg-subtle: #77777f;

/* Accent */
--accent: #e0e0e3;
--border: rgba(255, 255, 255, 0.06);
--glass: rgba(255, 255, 255, 0.04) + backdrop-blur(20px);

/* Radius */
--radius-card: 8px;
--radius-panel: 12px;
--radius-modal: 16px;

/* Font */
--font-ui: system-ui;
--font-code: 'Cascadia Code';

/* Animation */
--transition-hover: 200-300ms ease;
--fade-in: 300ms;
--scale-in: 200ms;
```

---

## 12. Default System Prompt

The `DEFAULT_INSTRUCTIONS` in `stores/agent.ts` is a ~170-line prompt that defines the agent's behavior. Key sections:

**Workflow phases:**
1. RESEARCH — mandatory before coding. Look up real docs, real project structures, real toolchains.
2. BUILD — complete real projects, not snippets. Use actual build tools. No stubs/TODOs.
3. VERIFY — compile, run, self-review for common mistakes. Loop until clean.

**Quality standard:**
- Go all out on every request
- Production quality: typed, validated, edge cases handled
- Add thoughtful extras without being asked
- Include VAEL mark in any UI
- Reply short: result first, then Done / Needs you / Next

**Style profile (learned from user):**
- Simple and calm, one accent color, macOS-style monochrome with glass
- Use real UI libraries (shadcn, Radix, Sonner, Vaul, cmdk, Magic UI)
- Sweat alignment, spacing, contrast

**Persona enforcement:** Always respond in character as the active persona.

**Humanized responses:** Write like a real senior dev — no "certainly", "I'd be happy to", "as an AI". Use contractions, short sentences, dry humor.

**Research agent:** Always research before building. Search for docs, templates, working examples.

**VAEL design tokens:** Injected into the prompt so agents use the right colors/spacing.

---

## 13. Personas System

The MainAgent page includes a personas system. Each persona has:
- `name` — display name (e.g. "C.C.", "Software Engineer", "Security Researcher", "Xbox Translator")
- `description` — one-line summary
- `context` — optional extended prompt injected into the system prompt

The active persona's context is appended to the agent's system prompt. The Xbox Translator persona includes a detailed multi-page context for GTA VI Xbox-to-PC translation work.

Persona enforcement means all responses stay in character, and subagents also receive the persona context via `subagentContext`.

---

## 14. Embedded Browser

**BrowserPanel.tsx** provides a tabbed webview browser:
- Multiple tabs with URL bar
- Uses `persist:vael-browser` partition (ad-blocked, randomized UA)
- Download events surfaced to the renderer
- Navigation controls (back, forward, reload, home)
- URL bar with `pr-[140px]` right padding for window controls

**Ad blocking:** ~100 ad domains blocked at the network level, plus path-based blocking for `/ads/`, `/tracking/`, etc.

---

## 15. Auto-Update System

**Server:** Generic provider on Vercel at `updates.trwhub.com/vael-workstation`.

**Flow:**
1. App checks every 4 hours (first check 8s after launch)
2. `updater:available` event → renderer shows update notification
3. User clicks download → `updater:download` → progress events
4. Download complete → `updater:downloaded` event
5. User clicks install → `autoUpdater.quitAndInstall(false, true)`

**Release script (`scripts/release.ps1`):**
1. Bump version in package.json
2. Build: `tsc && vite build`
3. Package: `electron-builder --win nsis portable`
4. Copy artifacts to updates-site/public/
5. Generate latest.yml
6. Deploy to Vercel: `vercel --prod`
7. Verify: fetch latest.yml from live URL

**electron-builder config in package.json:**
- NSIS: one-click install, desktop+start menu shortcuts, delete appdata on uninstall
- Portable: standalone exe
- Icon: `build/icon-valid.ico`

---

## 16. How to Build From Scratch

### Step 1: Initialize

```bash
mkdir vael-workstation && cd vael-workstation
pnpm init
# Install all deps from Section 2
pnpm add react react-dom zustand framer-motion lucide-react @monaco-editor/react better-sqlite3 electron-updater
pnpm add -D electron electron-builder vite vite-plugin-electron vite-plugin-electron-renderer @vitejs/plugin-react typescript tailwindcss postcss autoprefixer @types/react @types/react-dom @types/better-sqlite3
```

### Step 2: Configure

Create `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`. The vite config must use `vite-plugin-electron` to build the main process alongside the renderer.

### Step 3: Build the Main Process

1. `electron/db.ts` — all tables, seed data, query functions
2. `electron/agents.ts` — agent registry, frontmatter parser, CLI mapping
3. `electron/agent.ts` — AgentRunner with stream parsing, refusal detection, model cascade
4. `electron/search-agent.ts` — full search agent with rewriting, classification, learning
5. `electron/support-agent.ts` — self-repair agent
6. `electron/rea-agent.ts` — RE agent with MCP config
7. `electron/preload.ts` — full IPC bridge
8. `electron/main.ts` — window creation, all IPC handlers, ad blocker, updater

### Step 4: Build the Renderer

1. Stores first: `app.ts`, `agent.ts`, `messages.ts`, `style.ts`
2. Layout: `Layout.tsx`, `Sidebar.tsx`, `WindowControls.tsx`
3. UI components: `Markdown.tsx`, `ContextMenu.tsx`, `VaelLogo.tsx`, `Attach.tsx`
4. Agent components: `LiveActivity.tsx`, `Subagents.tsx`, `PreviewPanel.tsx`
5. Browser: `BrowserPanel.tsx`
6. Pages: `Dashboard.tsx`, `MainAgent.tsx`, `Search.tsx`, then remaining pages
7. Type declarations: `src/vite-env.d.ts` matching preload.ts exactly

### Step 5: Package

```bash
pnpm run build        # tsc + vite build
pnpm run package      # electron-builder → NSIS installer + portable
```

### Step 6: Set Up Updates

1. Create a Vercel project for the update server
2. Configure `vercel.json` with CORS headers for yml/exe files
3. Run `scripts/release.ps1` to build, package, and deploy

---

## 17. Key Implementation Details

### Message Streaming

The agent sends `agent:chunk` events with `{ delta, model }`. The renderer appends deltas to build the full response. On `agent:done`, the full text, model, artifacts list, and session directory are sent.

### Session Management

Each agent run gets a work directory at `{userData}/builds/{sessionId}/`. The session ID is `session-{timestamp}`. Sessions are persisted in SQLite with title, created_at, updated_at. Messages are stored per-session.

### @Mention System

Users can type `@explore find all test files` in the chat. The `planRun()` function:
1. Checks for `@name` prefix in the prompt
2. If found and the agent exists: runs that agent (as a subagent if its mode is "subagent")
3. Otherwise: uses the selected primary agent (build or plan)

### Style Learning

The vault has a style learning system. When the user describes their aesthetic preferences, the agent calls `vault:appendStyle` to append style words to a vault file. These are loaded into future agent prompts.

### Prompt Versioning

The database supports versioned prompts (`prompt_versions` table). The search agent checks for a database-stored prompt before using the hardcoded one, allowing runtime prompt optimization without code changes.

### Todo List Integration

When the agent uses Claude's `TodoWrite` tool, the runner forwards the task list to the renderer via `agent:tasks`. Tasks have text, active form, and status (pending/in_progress/completed).

---

## 18. VAEL Branding

- **Logo:** Outlined inverted triangle with a center vertical line (the "VAEL mark"). Implemented in `VaelLogo.tsx`.
- **Color palette:** Monochrome dark with subtle accent. Base background #0f0f11.
- **Typography:** system-ui for interface, Cascadia Code for code blocks.
- **Window style:** Frameless, macOS-inspired with custom close/maximize/minimize buttons.
- **Brand footer:** "Built by VAEL" in the README and UI footer.

---

## 19. Testing

- **Unit tests:** `tests/agents.test.mts` — tests the agent registry (frontmatter parsing, permissions, model validation)
- **Live tests:** `tests/agent.live.mjs` — integration tests that actually spawn Claude CLI
- **Run:** `pnpm test` / `pnpm test:live`

---

## 20. Summary Checklist

Before considering the app complete, verify:

- [ ] Claude CLI detected on startup (`ai:check` returns connected)
- [ ] App works with no API keys (Claude Max auth)
- [ ] Optional API key entry in settings works
- [ ] Main agent streams responses, shows tool activity, tracks subagents
- [ ] Model cascade fires on refusal (Opus → Sonnet → Haiku → older Opus)
- [ ] Search agent rewrites sensitive queries, escalates models, falls back to links
- [ ] Search self-learning: quality scores logged, patterns updated
- [ ] Embedded browser blocks ads, downloads work
- [ ] Support agent can read source, make edits, rebuild
- [ ] REA agent spawns with MCP tools
- [ ] Sessions persist across app restarts (SQLite)
- [ ] Themes switch correctly (4 themes)
- [ ] Window controls work (minimize, maximize, close)
- [ ] Toolbar padding clears window controls (`pr-[140px]`)
- [ ] Auto-updater checks, downloads, installs
- [ ] NSIS installer and portable exe both build
- [ ] Persona system works, context injected into prompts
