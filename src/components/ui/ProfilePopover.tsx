import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Pencil } from 'lucide-react'
import { useProfileStore } from '@/stores/profile'

interface ProfilePopoverProps {
  onSaved?: (displayName: string) => void
}

export default function ProfilePopover({ onSaved }: ProfilePopoverProps) {
  const { displayName: name, avatar, setDisplayName } = useProfileStore()
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)

  const save = () => {
    const next = draft.trim()
    setEditing(false)
    if (!next || next === name) return
    setDisplayName(next)
    onSaved?.(next)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className="absolute bottom-full left-2 mb-2 w-[220px] rounded-xl border border-white/[0.1] bg-bg-2 p-3 shadow-xl z-20 no-drag"
    >
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 shrink-0 rounded-full bg-white/[0.12] text-fg-0 text-[15px] font-semibold flex items-center justify-center overflow-hidden">
          {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : (name?.trim().charAt(0) || 'U').toUpperCase()}
        </span>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
            maxLength={40}
            className="min-w-0 flex-1 h-8 px-2 rounded-md bg-white/[0.06] border border-white/[0.1] text-[13px] text-fg-0 focus:outline-none focus:border-white/[0.2]"
          />
        ) : (
          <span className="min-w-0 flex-1 text-[13px] font-medium text-fg-0 truncate">{name || 'Unnamed'}</span>
        )}
        <button
          onClick={editing ? save : () => { setDraft(name); setEditing(true) }}
          title={editing ? 'Save' : 'Edit name'}
          className="shrink-0 p-1.5 rounded-md text-fg-3 hover:text-fg-0 hover:bg-white/[0.06] transition-colors"
        >
          {editing ? <Check size={13} /> : <Pencil size={13} />}
        </button>
      </div>
    </motion.div>
  )
}
