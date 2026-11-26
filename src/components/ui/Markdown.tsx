import { useMemo, useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface MarkdownProps {
  content: string
  className?: string
}

export default function Markdown({ content, className = '' }: MarkdownProps) {
  const elements = useMemo(() => parse(content), [content])
  return <div className={`markdown ${className}`}>{elements}</div>
}

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/
const BULLET = /^(\s*)[-*+]\s+(.*)$/
const NUMBERED = /^(\s*)\d+[.)]\s+(.*)$/
const QUOTE = /^\s*>\s?(.*)$/
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/

function isTableStart(lines: string[], i: number): boolean {
  return lines[i].includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('-')
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
}

function startsBlock(lines: string[], i: number): boolean {
  const l = lines[i]
  return l.startsWith('```') || HEADING.test(l) || RULE.test(l) || BULLET.test(l) || NUMBERED.test(l) || QUOTE.test(l) || isTableStart(lines, i)
}

function parse(text: string): React.ReactNode[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const out: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i])
        i++
      }
      i++
      out.push(<CodeBlock key={key++} lang={lang} code={code.join('\n')} />)
      continue
    }

    if (line.trim() === '') {
      i++
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      const level = Math.min(heading[1].length, 4)
      const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4'
      out.push(<Tag key={key++} dangerouslySetInnerHTML={{ __html: inlineFormat(heading[2]) }} />)
      i++
      continue
    }

    if (RULE.test(line)) {
      out.push(<hr key={key++} />)
      i++
      continue
    }

    if (isTableStart(lines, i)) {
      const head = splitRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i]))
        i++
      }
      out.push(
        <div key={key++} className="md-table-wrap">
          <table>
            <thead>
              <tr>{head.map((c, j) => <th key={j} dangerouslySetInnerHTML={{ __html: inlineFormat(c) }} />)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{head.map((_, j) => <td key={j} dangerouslySetInnerHTML={{ __html: inlineFormat(r[j] ?? '') }} />)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    if (QUOTE.test(line)) {
      const quoted: string[] = []
      while (i < lines.length && QUOTE.test(lines[i])) {
        quoted.push(QUOTE.exec(lines[i])![1])
        i++
      }
      out.push(<blockquote key={key++}>{parse(quoted.join('\n'))}</blockquote>)
      continue
    }

    if (BULLET.test(line) || NUMBERED.test(line)) {
      const ordered = NUMBERED.test(line) && !BULLET.test(line)
      const items: { depth: number; text: string }[] = []
      while (i < lines.length) {
        const m = BULLET.exec(lines[i]) || NUMBERED.exec(lines[i])
        if (m) {
          items.push({ depth: Math.min(Math.floor(m[1].replace(/\t/g, '  ').length / 2), 3), text: m[2] })
          i++
        } else if (lines[i].trim() !== '' && /^\s{2,}\S/.test(lines[i]) && items.length) {
          items[items.length - 1].text += ' ' + lines[i].trim()
          i++
        } else break
      }
      const List = ordered ? 'ol' : 'ul'
      out.push(
        <List key={key++}>
          {items.map((it, j) => (
            <li key={j} style={it.depth ? { marginLeft: it.depth * 18 } : undefined} dangerouslySetInnerHTML={{ __html: inlineFormat(it.text) }} />
          ))}
        </List>
      )
      continue
    }

    const para: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !(para.length && startsBlock(lines, i))) {
      para.push(lines[i])
      i++
    }
    out.push(<p key={key++} dangerouslySetInnerHTML={{ __html: para.map(inlineFormat).join('<br/>') }} />)
  }

  return out
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="code-block-wrapper">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/[0.06]">
        <span className={`code-lang-badge${lang ? ` code-lang-badge--${lang.toLowerCase()}` : ''}`}>
          {lang || 'text'}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[11px] text-fg-3 hover:text-fg-0 transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="code-block !rounded-t-none !mt-0 !border-0">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatText(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
}

// Inline code is split out first so its contents are never formatted.
function inlineFormat(line: string): string {
  return esc(line)
    .split(/(`[^`]+`)/g)
    .map((part) => (part.startsWith('`') && part.endsWith('`') && part.length > 2
      ? `<code class="inline-code">${part.slice(1, -1)}</code>`
      : formatText(part)))
    .join('')
}
