import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Boxes,
  Circle,
  ClipboardPaste,
  Cone,
  Copy,
  Cylinder,
  Download,
  FilePlus,
  FolderOpen,
  Grid3x3,
  Group,
  Keyboard,
  Layers,
  Magnet,
  Palette,
  PanelLeft,
  PanelRight,
  Redo2,
  Save,
  Square,
  SquareStack,
  Torus,
  Trash2,
  Undo2,
  Ungroup,
  Upload,
} from 'lucide-react'
import type { ObjectKind, ShadingMode } from '../core/types'
import { useSceneStore } from '../state/sceneStore'
import { useUIStore } from '../state/uiStore'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from './primitives/Menu'
import { IconButton } from './primitives/Button'
import { Tooltip } from './primitives/Tooltip'
import * as cmd from '../app/commands'
import { frameSelection, setView } from '../render/viewportApi'

const PRIMITIVES: Array<{ kind: ObjectKind; label: string; icon: JSX.Element; shortcut: string }> = [
  { kind: 'cube', label: 'Cube', icon: <Box size={14} />, shortcut: '1' },
  { kind: 'sphere', label: 'Sphere', icon: <Circle size={14} />, shortcut: '2' },
  { kind: 'cylinder', label: 'Cylinder', icon: <Cylinder size={14} />, shortcut: '3' },
  { kind: 'cone', label: 'Cone', icon: <Cone size={14} />, shortcut: '4' },
  { kind: 'torus', label: 'Torus', icon: <Torus size={14} />, shortcut: '5' },
  { kind: 'plane', label: 'Plane', icon: <Square size={14} />, shortcut: '6' },
]

const SHADING: Array<{ id: ShadingMode; label: string; icon: JSX.Element; shortcut: string }> = [
  { id: 'solid', label: 'Solid', icon: <Box size={14} />, shortcut: 'Z' },
  { id: 'material', label: 'Material preview', icon: <Palette size={14} />, shortcut: 'Z' },
  { id: 'wireframe', label: 'Wireframe', icon: <Grid3x3 size={14} />, shortcut: 'Z' },
]

function ProjectName() {
  const name = useSceneStore((s) => s.projectName)
  const dirty = useSceneStore((s) => s.dirty)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setDraft(name), [name])
  useEffect(() => {
    if (editing) requestAnimationFrame(() => inputRef.current?.select())
  }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft.trim() && draft.trim() !== name) cmd.renameProject(draft)
    else setDraft(name)
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setDraft(name)
              setEditing(false)
            }
            e.stopPropagation()
          }}
          className="h-6 w-44 rounded border border-accent bg-sunken px-1.5 text-xs outline-none"
        />
      ) : (
        <button
          type="button"
          onDoubleClick={() => setEditing(true)}
          onClick={() => setEditing(true)}
          title="Rename project"
          className="max-w-[220px] truncate rounded px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-hover hover:text-ink focus-ring"
        >
          {name}
        </button>
      )}
      <span
        title={dirty ? 'Unsaved changes' : 'All changes saved'}
        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${dirty ? 'bg-select' : 'bg-ok/70'}`}
      />
    </div>
  )
}

export function TopBar() {
  const shading = useUIStore((s) => s.shading)
  const setShading = useUIStore((s) => s.setShading)
  const snapEnabled = useUIStore((s) => s.snapEnabled)
  const toggleSnap = useUIStore((s) => s.toggleSnap)
  const showOutliner = useUIStore((s) => s.showOutliner)
  const showProperties = useUIStore((s) => s.showProperties)
  const togglePanel = useUIStore((s) => s.togglePanel)
  const setDialog = useUIStore((s) => s.setDialog)

  const canUndo = useSceneStore((s) => s.past.length > 0)
  const canRedo = useSceneStore((s) => s.future.length > 0)
  const hasSelection = useSceneStore((s) => s.selection.length > 0)

  return (
    <header className="flex h-11 shrink-0 items-center gap-1 border-b border-line bg-panel px-2">
      <div className="flex items-center gap-2 pr-1">
        <svg viewBox="0 0 32 32" className="h-[18px] w-[18px]" aria-hidden>
          <path d="M16 4 27 10.2v11.6L16 28 5 21.8V10.2z" fill="none" stroke="#4c8dff" strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 4v24M5 10.2l11 6.2 11-6.2" fill="none" stroke="#4c8dff" strokeWidth="1.5" strokeLinejoin="round" opacity="0.45" />
        </svg>
        <span className="text-xs font-semibold tracking-[0.14em] text-ink">FORGE3D</span>
      </div>

      <div className="divider-v" />

      <Menu label="File" width={230}>
        {(close) => (
          <>
            <MenuItem icon={<FilePlus size={13} />} shortcut="Ctrl N" onClick={() => { cmd.newProject(); close() }}>
              New Project
            </MenuItem>
            <MenuItem icon={<FolderOpen size={13} />} shortcut="Ctrl O" onClick={() => { setDialog('projects'); close() }}>
              Open Project…
            </MenuItem>
            <MenuItem icon={<Save size={13} />} shortcut="Ctrl S" onClick={() => { void cmd.saveCurrentProject(); close() }}>
              Save Project
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Upload size={13} />} onClick={() => { void cmd.runImport(); close() }}>
              Import Model…
            </MenuItem>
            <MenuLabel>Export</MenuLabel>
            <MenuItem icon={<Download size={13} />} onClick={() => { void cmd.runExport('glb'); close() }}>
              glTF Binary (.glb)
            </MenuItem>
            <MenuItem icon={<Download size={13} />} onClick={() => { void cmd.runExport('gltf'); close() }}>
              glTF (.gltf)
            </MenuItem>
            <MenuItem icon={<Download size={13} />} onClick={() => { void cmd.runExport('obj'); close() }}>
              Wavefront (.obj)
            </MenuItem>
            <MenuItem icon={<Download size={13} />} onClick={() => { void cmd.runExport('stl'); close() }}>
              Stereolithography (.stl)
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Download size={13} />} onClick={() => { cmd.exportProjectFile(); close() }}>
              Project File (.json)
            </MenuItem>
          </>
        )}
      </Menu>

      <Menu label="Edit" width={220}>
        {(close) => (
          <>
            <MenuItem icon={<Undo2 size={13} />} shortcut="Ctrl Z" disabled={!canUndo} onClick={() => { cmd.undo(); close() }}>
              Undo
            </MenuItem>
            <MenuItem icon={<Redo2 size={13} />} shortcut="Ctrl Y" disabled={!canRedo} onClick={() => { cmd.redo(); close() }}>
              Redo
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Copy size={13} />} shortcut="Ctrl C" disabled={!hasSelection} onClick={() => { cmd.copySelection(); close() }}>
              Copy
            </MenuItem>
            <MenuItem icon={<ClipboardPaste size={13} />} shortcut="Ctrl V" onClick={() => { cmd.pasteClipboard(); close() }}>
              Paste
            </MenuItem>
            <MenuItem icon={<SquareStack size={13} />} shortcut="Ctrl D" disabled={!hasSelection} onClick={() => { cmd.duplicateSelection(); close() }}>
              Duplicate
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Group size={13} />} shortcut="Ctrl G" disabled={!hasSelection} onClick={() => { cmd.groupSelection(); close() }}>
              Group
            </MenuItem>
            <MenuItem icon={<Ungroup size={13} />} shortcut="Ctrl Shift G" disabled={!hasSelection} onClick={() => { cmd.ungroupSelection(); close() }}>
              Ungroup
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Trash2 size={13} />} shortcut="Del" danger disabled={!hasSelection} onClick={() => { cmd.deleteSelection(); close() }}>
              Delete
            </MenuItem>
          </>
        )}
      </Menu>

      <Menu label="Add" width={200}>
        {(close) => (
          <>
            <MenuLabel>Mesh</MenuLabel>
            {PRIMITIVES.map((p) => (
              <MenuItem
                key={p.kind}
                icon={p.icon}
                shortcut={`Shift ${p.shortcut}`}
                onClick={() => {
                  cmd.addPrimitive(p.kind)
                  close()
                }}
              >
                {p.label}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem icon={<Boxes size={13} />} onClick={() => { useSceneStore.getState().addGroup([]); close() }}>
              Empty Group
            </MenuItem>
          </>
        )}
      </Menu>

      <Menu label="View" width={210}>
        {(close) => <ViewMenuBody close={close} />}
      </Menu>

      <div className="divider-v" />
      <ProjectName />

      <div className="flex-1" />

      <div className="flex items-center gap-0.5 rounded border border-line bg-sunken p-0.5">
        {SHADING.map((s) => (
          <Tooltip key={s.id} label={s.label} shortcut={s.shortcut} side="bottom">
            <IconButton size="sm" active={shading === s.id} onClick={() => setShading(s.id)} aria-label={s.label}>
              {s.icon}
            </IconButton>
          </Tooltip>
        ))}
      </div>

      <div className="divider-v" />

      <Tooltip label="Snap to grid" shortcut="Ctrl ." side="bottom">
        <IconButton active={snapEnabled} onClick={toggleSnap} aria-label="Snap to grid">
          <Magnet size={15} />
        </IconButton>
      </Tooltip>

      <Tooltip label="Toggle outliner" shortcut="Ctrl 1" side="bottom">
        <IconButton active={showOutliner} onClick={() => togglePanel('outliner')} aria-label="Toggle outliner">
          <PanelLeft size={15} />
        </IconButton>
      </Tooltip>
      <Tooltip label="Toggle properties" shortcut="Ctrl 2" side="bottom">
        <IconButton active={showProperties} onClick={() => togglePanel('properties')} aria-label="Toggle properties">
          <PanelRight size={15} />
        </IconButton>
      </Tooltip>
      <Tooltip label="Keyboard shortcuts" shortcut="?" side="bottom">
        <IconButton onClick={() => setDialog('shortcuts')} aria-label="Keyboard shortcuts">
          <Keyboard size={15} />
        </IconButton>
      </Tooltip>
      <Tooltip label="Projects" shortcut="Ctrl O" side="bottom">
        <IconButton onClick={() => setDialog('projects')} aria-label="Projects">
          <Layers size={15} />
        </IconButton>
      </Tooltip>
    </header>
  )
}

function ViewMenuBody({ close }: { close: () => void }) {
  const env = useSceneStore((s) => s.environment)
  const setEnvironment = useSceneStore((s) => s.setEnvironment)
  return (
    <>
      <MenuLabel>Camera</MenuLabel>
      <MenuItem shortcut="Home" onClick={() => { setView('home'); close() }}>
        Home View
      </MenuItem>
      <MenuItem shortcut="F" onClick={() => { frameSelection(); close() }}>
        Frame Selection
      </MenuItem>
      <MenuItem shortcut="1" onClick={() => { setView('front'); close() }}>
        Front
      </MenuItem>
      <MenuItem shortcut="3" onClick={() => { setView('right'); close() }}>
        Right
      </MenuItem>
      <MenuItem shortcut="7" onClick={() => { setView('top'); close() }}>
        Top
      </MenuItem>
      <MenuSeparator />
      <MenuLabel>Overlays</MenuLabel>
      <MenuItem onClick={() => setEnvironment({ showGrid: !env.showGrid })}>
        {env.showGrid ? 'Hide Grid' : 'Show Grid'}
      </MenuItem>
      <MenuItem onClick={() => setEnvironment({ showAxes: !env.showAxes })}>
        {env.showAxes ? 'Hide Axes' : 'Show Axes'}
      </MenuItem>
      <MenuItem onClick={() => setEnvironment({ shadows: !env.shadows })}>
        {env.shadows ? 'Disable Shadows' : 'Enable Shadows'}
      </MenuItem>
      <MenuItem onClick={() => setEnvironment({ orthographic: !env.orthographic })}>
        {env.orthographic ? 'Perspective Camera' : 'Orthographic Camera'}
      </MenuItem>
    </>
  )
}
