import { useEffect, useState } from 'react'
import { Box, Info, RotateCcw } from 'lucide-react'
import type { Vec3 } from '../../core/types'
import { DEG, RAD, round } from '../../core/math'
import { useSceneStore } from '../../state/sceneStore'
import { useUIStore } from '../../state/uiStore'
import { NumberField } from '../primitives/NumberField'
import { Section, EmptyState } from '../primitives/Panel'
import { IconButton } from '../primitives/Button'
import { Tooltip } from '../primitives/Tooltip'

const AXES = ['x', 'y', 'z'] as const

interface VectorRowProps {
  label: string
  value: Vec3
  onChange: (value: Vec3) => void
  onCommitStart: () => void
  step: number
  suffix?: string
  disabled?: boolean
  onReset?: () => void
}

function VectorRow({ label, value, onChange, onCommitStart, step, suffix, disabled, onReset }: VectorRowProps) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-1 flex items-center justify-between">
        <span className="field-label">{label}</span>
        {onReset && (
          <Tooltip label={`Reset ${label.toLowerCase()}`} side="left">
            <IconButton size="sm" onClick={onReset} aria-label={`Reset ${label}`} disabled={disabled}>
              <RotateCcw size={11} />
            </IconButton>
          </Tooltip>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {AXES.map((axis, i) => (
          <NumberField
            key={axis}
            label={axis.toUpperCase()}
            accent={axis}
            value={value[i]}
            step={step}
            suffix={suffix}
            disabled={disabled}
            onCommitStart={onCommitStart}
            onChange={(next) => {
              const copy = [...value] as Vec3
              copy[i] = next
              onChange(copy)
            }}
          />
        ))}
      </div>
    </div>
  )
}

/** Renaming is committed on blur or Enter so typing never floods the undo stack. */
function NameField({
  id,
  name,
  onCommit,
}: {
  id: string
  name: string
  onCommit: (id: string, name: string) => void
}) {
  const [draft, setDraft] = useState(name)
  useEffect(() => setDraft(name), [name, id])

  const commit = () => {
    if (draft.trim() && draft.trim() !== name) onCommit(id, draft)
    else setDraft(name)
  }

  return (
    <label className="block">
      <span className="field-label mb-1 block">Name</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit()
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') setDraft(name)
          e.stopPropagation()
        }}
        className="h-6 w-full rounded border border-line bg-sunken px-1.5 text-xs outline-none transition-colors hover:border-line-strong focus:border-accent"
      />
    </label>
  )
}

export function Properties() {
  const selection = useSceneStore((s) => s.selection)
  const objects = useSceneStore((s) => s.objects)
  const setTransform = useSceneStore((s) => s.setTransform)
  const record = useSceneStore((s) => s.record)
  const renameObject = useSceneStore((s) => s.renameObject)
  const setFlag = useSceneStore((s) => s.setFlag)
  const mode = useUIStore((s) => s.mode)

  const id = selection[selection.length - 1]
  const object = id ? objects[id] : undefined

  if (!object) {
    return (
      <EmptyState
        icon={<Box size={24} strokeWidth={1.4} />}
        title="No selection"
        hint="Select an object in the viewport or outliner to inspect its transform."
      />
    )
  }

  const disabled = object.locked
  const rotationDegrees = object.rotation.map((r) => round(r * RAD, 3)) as Vec3

  return (
    <>
      <Section title="Object">
        <div className="space-y-2">
          <NameField id={object.id} name={object.name} onCommit={renameObject} />
          <div className="flex items-center gap-3 pt-0.5">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={object.visible}
                onChange={(e) => setFlag([object.id], 'visible', e.target.checked)}
                className="h-3 w-3 accent-[#4c8dff]"
              />
              Visible
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={object.locked}
                onChange={(e) => setFlag([object.id], 'locked', e.target.checked)}
                className="h-3 w-3 accent-[#4c8dff]"
              />
              Locked
            </label>
          </div>
          {selection.length > 1 && (
            <p className="flex items-start gap-1.5 rounded border border-line bg-sunken px-2 py-1.5 text-2xs leading-relaxed text-dim">
              <Info size={11} className="mt-[2px] shrink-0" />
              {selection.length} objects selected — fields edit the active object; the gizmo moves all of them.
            </p>
          )}
        </div>
      </Section>

      <Section title="Transform">
        <VectorRow
          label="Position"
          value={object.position}
          step={0.01}
          disabled={disabled}
          onCommitStart={record}
          onChange={(position) => setTransform(object.id, { position })}
          onReset={() => {
            record()
            setTransform(object.id, { position: [0, 0, 0] })
          }}
        />
        <VectorRow
          label="Rotation"
          value={rotationDegrees}
          step={0.5}
          suffix="°"
          disabled={disabled}
          onCommitStart={record}
          onChange={(rotation) =>
            setTransform(object.id, { rotation: rotation.map((r) => r * DEG) as Vec3 })
          }
          onReset={() => {
            record()
            setTransform(object.id, { rotation: [0, 0, 0] })
          }}
        />
        <VectorRow
          label="Scale"
          value={object.scale}
          step={0.01}
          disabled={disabled}
          onCommitStart={record}
          onChange={(scale) => setTransform(object.id, { scale })}
          onReset={() => {
            record()
            setTransform(object.id, { scale: [1, 1, 1] })
          }}
        />
      </Section>

      <Section title="Statistics" defaultOpen={false}>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt className="text-dim">Type</dt>
          <dd className="text-right capitalize text-muted">{object.kind}</dd>
          <dt className="text-dim">Vertices</dt>
          <dd className="text-right font-mono tabular-nums text-muted">{object.mesh?.vertices.length ?? 0}</dd>
          <dt className="text-dim">Faces</dt>
          <dd className="text-right font-mono tabular-nums text-muted">{object.mesh?.faces.length ?? 0}</dd>
          <dt className="text-dim">Parent</dt>
          <dd className="truncate text-right text-muted">{object.parent ? objects[object.parent]?.name : '—'}</dd>
          <dt className="text-dim">Mode</dt>
          <dd className="text-right capitalize text-muted">{mode}</dd>
        </dl>
      </Section>
    </>
  )
}
