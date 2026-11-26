import { useRef, useState, useEffect } from 'react'
import { create } from 'zustand'
import { Paperclip, FileText, Folder, X } from 'lucide-react'
import type { Attachment } from '@/stores/chats'

export interface Pending extends Attachment {
  id: string
  files: File[]
}

export function fmtSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

let seq = 0
const SKIP_DIRS = new Set(['node_modules', '.git'])
const MAX_FOLDER_FILES = 5000

function fileItem(f: File): Pending {
  return {
    id: `a${++seq}`, name: f.name, size: f.size, kind: 'file', files: [f],
    preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
  }
}

interface AttachState {
  items: Pending[]
  addFiles: (l: FileList | File[] | null) => void
  addFolder: (l: FileList | null) => void
  addFolderFiles: (name: string, files: File[]) => void
  remove: (id: string) => void
  clear: () => void
}

export const useAttachStore = create<AttachState>((set) => ({
  items: [],
  addFiles: (l) => {
    const files = l ? Array.from(l) : []
    if (!files.length) return
    set((s) => {
      const fresh = files
        .filter((f) => !s.items.some((i) => i.kind === 'file' && i.name === f.name && i.size === f.size))
        .map(fileItem)
      return { items: [...s.items, ...fresh] }
    })
  },
  addFolder: (l) => {
    const files = l ? Array.from(l) : []
    if (!files.length) return
    const name = files[0].webkitRelativePath.split('/')[0] || 'folder'
    useAttachStore.getState().addFolderFiles(name, files)
  },
  addFolderFiles: (name, files) =>
    set((s) => ({
      items: [...s.items, {
        id: `a${++seq}`, name, kind: 'folder', count: files.length,
        size: files.reduce((n, f) => n + f.size, 0), files,
      }],
    })),
  remove: (id) =>
    set((s) => {
      s.items.find((i) => i.id === id && i.preview) && URL.revokeObjectURL(s.items.find((i) => i.id === id)!.preview!)
      return { items: s.items.filter((i) => i.id !== id) }
    }),
  // Previews stay alive: sent messages keep showing them
  clear: () => set({ items: [] }),
}))

export function useAttachments() {
  const items = useAttachStore((s) => s.items)
  const { addFiles, addFolder, remove, clear } = useAttachStore.getState()
  return { items, addFiles, addFolder, remove, clear }
}

async function readDir(dir: FileSystemDirectoryEntry, out: File[]): Promise<void> {
  const reader = dir.createReader()
  const batch = () => new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej))
  for (;;) {
    const entries = await batch()
    if (!entries.length) return
    for (const e of entries) {
      if (out.length >= MAX_FOLDER_FILES) return
      if (e.isFile) {
        out.push(await new Promise<File>((res, rej) => (e as FileSystemFileEntry).file(res, rej)))
      } else if (e.isDirectory && !SKIP_DIRS.has(e.name)) {
        await readDir(e as FileSystemDirectoryEntry, out)
      }
    }
  }
}

export async function ingestDataTransfer(dt: DataTransfer) {
  const picked = Array.from(dt.items ?? [])
    .filter((i) => i.kind === 'file')
    .map((i) => ({ entry: i.webkitGetAsEntry?.() ?? null, file: i.getAsFile() }))
  const st = useAttachStore.getState()
  const loose: File[] = []
  for (const { entry, file } of picked) {
    if (entry?.isDirectory) {
      const files: File[] = []
      await readDir(entry as FileSystemDirectoryEntry, files)
      if (files.length) st.addFolderFiles(entry.name, files)
    } else if (file) {
      loose.push(file)
    }
  }
  if (loose.length) st.addFiles(loose)
  if (!picked.length && dt.files.length) st.addFiles(dt.files)
}

export function handlePaste(e: React.ClipboardEvent) {
  const files = Array.from(e.clipboardData.files)
  if (!files.length) return
  e.preventDefault()
  useAttachStore.getState().addFiles(files)
}

export function AttachButton({ onFiles, onFolder }: {
  onFiles: (l: FileList | null) => void
  onFolder: (l: FileList | null) => void
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const fileIn = useRef<HTMLInputElement>(null)
  const dirIn = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key) }
  }, [open])

  const itemCls = 'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-fg-2 hover:text-fg-0 hover:bg-white/[0.06] transition-colors text-left'

  return (
    <div ref={wrap} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`p-1 transition-colors focus:outline-none ${open ? 'text-fg-0' : 'text-fg-4 hover:text-fg-2'}`}
        title="Attach"
      >
        <Paperclip size={18} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-3 w-44 py-1 bg-bg-2 border border-white/[0.1] rounded-lg shadow-pop z-40 page-enter">
          <button type="button" className={itemCls} onClick={() => { fileIn.current?.click(); setOpen(false) }}>
            <FileText size={14} className="text-fg-3" /> Add files
          </button>
          <button type="button" className={itemCls} onClick={() => { dirIn.current?.click(); setOpen(false) }}>
            <Folder size={14} className="text-fg-3" /> Add folder
          </button>
        </div>
      )}

      <input ref={fileIn} type="file" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
      <input
        ref={dirIn}
        type="file"
        hidden
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
        onChange={(e) => { onFolder(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}

function badge(a: Attachment) {
  if (a.kind === 'folder') return 'Folder'
  const ext = a.name.includes('.') ? a.name.split('.').pop()! : ''
  return ext ? ext.slice(0, 5).toUpperCase() : 'File'
}

function Card({ a, size, onRemove }: {
  a: Attachment & { id?: string }
  size: 'sm' | 'md'
  onRemove?: () => void
}) {
  const sm = size === 'sm'
  const box = a.preview
    ? sm ? 'w-[72px] h-[72px]' : 'w-[112px] h-[112px]'
    : sm ? 'w-[150px] h-[72px]' : 'w-[170px] h-[112px]'

  return (
    <div className={`relative shrink-0 rounded-xl border border-white/[0.1] bg-white/[0.05] overflow-hidden ${box}`}>
      {a.preview ? (
        <img src={a.preview} alt={a.name} title={a.name} className="w-full h-full object-cover" draggable={false} />
      ) : (
        <div className={`h-full flex flex-col justify-between ${sm ? 'p-2' : 'p-3'}`}>
          <div className={`flex items-start gap-1.5 text-fg-1 ${onRemove ? 'pr-5' : ''} ${sm ? 'text-[11px] leading-tight' : 'text-[12px] leading-snug'}`}>
            {a.kind === 'folder'
              ? <Folder size={12} className="shrink-0 mt-px text-fg-3" />
              : <FileText size={12} className="shrink-0 mt-px text-fg-3" />}
            <span className={`break-all ${sm ? 'line-clamp-2' : 'line-clamp-3'}`} title={a.name}>{a.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-[10px] font-medium tracking-wide text-fg-2">{badge(a)}</span>
            <span className="text-[10px] text-fg-3 tabular-nums truncate">
              {a.kind === 'folder' ? `${a.count} files` : fmtSize(a.size)}
            </span>
          </div>
        </div>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-fg-1 hover:text-fg-0 hover:bg-black flex items-center justify-center transition-colors"
          title="Remove"
        >
          <X size={11} />
        </button>
      )}
    </div>
  )
}

export function AttachChips({ items, onRemove, align = 'start', size = 'sm' }: {
  items: (Attachment & { id?: string })[]
  onRemove?: (id: string) => void
  align?: 'start' | 'end'
  size?: 'sm' | 'md'
}) {
  if (!items.length) return null
  return (
    <div className={`flex flex-wrap gap-2 ${align === 'end' ? 'justify-end' : ''}`}>
      {items.map((a, i) => (
        <Card
          key={a.id ?? `${a.name}-${i}`}
          a={a}
          size={size}
          onRemove={onRemove && a.id ? () => onRemove(a.id!) : undefined}
        />
      ))}
    </div>
  )
}
