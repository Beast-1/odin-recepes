import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import { useUIStore } from '../state/uiStore'

const ICONS = {
  info: <Info size={13} />,
  error: <AlertCircle size={13} />,
  success: <CheckCircle size={13} />,
}

const TONE = {
  info: 'border-line-strong text-muted',
  error: 'border-danger/50 text-danger',
  success: 'border-ok/50 text-ok',
}

export function Toasts() {
  const toasts = useUIStore((s) => s.toasts)
  const dismiss = useUIStore((s) => s.dismissToast)

  if (!toasts.length) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-50 flex flex-col items-center gap-1.5">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-in pointer-events-auto flex max-w-[420px] items-center gap-2 rounded-md border bg-raised px-3 py-2 text-xs shadow-pop ${TONE[t.kind]}`}
          role="status"
        >
          <span className="shrink-0">{ICONS[t.kind]}</span>
          <span className="text-ink">{t.text}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="ml-1 shrink-0 rounded text-dim transition-colors hover:text-ink"
            aria-label="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
