import { useEffect, useRef, useState } from 'react'
import { clamp, round } from '../../core/math'

interface NumberFieldProps {
  value: number
  onChange: (value: number) => void
  onCommitStart?: () => void
  label?: string
  step?: number
  min?: number
  max?: number
  precision?: number
  suffix?: string
  accent?: 'x' | 'y' | 'z' | 'none'
  disabled?: boolean
}

const ACCENT: Record<string, string> = {
  x: 'text-[#d8686e]',
  y: 'text-[#6fbf72]',
  z: 'text-[#5b8fdc]',
  none: 'text-dim',
}

/**
 * Numeric input with horizontal drag-scrubbing, the interaction pattern every
 * DCC tool uses. Typing is always available as the precise fallback.
 */
export function NumberField({
  value,
  onChange,
  onCommitStart,
  label,
  step = 0.01,
  min = -Infinity,
  max = Infinity,
  precision = 3,
  suffix,
  accent = 'none',
  disabled,
}: NumberFieldProps) {
  const [text, setText] = useState(() => String(round(value, precision)))
  const [editing, setEditing] = useState(false)
  const dragState = useRef<{ startX: number; startValue: number; moved: boolean } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setText(String(round(value, precision)))
  }, [value, editing, precision])

  const apply = (next: number) => {
    if (!Number.isFinite(next)) return
    onChange(clamp(round(next, precision + 2), min, max))
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0 || editing) return
    dragState.current = { startX: event.clientX, startValue: value, moved: false }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current
    if (!state) return
    const dx = event.clientX - state.startX
    if (!state.moved) {
      if (Math.abs(dx) < 3) return
      state.moved = true
      onCommitStart?.()
    }
    const scale = event.shiftKey ? 0.1 : event.altKey ? 10 : 1
    apply(state.startValue + dx * step * scale)
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current
    dragState.current = null
    if (!state) return
    ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
    if (!state.moved && !disabled) {
      setEditing(true)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }

  const commitText = () => {
    setEditing(false)
    const parsed = Number.parseFloat(text.replace(',', '.'))
    if (Number.isFinite(parsed)) {
      onCommitStart?.()
      apply(parsed)
    } else {
      setText(String(round(value, precision)))
    }
  }

  return (
    <div
      className={`group relative flex h-6 items-center rounded border border-line bg-sunken transition-colors ${
        disabled ? 'opacity-40' : 'hover:border-line-strong'
      } ${editing ? 'border-accent' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{ cursor: disabled ? 'default' : editing ? 'text' : 'ew-resize' }}
    >
      {label && (
        <span className={`pl-1.5 pr-1 font-mono text-2xs font-semibold ${ACCENT[accent]}`}>{label}</span>
      )}
      {editing ? (
        <input
          ref={inputRef}
          className="h-full w-full min-w-0 bg-transparent px-1 font-mono text-xs tabular-nums outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitText()
            if (e.key === 'Escape') {
              setText(String(round(value, precision)))
              setEditing(false)
            }
            e.stopPropagation()
          }}
        />
      ) : (
        <span className="flex-1 select-none truncate px-1 text-right font-mono text-xs tabular-nums text-ink">
          {round(value, precision)}
          {suffix && <span className="ml-0.5 text-dim">{suffix}</span>}
        </span>
      )}
    </div>
  )
}
