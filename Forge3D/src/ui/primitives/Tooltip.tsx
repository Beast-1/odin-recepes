import type { ReactNode } from 'react'

type Side = 'top' | 'bottom' | 'right' | 'left'

const SIDE_CLASS: Record<Side, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
}

interface TooltipProps {
  label: ReactNode
  shortcut?: string
  side?: Side
  children: ReactNode
}

export function Tooltip({ label, shortcut, side = 'bottom', children }: TooltipProps) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded border border-line-strong bg-raised px-2 py-1 text-2xs text-ink opacity-0 shadow-pop transition-opacity delay-0 duration-100 group-hover/tip:opacity-100 group-hover/tip:delay-300 ${SIDE_CLASS[side]}`}
      >
        {label}
        {shortcut && <span className="ml-2 font-mono text-2xs text-dim">{shortcut}</span>}
      </span>
    </span>
  )
}
