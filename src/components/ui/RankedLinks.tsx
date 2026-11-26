import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import FaviconImg from '@/components/ui/FaviconImg'

type Tier = 'recommended' | 'alternative' | 'caution'

export interface RankedLink {
  url: string
  title: string
  domain: string
  trust: number
  tier: Tier
}

interface RankedLinksProps {
  links: RankedLink[]
  onOpen?: (url: string) => void
}

const DOT: Record<Tier, string> = {
  recommended: 'bg-status-ok',
  alternative: 'bg-status-warn',
  caution: 'bg-status-danger',
}

function LinkRow({ link, onOpen }: { link: RankedLink; onOpen?: (url: string) => void }) {
  const muted = link.tier === 'caution'
  return (
    <button
      onClick={() => onOpen?.(link.url)}
      title={`Trust ${Math.round(link.trust * 100)}%`}
      className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-left glass-hover"
    >
      <FaviconImg url={link.domain || link.url} />
      <span className={`text-[13px] truncate flex-1 ${muted ? 'text-fg-3' : 'text-fg-1'}`}>{link.title}</span>
      <span className="shrink-0 px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] text-fg-4">{link.domain}</span>
      <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${DOT[link.tier]}`} />
    </button>
  )
}

function Section({ label, links, onOpen }: { label: string; links: RankedLink[]; onOpen?: (url: string) => void }) {
  const [open, setOpen] = useState(false)
  if (links.length === 0) return null
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-3 h-8 text-[11px] text-fg-4 hover:text-fg-2 transition-colors"
      >
        <ChevronDown size={12} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
        {label} ({links.length})
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {links.map((l) => <LinkRow key={l.url} link={l} onOpen={onOpen} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function RankedLinks({ links, onOpen }: RankedLinksProps) {
  if (links.length === 0) return null
  const byTrust = [...links].sort((a, b) => b.trust - a.trust)
  const recommended = byTrust.filter((l) => l.trust >= 0.75)
  const rest = byTrust.filter((l) => l.trust < 0.75)

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6 rounded-xl border border-white/[0.06] bg-bg-1/60 py-2"
    >
      {recommended.length > 0 && (
        <div>
          <h3 className="px-3 h-7 flex items-center text-[11px] font-medium text-fg-3">Recommended</h3>
          {recommended.map((l) => <LinkRow key={l.url} link={l} onOpen={onOpen} />)}
        </div>
      )}
      <Section label="More sources" links={rest.filter((l) => l.tier !== 'caution')} onOpen={onOpen} />
      <Section label="Use caution" links={rest.filter((l) => l.tier === 'caution')} onOpen={onOpen} />
    </motion.section>
  )
}
