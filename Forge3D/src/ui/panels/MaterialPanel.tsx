import { Palette } from 'lucide-react'
import { useSceneStore } from '../../state/sceneStore'
import { PALETTE } from '../../materials/material'
import { Slider } from '../primitives/Slider'
import { Section, EmptyState } from '../primitives/Panel'

function ColorRow({
  label,
  value,
  onChange,
  onCommitStart,
  swatches,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onCommitStart: () => void
  swatches?: boolean
}) {
  return (
    <div className="mb-2">
      <span className="field-label mb-1 block">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onFocus={onCommitStart}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-9 shrink-0 rounded"
          aria-label={label}
        />
        <input
          value={value.toUpperCase()}
          onChange={(e) => {
            const next = e.target.value.trim()
            if (/^#[0-9a-fA-F]{6}$/.test(next)) onChange(next.toLowerCase())
          }}
          onFocus={onCommitStart}
          onKeyDown={(e) => e.stopPropagation()}
          className="h-6 min-w-0 flex-1 rounded border border-line bg-sunken px-1.5 font-mono text-2xs uppercase outline-none transition-colors hover:border-line-strong focus:border-accent"
        />
      </div>
      {swatches && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              title={c.toUpperCase()}
              onClick={() => {
                onCommitStart()
                onChange(c)
              }}
              className={`h-4 w-4 rounded-sm border transition-transform hover:scale-110 ${
                value.toLowerCase() === c ? 'border-ink' : 'border-line-strong'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function MaterialPanel() {
  const selection = useSceneStore((s) => s.selection)
  const objects = useSceneStore((s) => s.objects)
  const setMaterial = useSceneStore((s) => s.setMaterial)
  const record = useSceneStore((s) => s.record)

  const targets = selection.filter((id) => objects[id]?.mesh)
  const active = targets.length ? objects[targets[targets.length - 1]] : undefined

  if (!active) {
    return (
      <EmptyState
        icon={<Palette size={24} strokeWidth={1.4} />}
        title="No material"
        hint="Select a mesh object to edit its surface properties."
      />
    )
  }

  const m = active.material
  const apply = (patch: Parameters<typeof setMaterial>[1]) => setMaterial(targets, patch)

  return (
    <>
      <Section title="Surface">
        <ColorRow label="Base color" value={m.color} onChange={(color) => apply({ color })} onCommitStart={record} swatches />
        <Slider label="Metallic" value={m.metalness} onChange={(metalness) => apply({ metalness })} onCommitStart={record} />
        <Slider label="Roughness" value={m.roughness} onChange={(roughness) => apply({ roughness })} onCommitStart={record} />
        <Slider label="Opacity" value={m.opacity} onChange={(opacity) => apply({ opacity })} onCommitStart={record} />
      </Section>

      <Section title="Emission">
        <ColorRow label="Emission color" value={m.emissive} onChange={(emissive) => apply({ emissive })} onCommitStart={record} />
        <Slider
          label="Emission strength"
          value={m.emissiveIntensity}
          min={0}
          max={5}
          step={0.05}
          onChange={(emissiveIntensity) => apply({ emissiveIntensity })}
          onCommitStart={record}
        />
      </Section>

      <Section title="Shading" defaultOpen={false}>
        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={m.flatShading}
              onChange={(e) => {
                record()
                apply({ flatShading: e.target.checked })
              }}
              className="h-3 w-3 accent-[#4c8dff]"
            />
            Flat shading
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={m.doubleSided}
              onChange={(e) => {
                record()
                apply({ doubleSided: e.target.checked })
              }}
              className="h-3 w-3 accent-[#4c8dff]"
            />
            Double sided
          </label>
        </div>
        {targets.length > 1 && (
          <p className="mt-2 text-2xs text-dim">Changes apply to all {targets.length} selected meshes.</p>
        )}
      </Section>
    </>
  )
}
