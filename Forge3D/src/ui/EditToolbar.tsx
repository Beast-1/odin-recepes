import { CircleDot, Component, Diameter, Maximize2, MoveDiagonal, Repeat, Shrink, Slice, Square, Trash2, X } from 'lucide-react'
import type { ElementMode } from '../core/types'
import { useUIStore } from '../state/uiStore'
import { useSceneStore } from '../state/sceneStore'
import { Button, IconButton } from './primitives/Button'
import { Tooltip } from './primitives/Tooltip'
import { NumberField } from './primitives/NumberField'
import * as cmd from '../app/commands'

const MODES: Array<{ id: ElementMode; label: string; shortcut: string; icon: JSX.Element }> = [
  { id: 'vertex', label: 'Vertex select', shortcut: '1', icon: <CircleDot size={14} /> },
  { id: 'edge', label: 'Edge select', shortcut: '2', icon: <Slice size={14} /> },
  { id: 'face', label: 'Face select', shortcut: '3', icon: <Square size={14} /> },
]

export function EditToolbar() {
  const mode = useUIStore((s) => s.mode)
  const elementMode = useUIStore((s) => s.elementMode)
  const setElementMode = useUIStore((s) => s.setElementMode)
  const selection = useUIStore((s) => s.elementSelection)
  const amounts = useUIStore((s) => s.opAmounts)
  const setOpAmount = useUIStore((s) => s.setOpAmount)
  const editTarget = useUIStore((s) => s.editTarget)
  const targetName = useSceneStore((s) => (editTarget ? (s.objects[editTarget]?.name ?? '') : ''))

  if (mode !== 'edit') return null

  const counts = `${selection.vertices.length}v · ${selection.edges.length}e · ${selection.faces.length}f`
  const hasFaces = selection.faces.length > 0
  const hasAny = selection.vertices.length + selection.edges.length + selection.faces.length > 0

  return (
    <div className="pointer-events-none absolute inset-x-2 top-3 z-20 flex justify-center">
      <div className="fade-in pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-md border border-line-strong bg-panel/95 px-1.5 py-1 shadow-pop backdrop-blur-sm">
      <span className="px-1 text-2xs font-semibold uppercase tracking-[0.09em] text-select">Edit</span>
      <span className="max-w-[130px] truncate px-1 text-xs text-muted">{targetName}</span>

      <div className="divider-v" />

      {MODES.map((m) => (
        <Tooltip key={m.id} label={m.label} shortcut={m.shortcut} side="bottom">
          <IconButton active={elementMode === m.id} onClick={() => setElementMode(m.id)} aria-label={m.label}>
            {m.icon}
          </IconButton>
        </Tooltip>
      ))}

      <div className="divider-v" />

      <div className="flex items-center gap-1">
        <Tooltip label="Extrude selected faces" shortcut="E" side="bottom">
          <Button variant="ghost" icon={<MoveDiagonal size={13} />} disabled={!hasFaces} onClick={cmd.extrudeSelection}>
            Extrude
          </Button>
        </Tooltip>
        <div className="w-[62px]">
          <NumberField value={amounts.extrude} step={0.005} onChange={(v) => setOpAmount('extrude', v)} precision={3} />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip label="Inset selected faces" shortcut="I" side="bottom">
          <Button variant="ghost" icon={<Shrink size={13} />} disabled={!hasFaces} onClick={cmd.insetSelection}>
            Inset
          </Button>
        </Tooltip>
        <div className="w-[62px]">
          <NumberField value={amounts.inset} step={0.005} min={0} onChange={(v) => setOpAmount('inset', v)} precision={3} />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip label="Bevel selection corners" shortcut="B" side="bottom">
          <Button variant="ghost" icon={<Diameter size={13} />} disabled={!hasAny} onClick={cmd.bevelSelection}>
            Bevel
          </Button>
        </Tooltip>
        <div className="w-[62px]">
          <NumberField value={amounts.bevel} step={0.005} min={0} onChange={(v) => setOpAmount('bevel', v)} precision={3} />
        </div>
      </div>

      <div className="divider-v" />

      <Tooltip label="Subdivide faces" shortcut="Ctrl B" side="bottom">
        <IconButton onClick={cmd.subdivideSelection} aria-label="Subdivide">
          <Component size={15} />
        </IconButton>
      </Tooltip>
      <Tooltip label="Flip normals" shortcut="Alt N" side="bottom">
        <IconButton onClick={cmd.flipSelectionNormals} aria-label="Flip normals">
          <Repeat size={15} />
        </IconButton>
      </Tooltip>
      <Tooltip label="Delete selection" shortcut="X" side="bottom">
        <IconButton disabled={!hasAny} onClick={cmd.deleteElementSelection} aria-label="Delete elements">
          <Trash2 size={15} />
        </IconButton>
      </Tooltip>
      <Tooltip label="Select all" shortcut="Ctrl A" side="bottom">
        <IconButton onClick={cmd.selectAllElements} aria-label="Select all elements">
          <Maximize2 size={15} />
        </IconButton>
      </Tooltip>

      <div className="divider-v" />
      <span className="px-1 font-mono text-2xs tabular-nums text-dim">{counts}</span>

      <Tooltip label="Back to object mode" shortcut="Tab" side="bottom">
        <IconButton onClick={cmd.toggleEditMode} aria-label="Exit edit mode">
          <X size={15} />
        </IconButton>
      </Tooltip>
      </div>
    </div>
  )
}
