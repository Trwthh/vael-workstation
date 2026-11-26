interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'accent' | 'ok' | 'warn' | 'danger'
  className?: string
}

const variants = {
  default: 'bg-white/[0.06] text-fg-3',
  accent: 'bg-accent-muted text-accent',
  ok: 'bg-status-ok/10 text-status-ok',
  warn: 'bg-status-warn/10 text-status-warn',
  danger: 'bg-status-danger/10 text-status-danger',
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-2xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
