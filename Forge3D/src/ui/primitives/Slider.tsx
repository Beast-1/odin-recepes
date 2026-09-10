import { round } from '../../core/math'

interface SliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  onCommitStart?: () => void
  min?: number
  max?: number
  step?: number
  precision?: number
}

export function Slider({
  label,
  value,
  onChange,
  onCommitStart,
  min = 0,
  max = 1,
  step = 0.01,
  precision = 2,
}: SliderProps) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between">
        <span className="field-label">{label}</span>
        <span className="font-mono text-2xs tabular-nums text-muted">{round(value, precision)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onCommitStart}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
      />
    </label>
  )
}
