import { useUIStore } from '../../state/uiStore'
import { Modal } from './Modal'

const GROUPS: Array<{ title: string; items: Array<[string, string]> }> = [
  {
    title: 'Navigation',
    items: [
      ['Left drag', 'Orbit'],
      ['Right drag', 'Pan'],
      ['Wheel', 'Zoom'],
      ['F', 'Frame selection'],
      ['Home', 'Home view'],
      ['1 / 3 / 7', 'Front / Right / Top view'],
    ],
  },
  {
    title: 'Tools',
    items: [
      ['Q', 'Select tool'],
      ['W', 'Move gizmo'],
      ['E', 'Rotate gizmo'],
      ['R', 'Scale gizmo'],
      ['Z', 'Cycle shading mode'],
      ['Ctrl + .', 'Toggle grid snapping'],
      ['X', 'Toggle world / local space'],
    ],
  },
  {
    title: 'Objects',
    items: [
      ['Shift + 1…6', 'Add cube / sphere / cylinder / cone / torus / plane'],
      ['Ctrl + D', 'Duplicate'],
      ['Ctrl + C / V', 'Copy / paste'],
      ['Ctrl + G', 'Group selection'],
      ['Ctrl + Shift + G', 'Ungroup'],
      ['Ctrl + A', 'Select all'],
      ['H', 'Hide selection'],
      ['Alt + H', 'Show everything'],
      ['Delete', 'Delete selection'],
    ],
  },
  {
    title: 'Edit mode',
    items: [
      ['Tab', 'Enter / leave edit mode'],
      ['1 / 2 / 3', 'Vertex / edge / face select'],
      ['E', 'Extrude faces'],
      ['I', 'Inset faces'],
      ['B', 'Bevel corners'],
      ['Ctrl + B', 'Subdivide'],
      ['Alt + N', 'Flip normals'],
      ['X', 'Delete elements'],
      ['Ctrl + A', 'Select all elements'],
    ],
  },
  {
    title: 'Project',
    items: [
      ['Ctrl + S', 'Save project'],
      ['Ctrl + O', 'Open project'],
      ['Ctrl + N', 'New project'],
      ['Ctrl + Z', 'Undo'],
      ['Ctrl + Y / Ctrl + Shift + Z', 'Redo'],
      ['Ctrl + 1 / 2', 'Toggle outliner / properties'],
    ],
  },
]

export function ShortcutsDialog() {
  const setDialog = useUIStore((s) => s.setDialog)
  return (
    <Modal
      title="Keyboard shortcuts"
      subtitle="Shortcuts are disabled while a text field has focus"
      onClose={() => setDialog(null)}
      width={720}
    >
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 p-5 sm:grid-cols-2">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 text-2xs font-semibold uppercase tracking-[0.09em] text-dim">{group.title}</h3>
            <dl className="space-y-1">
              {group.items.map(([key, description]) => (
                <div key={key} className="flex items-baseline gap-3">
                  <dt className="w-[150px] shrink-0">
                    <kbd className="rounded border border-line-strong bg-sunken px-1.5 py-0.5 font-mono text-2xs text-muted">
                      {key}
                    </kbd>
                  </dt>
                  <dd className="text-xs text-muted">{description}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  )
}
