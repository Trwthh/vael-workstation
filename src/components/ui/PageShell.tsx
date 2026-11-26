import { type ReactNode } from 'react'

interface PageShellProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

/** Consistent page wrapper with optional header row. */
export default function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  return (
    <div className="h-full flex flex-col gap-6">
      {(title || actions) && (
        <div className="flex items-center justify-between shrink-0">
          <div>
            {title && <h2 className="text-lg font-display font-semibold text-fg-0">{title}</h2>}
            {subtitle && <p className="text-sm text-fg-3 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  )
}
