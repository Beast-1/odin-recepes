import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'ghost' | 'solid' | 'accent' | 'danger'

const VARIANTS: Record<Variant, string> = {
  ghost: 'bg-transparent text-muted hover:bg-hover hover:text-ink border border-transparent',
  solid: 'bg-raised text-ink border border-line hover:border-line-strong hover:bg-hover',
  accent: 'bg-accent text-white border border-accent hover:bg-[#3f7ce8]',
  danger: 'bg-transparent text-danger border border-transparent hover:bg-danger/12 hover:border-danger/40',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  active?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'solid', active, icon, children, className = '', ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors focus-ring disabled:pointer-events-none disabled:opacity-40 ${
        active ? 'border-accent/50 bg-accent/15 text-ink' : VARIANTS[variant]
      } ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  size?: 'sm' | 'md'
  children: ReactNode
}

export function IconButton({ active, size = 'md', children, className = '', ...rest }: IconButtonProps) {
  const dim = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7'
  return (
    <button
      type="button"
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded border transition-colors focus-ring disabled:pointer-events-none disabled:opacity-35 ${
        active
          ? 'border-accent/50 bg-accent/15 text-ink'
          : 'border-transparent text-muted hover:bg-hover hover:text-ink'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
