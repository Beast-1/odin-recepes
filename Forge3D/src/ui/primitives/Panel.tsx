import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface SectionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  actions?: ReactNode
}

export function Section({ title, children, defaultOpen = true, actions }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-b border-line last:border-b-0">
      <div className="flex h-8 items-center gap-1 px-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-1 rounded text-2xs font-semibold uppercase tracking-[0.09em] text-dim transition-colors hover:text-muted focus-ring"
        >
          <ChevronDown
            size={12}
            strokeWidth={2.2}
            className={`transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
          />
          {title}
        </button>
        {actions}
      </div>
      {open && <div className="px-2.5 pb-3 pt-0.5">{children}</div>}
    </section>
  )
}

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="text-dim/70">{icon}</div>
      <p className="text-xs font-medium text-muted">{title}</p>
      {hint && <p className="max-w-[210px] text-2xs leading-relaxed text-dim">{hint}</p>}
    </div>
  )
}
