import { useState } from 'react'
import { Globe } from 'lucide-react'

interface FaviconImgProps {
  /** A full URL or a bare domain. */
  url: string
  size?: number
}

function toDomain(input: string): string {
  try {
    return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`).hostname
  } catch {
    return input
  }
}

export default function FaviconImg({ url, size = 14 }: FaviconImgProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const box = { width: size, height: size }

  if (state === 'failed') return <Globe size={size} className="shrink-0 text-fg-4" />

  return (
    <span className="relative shrink-0 inline-block" style={box}>
      {state === 'loading' && <span className="absolute inset-0 rounded-full bg-white/[0.08]" />}
      <img
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(toDomain(url))}&sz=16`}
        alt=""
        loading="lazy"
        draggable={false}
        style={box}
        className={`absolute inset-0 rounded-[3px] transition-opacity ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setState('ready')}
        onError={() => setState('failed')}
      />
    </span>
  )
}
