export function VaelMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="18" strokeLinejoin="round" strokeLinecap="round" aria-label="VAEL" role="img">
      <path d="M30 54 H226 L128 226 Z" />
      <path d="M128 54 V152" />
    </svg>
  )
}

/** VAEL wordmark: mark + tracking text with subtle horizontal stretch. */
export function VaelLogo({ size = 28, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 text-fg-0">
      <VaelMark size={size} />
      {!compact && <VaelText size={15} />}
    </div>
  )
}

/** Standalone VAEL text — subtle horizontal stretch, light weight. */
export function VaelText({ size = 15, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`font-mono font-light tracking-[0.22em] ${className}`}
      style={{ fontSize: size, transform: 'scaleX(1.08)', display: 'inline-block' }}
    >
      VAEL
    </span>
  )
}
