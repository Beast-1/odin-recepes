import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Boxes,
  ChevronDown,
  ChevronRight,
  Circle,
  Cone,
  Cylinder,
  Eye,
  EyeOff,
  Gem,
  Lock,
  LockOpen,
  Search,
  Square,
  Torus,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import type { ObjectKind } from '../../core/types'
import { isAncestor, useSceneStore } from '../../state/sceneStore'
import { useUIStore } from '../../state/uiStore'
import { EmptyState } from '../primitives/Panel'

const ICONS: Record<ObjectKind, JSX.Element> = {
  cube: <Box size={13} />,
  sphere: <Circle size={13} />,
  cylinder: <Cylinder size={13} />,
  cone: <Cone size={13} />,
  torus: <Torus size={13} />,
  plane: <Square size={13} />,
  mesh: <Gem size={13} />,
  group: <Boxes size={13} />,
}

interface RowProps {
  id: string
  depth: number
  filter: string
  collapsed: Set<string>
  toggleCollapse: (id: string) => void
  dragId: string | null
  setDragId: (id: string | null) => void
  dropTarget: string | null
  setDropTarget: (id: string | null) => void
}

function Row({ id, depth, filter, collapsed, toggleCollapse, dragId, setDragId, dropTarget, setDropTarget }: RowProps) {
  const object = useSceneStore((s) => s.objects[id])
  const children = useSceneStore(useShallow((s) => s.order.filter((c) => s.objects[c]?.parent === id)))
  const objects = useSceneStore((s) => s.objects)
  const selection = useSceneStore((s) => s.selection)
  const select = useSceneStore((s) => s.select)
  const toggleSelect = useSceneStore((s) => s.toggleSelect)
  const setFlag = useSceneStore((s) => s.setFlag)
  const renameObject = useSceneStore((s) => s.renameObject)
  const setParent = useSceneStore((s) => s.setParent)
  const enterEdit = useUIStore((s) => s.enterEdit)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) requestAnimationFrame(() => inputRef.current?.select())
  }, [editing])

  const matches = useMemo(() => {
    if (!filter) return true
    const term = filter.toLowerCase()
    const check = (nodeId: string): boolean => {
      const node = objects[nodeId]
      if (!node) return false
      if (node.name.toLowerCase().includes(term)) return true
      return Object.values(objects).some((o) => o.parent === nodeId && check(o.id))
    }
    return check(id)
  }, [filter, id, objects])

  if (!object || !matches) return null

  const isSelected = selection.includes(id)
  const isOpen = !collapsed.has(id)
  const isDropTarget = dropTarget === id && dragId !== id

  const commitRename = () => {
    setEditing(false)
    if (draft.trim()) renameObject(id, draft)
  }

  return (
    <>
      <div
        draggable={!editing}
        onDragStart={(e) => {
          setDragId(id)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragEnd={() => {
          setDragId(null)
          setDropTarget(null)
        }}
        onDragOver={(e) => {
          if (!dragId || dragId === id || isAncestor(objects, dragId, id)) return
          e.preventDefault()
          e.stopPropagation()
          setDropTarget(id)
        }}
        onDragLeave={() => {
          if (dropTarget === id) setDropTarget(null)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (dragId && dragId !== id && !isAncestor(objects, dragId, id)) setParent(dragId, id)
          setDragId(null)
          setDropTarget(null)
        }}
        onClick={(e) => {
          if (e.shiftKey || e.ctrlKey || e.metaKey) toggleSelect(id)
          else select([id])
        }}
        onDoubleClick={() => {
          if (object.mesh) enterEdit(id)
        }}
        className={`group flex h-[26px] cursor-default items-center gap-1 border-l-2 pr-1 transition-colors ${
          isSelected
            ? 'border-l-select bg-accent/12 text-ink'
            : 'border-l-transparent text-muted hover:bg-hover'
        } ${isDropTarget ? 'ring-1 ring-inset ring-accent' : ''} ${object.visible ? '' : 'opacity-45'}`}
        style={{ paddingLeft: 4 + depth * 12 }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleCollapse(id)
          }}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-dim transition-colors hover:text-ink ${
            children.length ? '' : 'invisible'
          }`}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
        >
          {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>

        <span className={`shrink-0 ${isSelected ? 'text-select' : 'text-dim'}`}>{ICONS[object.kind]}</span>

        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setEditing(false)
              e.stopPropagation()
            }}
            className="h-5 min-w-0 flex-1 rounded border border-accent bg-sunken px-1 text-xs outline-none"
          />
        ) : (
          <span
            className="min-w-0 flex-1 truncate text-xs"
            onDoubleClick={(e) => {
              e.stopPropagation()
              setDraft(object.name)
              setEditing(true)
            }}
          >
            {object.name}
          </span>
        )}

        <button
          type="button"
          title={object.locked ? 'Unlock' : 'Lock'}
          onClick={(e) => {
            e.stopPropagation()
            setFlag([id], 'locked', !object.locked)
          }}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-dim transition-colors hover:text-ink ${
            object.locked ? 'text-select opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {object.locked ? <Lock size={12} /> : <LockOpen size={12} />}
        </button>
        <button
          type="button"
          title={object.visible ? 'Hide' : 'Show'}
          onClick={(e) => {
            e.stopPropagation()
            setFlag([id], 'visible', !object.visible)
          }}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-dim transition-colors hover:text-ink ${
            object.visible ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
          }`}
        >
          {object.visible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
      </div>

      {isOpen &&
        children.map((child) => (
          <Row
            key={child}
            id={child}
            depth={depth + 1}
            filter={filter}
            collapsed={collapsed}
            toggleCollapse={toggleCollapse}
            dragId={dragId}
            setDragId={setDragId}
            dropTarget={dropTarget}
            setDropTarget={setDropTarget}
          />
        ))}
    </>
  )
}

export function Outliner() {
  const roots = useSceneStore(useShallow((s) => s.order.filter((id) => !s.objects[id]?.parent)))
  const count = useSceneStore((s) => s.order.length)
  const setParent = useSceneStore((s) => s.setParent)
  const [filter, setFilter] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="panel-title">
        <span className="flex-1">Outliner</span>
        <span className="font-mono text-2xs normal-case tracking-normal text-dim">{count}</span>
      </div>

      <div className="border-b border-line p-1.5">
        <div className="flex h-6 items-center gap-1.5 rounded border border-line bg-sunken px-1.5 focus-within:border-accent">
          <Search size={11} className="shrink-0 text-dim" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter objects"
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-dim"
          />
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto py-0.5"
        onDragOver={(e) => {
          if (dragId) e.preventDefault()
        }}
        onDrop={(e) => {
          e.preventDefault()
          if (dragId) setParent(dragId, null)
          setDragId(null)
          setDropTarget(null)
        }}
      >
        {roots.length === 0 ? (
          <EmptyState
            icon={<Boxes size={24} strokeWidth={1.4} />}
            title="Scene is empty"
            hint="Add a primitive from the tool rail or press Shift + 1."
          />
        ) : (
          roots.map((id) => (
            <Row
              key={id}
              id={id}
              depth={0}
              filter={filter}
              collapsed={collapsed}
              toggleCollapse={toggleCollapse}
              dragId={dragId}
              setDragId={setDragId}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
            />
          ))
        )}
      </div>
    </div>
  )
}
