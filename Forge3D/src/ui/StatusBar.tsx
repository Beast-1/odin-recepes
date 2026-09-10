import { useMemo } from 'react'
import { Magnet, MousePointer2, Move3D, Pencil, Rotate3D, Scale3D } from 'lucide-react'
import { useSceneStore } from '../state/sceneStore'
import { useUIStore } from '../state/uiStore'
import { objectSummary } from '../io/three-bridge'
import { NumberField } from './primitives/NumberField'

const TOOL_ICON = {
  select: <MousePointer2 size={12} />,
  move: <Move3D size={12} />,
  rotate: <Rotate3D size={12} />,
  scale: <Scale3D size={12} />,
}

export function StatusBar() {
  const objects = useSceneStore((s) => s.objects)
  const selection = useSceneStore((s) => s.selection)
  const dirty = useSceneStore((s) => s.dirty)
  const projectId = useSceneStore((s) => s.projectId)
  const past = useSceneStore((s) => s.past.length)

  const tool = useUIStore((s) => s.tool)
  const mode = useUIStore((s) => s.mode)
  const shading = useUIStore((s) => s.shading)
  const snapEnabled = useUIStore((s) => s.snapEnabled)
  const snapTranslate = useUIStore((s) => s.snapTranslate)
  const setSnap = useUIStore((s) => s.setSnap)
  const toggleSnap = useUIStore((s) => s.toggleSnap)
  const lastAction = useUIStore((s) => s.lastAction)
  const busy = useUIStore((s) => s.busy)

  const stats = useMemo(() => objectSummary(objects), [objects])
  const activeName = selection.length === 1 ? objects[selection[0]]?.name : null

  return (
    <footer className="flex h-7 shrink-0 items-center gap-2 border-t border-line bg-panel px-2 text-2xs text-dim">
      <span
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold uppercase tracking-[0.08em] ${
          mode === 'edit' ? 'bg-select/15 text-select' : 'bg-accent/12 text-accent'
        }`}
      >
        {mode === 'edit' ? <Pencil size={10} /> : null}
        {mode === 'edit' ? 'Edit Mode' : 'Object Mode'}
      </span>

      <span className="inline-flex items-center gap-1 capitalize text-muted">
        {TOOL_ICON[tool]}
        {tool}
      </span>

      <span className="divider-v" />

      <span className="text-muted">
        {selection.length === 0
          ? 'Nothing selected'
          : activeName
            ? activeName
            : `${selection.length} objects selected`}
      </span>

      <span className="divider-v" />
      <span className="capitalize">{shading}</span>

      <span className="flex-1 truncate px-2 text-center text-muted">{busy ?? lastAction}</span>

      <button
        type="button"
        onClick={toggleSnap}
        className={`inline-flex h-5 items-center gap-1 rounded px-1.5 transition-colors hover:text-ink ${
          snapEnabled ? 'bg-accent/12 text-accent' : ''
        }`}
        title="Toggle snapping (Ctrl .)"
      >
        <Magnet size={11} />
        Snap
      </button>
      <div className="w-[58px]">
        <NumberField
          value={snapTranslate}
          step={0.005}
          min={0.001}
          precision={3}
          onChange={(snapTranslate) => setSnap({ snapTranslate })}
          disabled={!snapEnabled}
        />
      </div>

      <span className="divider-v" />

      <span className="font-mono tabular-nums">
        {stats.meshes} obj · {stats.vertices.toLocaleString()} verts · {stats.faces.toLocaleString()} faces
      </span>

      <span className="divider-v" />
      <span className="font-mono tabular-nums" title="Undo steps available">
        {past} undo
      </span>

      <span className="divider-v" />
      <span className={dirty ? 'text-select' : 'text-ok/80'}>
        {dirty ? 'Unsaved' : projectId ? 'Saved' : 'New'}
      </span>
    </footer>
  )
}
