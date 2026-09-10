import {
  Box,
  Circle,
  Cone,
  Cylinder,
  Focus,
  MousePointer2,
  Move3D,
  Pencil,
  Rotate3D,
  Scale3D,
  Square,
  Torus,
} from 'lucide-react'
import type { ObjectKind, TransformTool } from '../core/types'
import { useUIStore } from '../state/uiStore'
import { useSceneStore } from '../state/sceneStore'
import { IconButton } from './primitives/Button'
import { Tooltip } from './primitives/Tooltip'
import { frameSelection } from '../render/viewportApi'
import * as cmd from '../app/commands'

const TOOLS: Array<{ id: TransformTool; label: string; shortcut: string; icon: JSX.Element }> = [
  { id: 'select', label: 'Select', shortcut: 'Q', icon: <MousePointer2 size={16} /> },
  { id: 'move', label: 'Move', shortcut: 'W', icon: <Move3D size={16} /> },
  { id: 'rotate', label: 'Rotate', shortcut: 'E', icon: <Rotate3D size={16} /> },
  { id: 'scale', label: 'Scale', shortcut: 'R', icon: <Scale3D size={16} /> },
]

const SHAPES: Array<{ kind: ObjectKind; label: string; shortcut: string; icon: JSX.Element }> = [
  { kind: 'cube', label: 'Add cube', shortcut: 'Shift 1', icon: <Box size={16} /> },
  { kind: 'sphere', label: 'Add sphere', shortcut: 'Shift 2', icon: <Circle size={16} /> },
  { kind: 'cylinder', label: 'Add cylinder', shortcut: 'Shift 3', icon: <Cylinder size={16} /> },
  { kind: 'cone', label: 'Add cone', shortcut: 'Shift 4', icon: <Cone size={16} /> },
  { kind: 'torus', label: 'Add torus', shortcut: 'Shift 5', icon: <Torus size={16} /> },
  { kind: 'plane', label: 'Add plane', shortcut: 'Shift 6', icon: <Square size={16} /> },
]

export function ToolRail() {
  const tool = useUIStore((s) => s.tool)
  const setTool = useUIStore((s) => s.setTool)
  const mode = useUIStore((s) => s.mode)
  const canEdit = useSceneStore((s) => s.selection.some((id) => Boolean(s.objects[id]?.mesh)))

  return (
    <nav className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-line bg-panel py-2">
      {TOOLS.map((t) => (
        <Tooltip key={t.id} label={t.label} shortcut={t.shortcut} side="right">
          <IconButton active={tool === t.id} onClick={() => setTool(t.id)} aria-label={t.label}>
            {t.icon}
          </IconButton>
        </Tooltip>
      ))}

      <div className="my-1 h-px w-6 bg-line" />

      <Tooltip label={mode === 'edit' ? 'Leave edit mode' : 'Edit mesh'} shortcut="Tab" side="right">
        <IconButton
          active={mode === 'edit'}
          disabled={mode === 'object' && !canEdit}
          onClick={cmd.toggleEditMode}
          aria-label="Toggle edit mode"
        >
          <Pencil size={16} />
        </IconButton>
      </Tooltip>

      <div className="my-1 h-px w-6 bg-line" />

      {SHAPES.map((s) => (
        <Tooltip key={s.kind} label={s.label} shortcut={s.shortcut} side="right">
          <IconButton onClick={() => cmd.addPrimitive(s.kind)} aria-label={s.label}>
            {s.icon}
          </IconButton>
        </Tooltip>
      ))}

      <div className="flex-1" />

      <Tooltip label="Frame selection" shortcut="F" side="right">
        <IconButton onClick={() => frameSelection()} aria-label="Frame selection">
          <Focus size={16} />
        </IconButton>
      </Tooltip>
    </nav>
  )
}
