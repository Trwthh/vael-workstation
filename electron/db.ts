import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let db: Database.Database | null = null

function getDbPath(): string {
  const dir = path.join(app.getPath('userData'), 'data')
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'vael.db')
}

export function initDb() {
  db = new Database(getDbPath())
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model TEXT,
      verified INTEGER DEFAULT 0,
      is_refusal INTEGER DEFAULT 0,
      suggestions TEXT,
      attachments TEXT,
      ts INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, ts);

    CREATE TABLE IF NOT EXISTS search_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      engine TEXT NOT NULL,
      result_url TEXT,
      success INTEGER DEFAULT 0,
      download_found INTEGER DEFAULT 0,
      notes TEXT,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_search_ts ON search_memory(ts);
    CREATE INDEX IF NOT EXISTS idx_search_query ON search_memory(query);

    CREATE TABLE IF NOT EXISTS site_knowledge (
      domain TEXT PRIMARY KEY,
      trust_score REAL DEFAULT 0.5,
      has_captcha INTEGER DEFAULT 0,
      has_adwall INTEGER DEFAULT 0,
      is_shortener INTEGER DEFAULT 0,
      bypass_method TEXT,
      download_selector TEXT,
      visit_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      last_visit INTEGER,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS agent_learnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      query_type TEXT DEFAULT 'general',
      model_used TEXT NOT NULL,
      escalated INTEGER DEFAULT 0,
      result_quality INTEGER DEFAULT 0,
      tokens_est INTEGER DEFAULT 0,
      response_summary TEXT,
      useful_sources TEXT,
      mistakes TEXT,
      improvements TEXT,
      user_clicked INTEGER DEFAULT 0,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_learnings_query ON agent_learnings(query);
    CREATE INDEX IF NOT EXISTS idx_learnings_type ON agent_learnings(query_type);
    CREATE INDEX IF NOT EXISTS idx_learnings_ts ON agent_learnings(ts);

    CREATE TABLE IF NOT EXISTS agent_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_type TEXT NOT NULL,
      pattern TEXT NOT NULL,
      best_model TEXT,
      avg_quality REAL DEFAULT 0,
      use_count INTEGER DEFAULT 1,
      last_used INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_patterns_unique ON agent_patterns(pattern_type, pattern);

    CREATE TABLE IF NOT EXISTS download_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      url TEXT,
      source_domain TEXT,
      file_size INTEGER,
      file_hash TEXT,
      safe INTEGER DEFAULT 1,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_download_ts ON download_log(ts);

    CREATE TABLE IF NOT EXISTS prompt_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_name TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      content TEXT NOT NULL,
      model_target TEXT,
      avg_quality REAL DEFAULT 0,
      test_count INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      notes TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_name_ver ON prompt_versions(prompt_name, version);

    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_name TEXT NOT NULL,
      category TEXT NOT NULL,
      query TEXT NOT NULL,
      model_used TEXT NOT NULL,
      prompt_version_id INTEGER,
      result_type TEXT NOT NULL DEFAULT 'unknown',
      was_refused INTEGER DEFAULT 0,
      was_incomplete INTEGER DEFAULT 0,
      quality_score INTEGER DEFAULT 0,
      response_length INTEGER DEFAULT 0,
      had_links INTEGER DEFAULT 0,
      had_code INTEGER DEFAULT 0,
      error_msg TEXT,
      notes TEXT,
      ts INTEGER NOT NULL,
      FOREIGN KEY (prompt_version_id) REFERENCES prompt_versions(id)
    );
    CREATE INDEX IF NOT EXISTS idx_test_category ON test_results(category);
    CREATE INDEX IF NOT EXISTS idx_test_ts ON test_results(ts);

    CREATE TABLE IF NOT EXISTS improvement_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round INTEGER NOT NULL DEFAULT 1,
      changes_made TEXT NOT NULL,
      before_avg_quality REAL,
      after_avg_quality REAL,
      refusal_rate_before REAL,
      refusal_rate_after REAL,
      notes TEXT,
      ts INTEGER NOT NULL
    );
  `)
  return db
}

export function getDb(): Database.Database {
  if (!db) throw new Error('DB not initialized')
  return db
}

export function seedSiteReputation() {
  const d = getDb()
  const count = (d.prepare('SELECT COUNT(*) as c FROM site_knowledge').get() as { c: number }).c
  if (count > 0) return

  const sites: Array<[string, number, string]> = [
    ['archive.org', 0.95, 'Internet Archive - preservation, trusted'],
    ['github.com', 0.95, 'Open source repos, releases'],
    ['pcgamingwiki.com', 0.92, 'PC game fixes, guides, trusted community'],
    ['nexusmods.com', 0.90, 'Game mods, trusted community'],
    ['steamcommunity.com', 0.90, 'Steam community, guides'],
    ['reddit.com', 0.85, 'Community discussions'],
    ['gbatemp.net', 0.88, 'Homebrew/CFW community'],
    ['romhacking.net', 0.88, 'ROM hacks, patches'],
    ['vimm.net', 0.87, 'Verified ROM archive'],
    ['myrient.erista.me', 0.86, 'Large ROM/ISO archive'],
    ['cdromance.org', 0.84, 'ROM collection, community verified'],
    ['emulation.gametechwiki.com', 0.90, 'Emulation wiki'],
    ['steamrip.com', 0.90, 'Pre-installed PC games, user-trusted'],
    ['online-fix.me', 0.85, 'Online fix for games, user-trusted'],
    ['fitgirl-repacks.site', 0.85, 'Compressed repacks, community trusted'],
    ['dodi-repacks.site', 0.83, 'Game repacks, community known'],
    ['gog-games.to', 0.80, 'DRM-free game archive'],
    ['cs.rin.ru', 0.82, 'Steam underground forum'],
    ['1337x.to', 0.78, 'General torrent index'],
    ['rutracker.org', 0.80, 'Russian tracker, large archive'],
    ['sourceforge.net', 0.82, 'Open source hosting'],
    ['fosshub.com', 0.85, 'FOSS downloads, verified'],
    ['portableapps.com', 0.84, 'Portable software, clean'],
    ['ninite.com', 0.90, 'Bulk installer, trusted'],
    ['chocolatey.org', 0.88, 'Windows package manager'],
    ['f-droid.org', 0.90, 'FOSS Android apps'],
    ['apkmirror.com', 0.82, 'Verified APKs'],
    ['virustotal.com', 0.95, 'File/URL scanning'],
    ['exploit-db.com', 0.90, 'Exploit database'],
    ['hybrid-analysis.com', 0.90, 'Malware sandbox'],
    ['any.run', 0.88, 'Interactive malware analysis'],
    ['malwarebazaar.abuse.ch', 0.90, 'Malware samples'],
    ['3ds.hacks.guide', 0.90, '3DS CFW guide'],
    ['switch.homebrew.guide', 0.88, 'Switch homebrew guide'],
    ['vita.hacks.guide', 0.88, 'Vita homebrew guide'],
    ['consolemods.org', 0.85, 'Console modding wiki'],
    ['steamunlocked.net', 0.45, 'Slow downloads, mixed reports'],
    ['ocean-of-games.com', 0.20, 'Known malware risk'],
    ['igg-games.com', 0.15, 'DRM injection, malware reports'],
    ['getintopc.com', 0.35, 'Excessive ads, some malware'],
    ['softonic.com', 0.30, 'Bundleware, PUPs'],
    ['oceanofapk.com', 0.20, 'Malware risk'],
  ]

  const stmt = d.prepare(
    'INSERT OR IGNORE INTO site_knowledge (domain, trust_score, visit_count, success_count, last_visit, notes) VALUES (?, ?, 0, 0, ?, ?)'
  )
  const tx = d.transaction(() => {
    for (const [domain, score, notes] of sites) stmt.run(domain, score, Date.now(), notes)
  })
  tx()
}

export function getRankedSites(domains: string[]): Array<{ domain: string; trust_score: number; notes: string | null }> {
  if (domains.length === 0) return []
  const d = getDb()
  const ph = domains.map(() => '?').join(',')
  return d.prepare(`SELECT domain, trust_score, notes FROM site_knowledge WHERE domain IN (${ph}) ORDER BY trust_score DESC`).all(...domains) as Array<{ domain: string; trust_score: number; notes: string | null }>
}

export function initProfileTable() {
  getDb().exec(`CREATE TABLE IF NOT EXISTS user_profile (key TEXT PRIMARY KEY, value TEXT NOT NULL)`)
}

export function getProfile(): Record<string, string> {
  const rows = getDb().prepare('SELECT key, value FROM user_profile').all() as Array<{ key: string; value: string }>
  const p: Record<string, string> = {}
  for (const r of rows) p[r.key] = r.value
  return p
}

export function setProfileField(key: string, value: string) {
  getDb().prepare('INSERT OR REPLACE INTO user_profile (key, value) VALUES (?, ?)').run(key, value)
}

// Sessions
export function loadSessions(): { id: string; title: string; createdAt: number }[] {
  return getDb()
    .prepare("SELECT id, title, created_at as createdAt FROM sessions WHERE id NOT LIKE '\\_\\_%\\_\\_' ESCAPE '\\' ORDER BY updated_at DESC")
    .all() as { id: string; title: string; createdAt: number }[]
}

export function upsertSession(id: string, title: string, createdAt: number) {
  getDb()
    .prepare('INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=?, updated_at=?')
    .run(id, title, createdAt, Date.now(), title, Date.now())
}

export function deleteSession(id: string) {
  const d = getDb()
  d.prepare('DELETE FROM messages WHERE session_id = ?').run(id)
  d.prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

export function renameSession(id: string, title: string) {
  getDb().prepare('UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?').run(title, Date.now(), id)
}

// Messages
export function loadMessages(sessionId: string): unknown[] {
  const rows = getDb()
    .prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY ts ASC')
    .all(sessionId) as {
      id: string; session_id: string; role: string; content: string;
      model: string | null; verified: number; is_refusal: number;
      suggestions: string | null; attachments: string | null; ts: number
    }[]

  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    content: r.content,
    model: r.model || undefined,
    verified: r.verified === 1,
    isRefusal: r.is_refusal === 1,
    suggestions: r.suggestions ? JSON.parse(r.suggestions) : undefined,
    attachments: r.attachments ? JSON.parse(r.attachments) : undefined,
    ts: r.ts,
  }))
}

export function saveMessage(sessionId: string, msg: {
  id: string; role: string; content: string; model?: string;
  verified?: boolean; isRefusal?: boolean; suggestions?: string[];
  attachments?: unknown[]; ts?: number
}) {
  getDb()
    .prepare(`INSERT OR REPLACE INTO messages (id, session_id, role, content, model, verified, is_refusal, suggestions, attachments, ts)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      msg.id, sessionId, msg.role, msg.content,
      msg.model || null,
      msg.verified ? 1 : 0,
      msg.isRefusal ? 1 : 0,
      msg.suggestions ? JSON.stringify(msg.suggestions) : null,
      msg.attachments ? JSON.stringify(msg.attachments) : null,
      msg.ts || Date.now()
    )
  // Touch session updated_at
  getDb().prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(Date.now(), sessionId)
}

export function deleteMessage(sessionId: string, msgId: string) {
  getDb().prepare('DELETE FROM messages WHERE id = ? AND session_id = ?').run(msgId, sessionId)
}

export function clearMessages(sessionId: string) {
  getDb().prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId)
}

// Search memory
export function logSearch(query: string, engine: string, resultUrl?: string, success?: boolean, downloadFound?: boolean, notes?: string) {
  getDb().prepare(
    'INSERT INTO search_memory (query, engine, result_url, success, download_found, notes, ts) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(query, engine, resultUrl || null, success ? 1 : 0, downloadFound ? 1 : 0, notes || null, Date.now())
}

export function getSearchHistory(limit = 50): unknown[] {
  return getDb().prepare('SELECT * FROM search_memory ORDER BY ts DESC LIMIT ?').all(limit)
}

export function findSimilarSearches(query: string): unknown[] {
  return getDb().prepare("SELECT * FROM search_memory WHERE query LIKE ? ORDER BY success DESC, ts DESC LIMIT 10").all(`%${query}%`)
}

// Site knowledge
export function getSiteKnowledge(domain: string): unknown {
  return getDb().prepare('SELECT * FROM site_knowledge WHERE domain = ?').get(domain) || null
}

export function updateSiteKnowledge(domain: string, data: {
  trust_score?: number; has_captcha?: boolean; has_adwall?: boolean;
  is_shortener?: boolean; bypass_method?: string; download_selector?: string;
  success?: boolean; notes?: string
}) {
  const existing = getDb().prepare('SELECT * FROM site_knowledge WHERE domain = ?').get(domain) as Record<string, unknown> | undefined
  if (existing) {
    const newVisits = (existing.visit_count as number || 0) + 1
    const newSuccesses = (existing.success_count as number || 0) + (data.success ? 1 : 0)
    const computedTrust = data.trust_score ?? (newSuccesses / newVisits)
    getDb().prepare(`UPDATE site_knowledge SET
      trust_score = ?, has_captcha = ?, has_adwall = ?, is_shortener = ?,
      bypass_method = COALESCE(?, bypass_method), download_selector = COALESCE(?, download_selector),
      visit_count = ?, success_count = ?, last_visit = ?, notes = COALESCE(?, notes)
      WHERE domain = ?`
    ).run(
      computedTrust,
      data.has_captcha !== undefined ? (data.has_captcha ? 1 : 0) : (existing.has_captcha as number),
      data.has_adwall !== undefined ? (data.has_adwall ? 1 : 0) : (existing.has_adwall as number),
      data.is_shortener !== undefined ? (data.is_shortener ? 1 : 0) : (existing.is_shortener as number),
      data.bypass_method || null, data.download_selector || null,
      newVisits, newSuccesses, Date.now(), data.notes || null, domain
    )
  } else {
    getDb().prepare(`INSERT INTO site_knowledge (domain, trust_score, has_captcha, has_adwall, is_shortener,
      bypass_method, download_selector, visit_count, success_count, last_visit, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
    ).run(
      domain, data.trust_score ?? 0.5,
      data.has_captcha ? 1 : 0, data.has_adwall ? 1 : 0, data.is_shortener ? 1 : 0,
      data.bypass_method || null, data.download_selector || null,
      data.success ? 1 : 0, Date.now(), data.notes || null
    )
  }
}

export function getTopSites(limit = 20): unknown[] {
  return getDb().prepare('SELECT * FROM site_knowledge ORDER BY trust_score DESC, success_count DESC LIMIT ?').all(limit)
}

// Download log
export function logDownload(filename: string, url?: string, sourceDomain?: string, fileSize?: number, fileHash?: string, safe = true) {
  getDb().prepare(
    'INSERT INTO download_log (filename, url, source_domain, file_size, file_hash, safe, ts) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(filename, url || null, sourceDomain || null, fileSize || null, fileHash || null, safe ? 1 : 0, Date.now())
}

export function getDownloadHistory(limit = 50): unknown[] {
  return getDb().prepare('SELECT * FROM download_log ORDER BY ts DESC LIMIT ?').all(limit)
}

// Agent learnings
export function logAgentSearch(data: {
  query: string; queryType?: string; modelUsed: string; escalated?: boolean;
  resultQuality?: number; tokensEst?: number; responseSummary?: string;
  usefulSources?: string; mistakes?: string; improvements?: string
}) {
  getDb().prepare(`INSERT INTO agent_learnings
    (query, query_type, model_used, escalated, result_quality, tokens_est, response_summary, useful_sources, mistakes, improvements, ts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.query, data.queryType || 'general', data.modelUsed,
    data.escalated ? 1 : 0, data.resultQuality || 0, data.tokensEst || 0,
    data.responseSummary || null, data.usefulSources || null,
    data.mistakes || null, data.improvements || null, Date.now()
  )
}

export function markSearchClicked(query: string) {
  getDb().prepare(
    'UPDATE agent_learnings SET user_clicked = 1 WHERE query = ? ORDER BY ts DESC LIMIT 1'
  ).run(query)
}

export function getRecentLearnings(limit = 20): unknown[] {
  return getDb().prepare('SELECT * FROM agent_learnings ORDER BY ts DESC LIMIT ?').all(limit)
}

export function findSimilarLearnings(query: string): unknown[] {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2).slice(0, 3)
  if (words.length === 0) return []
  const clauses = words.map(() => 'query LIKE ?').join(' OR ')
  const params = words.map(w => `%${w}%`)
  return getDb().prepare(
    `SELECT * FROM agent_learnings WHERE ${clauses} ORDER BY result_quality DESC, ts DESC LIMIT 5`
  ).all(...params)
}

export function upsertPattern(patternType: string, pattern: string, model: string, quality: number) {
  const existing = getDb().prepare(
    'SELECT * FROM agent_patterns WHERE pattern_type = ? AND pattern = ?'
  ).get(patternType, pattern) as Record<string, unknown> | undefined

  if (existing) {
    const count = (existing.use_count as number) + 1
    const avgQ = ((existing.avg_quality as number) * (count - 1) + quality) / count
    const bestModel = quality > (existing.avg_quality as number) ? model : (existing.best_model as string)
    getDb().prepare(
      'UPDATE agent_patterns SET best_model = ?, avg_quality = ?, use_count = ?, last_used = ? WHERE id = ?'
    ).run(bestModel, avgQ, count, Date.now(), existing.id)
  } else {
    getDb().prepare(
      'INSERT INTO agent_patterns (pattern_type, pattern, best_model, avg_quality, use_count, last_used) VALUES (?, ?, ?, ?, 1, ?)'
    ).run(patternType, pattern, model, quality, Date.now())
  }
}

export function getBestModelForPattern(patternType: string, pattern: string): string | null {
  const row = getDb().prepare(
    'SELECT best_model FROM agent_patterns WHERE pattern_type = ? AND pattern = ? AND use_count >= 2'
  ).get(patternType, pattern) as { best_model: string } | undefined
  return row?.best_model || null
}

export function getAgentStats(): { totalSearches: number; avgQuality: number; topModel: string | null; escalationRate: number } {
  const stats = getDb().prepare(`
    SELECT COUNT(*) as total,
      AVG(result_quality) as avgQ,
      SUM(escalated) as escalations
    FROM agent_learnings WHERE ts > ?
  `).get(Date.now() - 7 * 86400000) as { total: number; avgQ: number; escalations: number }

  const topModel = getDb().prepare(`
    SELECT model_used, AVG(result_quality) as q FROM agent_learnings
    WHERE ts > ? GROUP BY model_used ORDER BY q DESC LIMIT 1
  `).get(Date.now() - 7 * 86400000) as { model_used: string } | undefined

  return {
    totalSearches: stats?.total || 0,
    avgQuality: stats?.avgQ || 0,
    topModel: topModel?.model_used || null,
    escalationRate: stats?.total ? (stats.escalations / stats.total) : 0,
  }
}

// Prompt versioning
export function savePromptVersion(name: string, content: string, modelTarget?: string, notes?: string): number {
  const latest = getDb().prepare(
    'SELECT MAX(version) as v FROM prompt_versions WHERE prompt_name = ?'
  ).get(name) as { v: number | null } | undefined
  const nextVer = (latest?.v || 0) + 1

  // Deactivate old versions
  getDb().prepare('UPDATE prompt_versions SET active = 0 WHERE prompt_name = ?').run(name)

  const result = getDb().prepare(
    'INSERT INTO prompt_versions (prompt_name, version, content, model_target, active, notes, created_at) VALUES (?, ?, ?, ?, 1, ?, ?)'
  ).run(name, nextVer, content, modelTarget || null, notes || null, Date.now())

  return result.lastInsertRowid as number
}

export function getActivePrompt(name: string): { id: number; version: number; content: string; avgQuality: number } | null {
  const row = getDb().prepare(
    'SELECT id, version, content, avg_quality as avgQuality FROM prompt_versions WHERE prompt_name = ? AND active = 1 ORDER BY version DESC LIMIT 1'
  ).get(name) as { id: number; version: number; content: string; avgQuality: number } | undefined
  return row || null
}

export function getPromptHistory(name: string): unknown[] {
  return getDb().prepare(
    'SELECT id, version, avg_quality, test_count, active, notes, created_at FROM prompt_versions WHERE prompt_name = ? ORDER BY version DESC'
  ).all(name)
}

export function rollbackPrompt(name: string, targetVersion: number): boolean {
  const target = getDb().prepare(
    'SELECT id FROM prompt_versions WHERE prompt_name = ? AND version = ?'
  ).get(name, targetVersion) as { id: number } | undefined
  if (!target) return false

  getDb().prepare('UPDATE prompt_versions SET active = 0 WHERE prompt_name = ?').run(name)
  getDb().prepare('UPDATE prompt_versions SET active = 1 WHERE id = ?').run(target.id)
  return true
}

// Test results
export function logTestResult(data: {
  testName: string; category: string; query: string; modelUsed: string;
  promptVersionId?: number; resultType: string; wasRefused?: boolean;
  wasIncomplete?: boolean; qualityScore?: number; responseLength?: number;
  hadLinks?: boolean; hadCode?: boolean; errorMsg?: string; notes?: string
}) {
  getDb().prepare(`INSERT INTO test_results
    (test_name, category, query, model_used, prompt_version_id, result_type,
     was_refused, was_incomplete, quality_score, response_length, had_links, had_code, error_msg, notes, ts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.testName, data.category, data.query, data.modelUsed,
    data.promptVersionId || null, data.resultType,
    data.wasRefused ? 1 : 0, data.wasIncomplete ? 1 : 0,
    data.qualityScore || 0, data.responseLength || 0,
    data.hadLinks ? 1 : 0, data.hadCode ? 1 : 0,
    data.errorMsg || null, data.notes || null, Date.now()
  )

  // Update prompt version stats if linked
  if (data.promptVersionId) {
    getDb().prepare(`UPDATE prompt_versions SET
      test_count = test_count + 1,
      avg_quality = (avg_quality * test_count + ?) / (test_count + 1)
      WHERE id = ?`
    ).run(data.qualityScore || 0, data.promptVersionId)
  }
}

export function getTestResults(category?: string, limit = 50): unknown[] {
  if (category) {
    return getDb().prepare('SELECT * FROM test_results WHERE category = ? ORDER BY ts DESC LIMIT ?').all(category, limit)
  }
  return getDb().prepare('SELECT * FROM test_results ORDER BY ts DESC LIMIT ?').all(limit)
}

export function getTestStats(): {
  total: number; avgQuality: number; refusalRate: number;
  incompleteRate: number; byCategory: Record<string, { count: number; avgQuality: number; refusalRate: number }>
} {
  const overall = getDb().prepare(`
    SELECT COUNT(*) as total, AVG(quality_score) as avgQ,
      AVG(was_refused) as refRate, AVG(was_incomplete) as incRate
    FROM test_results WHERE ts > ?
  `).get(Date.now() - 7 * 86400000) as { total: number; avgQ: number; refRate: number; incRate: number }

  const categories = getDb().prepare(`
    SELECT category, COUNT(*) as cnt, AVG(quality_score) as avgQ, AVG(was_refused) as refRate
    FROM test_results WHERE ts > ? GROUP BY category
  `).all(Date.now() - 7 * 86400000) as Array<{ category: string; cnt: number; avgQ: number; refRate: number }>

  const byCategory: Record<string, { count: number; avgQuality: number; refusalRate: number }> = {}
  for (const c of categories) {
    byCategory[c.category] = { count: c.cnt, avgQuality: c.avgQ, refusalRate: c.refRate }
  }

  return {
    total: overall?.total || 0,
    avgQuality: overall?.avgQ || 0,
    refusalRate: overall?.refRate || 0,
    incompleteRate: overall?.incRate || 0,
    byCategory,
  }
}

// Improvement log
export function logImprovement(data: {
  round: number; changesMade: string; beforeAvgQuality?: number;
  afterAvgQuality?: number; refusalRateBefore?: number; refusalRateAfter?: number; notes?: string
}) {
  getDb().prepare(`INSERT INTO improvement_log
    (round, changes_made, before_avg_quality, after_avg_quality, refusal_rate_before, refusal_rate_after, notes, ts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.round, data.changesMade,
    data.beforeAvgQuality ?? null, data.afterAvgQuality ?? null,
    data.refusalRateBefore ?? null, data.refusalRateAfter ?? null,
    data.notes || null, Date.now()
  )
}

export function getImprovementHistory(): unknown[] {
  return getDb().prepare('SELECT * FROM improvement_log ORDER BY round DESC, ts DESC').all()
}
