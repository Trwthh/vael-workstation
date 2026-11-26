import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  glass?: boolean
  onClick?: () => void
}

export default function Card({ children, className = '', glass, onClick }: CardProps) {
  const base = glass
    ? 'glass border-subtle'
    : 'bg-bg-2 border border-white/[0.06]'

  return (
    <div
      className={`rounded-lg p-4 ${base} ${onClick ? 'cursor-pointer hover:bg-bg-3 transition-colors duration-fast' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
