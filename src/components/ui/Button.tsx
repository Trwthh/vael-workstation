import { type ButtonHTMLAttributes, type ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  icon?: ReactNode
  children?: ReactNode
}

const variants = {
  primary: 'bg-accent-solid text-bg-0 hover:bg-white font-medium',
  secondary: 'bg-bg-3 text-fg-1 hover:bg-white/[0.12] border border-white/[0.06]',
  ghost: 'text-fg-3 hover:text-fg-1 hover:bg-white/[0.04]',
  danger: 'bg-status-danger/10 text-status-danger hover:bg-status-danger/20 border border-status-danger/20',
}

const sizes = {
  sm: 'h-8 px-3 text-sm rounded-sm gap-1.5',
  md: 'h-control px-4 text-sm rounded-sm gap-2',
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center transition-colors duration-fast ease-vael focus-ring ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
