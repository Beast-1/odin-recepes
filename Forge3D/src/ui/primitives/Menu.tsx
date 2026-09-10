import { useEffect, useRef, useState, type ReactNode } from 'react'

interface MenuProps {
  label: ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  width?: number
  triggerClassName?: string
  title?: string
}

export function Menu({ label, children, align = 'left', width = 210, triggerClassName = '', title }: MenuProps) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={wrapper}>
      <button
        type="button"
        title={title}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-7 items-center gap-1.5 rounded border border-transparent px-2 text-xs font-medium transition-colors focus-ring ${
          open ? 'bg-hover text-ink' : 'text-muted hover:bg-hover hover:text-ink'
        } ${triggerClassName}`}
      >
        {label}
      </button>
      {open && (
        <div
          className={`fade-in absolute top-[calc(100%+4px)] z-40 rounded-md border border-line-strong bg-raised py-1 shadow-pop ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ width }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

interface MenuItemProps {
  icon?: ReactNode
  shortcut?: string
  onClick?: () => void
  disabled?: boolean
  danger?: boolean
  children: ReactNode
}

export function MenuItem({ icon, shortcut, onClick, disabled, danger, children }: MenuItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors disabled:pointer-events-none disabled:opacity-35 ${
        danger ? 'text-danger hover:bg-danger/12' : 'text-muted hover:bg-hover hover:text-ink'
      }`}
    >
      <span className="flex h-4 w-4 items-center justify-center text-dim">{icon}</span>
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <span className="font-mono text-2xs text-dim">{shortcut}</span>}
    </button>
  )
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-line" />
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2.5 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-[0.09em] text-dim">{children}</div>
}
