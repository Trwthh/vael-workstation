import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Paperclip } from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { ingestDataTransfer } from '@/components/ui/Attach'

const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')

export default function DropZone() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    let depth = 0
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth++
      setActive(true)
    }
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      e.dataTransfer!.dropEffect = 'copy'
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (!depth) setActive(false)
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setActive(false)
      const { page, setPage } = useAppStore.getState()
      if (page !== 'dashboard' && page !== 'main-agent') setPage('dashboard')
      void ingestDataTransfer(e.dataTransfer!)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="m-8 w-full max-w-md rounded-2xl border-2 border-dashed border-white/30 bg-bg-1/80 px-8 py-12 flex flex-col items-center gap-3"
            initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <Paperclip size={26} className="text-fg-1" />
            <p className="text-[15px] font-medium text-fg-0">Drop to attach</p>
            <p className="text-[12px] text-fg-3">Images, files or folders</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
