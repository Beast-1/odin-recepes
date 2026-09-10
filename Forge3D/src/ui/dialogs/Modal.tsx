import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  width?: number
}

export function Modal({ title, subtitle, onClose, children, width = 560 }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-6" onPointerDown={onClose}>
      <div
        className="fade-in flex max-h-[80vh] w-full flex-col overflow-hidden rounded-lg border border-line-strong bg-panel shadow-pop"
        style={{ maxWidth: width }}
        onPointerDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>
            {subtitle && <p className="truncate text-2xs text-dim">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-dim transition-colors hover:bg-hover hover:text-ink focus-ring"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
