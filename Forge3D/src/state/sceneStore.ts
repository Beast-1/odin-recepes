import { create } from 'zustand'
import type {
  EnvironmentSettings,
  MaterialDef,
  MeshData,
  ObjectKind,
  SceneObject,
  SceneSnapshot,
  Vec3,
} from '../core/types'
import { createPrimitive } from '../modeling/primitives'
import { DEFAULT_ENVIRONMENT, DEFAULT_MATERIAL } from './defaults'

const HISTORY_LIMIT = 100

let idCounter = 0
export const nextId = () => `obj_${Date.now().toString(36)}_${(idCounter++).toString(36)}`

const KIND_LABEL: Record<ObjectKind, string> = {
  cube: 'Cube',
  sphere: 'Sphere',
  cylinder: 'Cylinder',
  cone: 'Cone',
  torus: 'Torus',
  plane: 'Plane',
  mesh: 'Mesh',
  group: 'Group',
}

function uniqueName(existing: Record<string, SceneObject>, base: string) {
  const taken = new Set(Object.values(existing).map((o) => o.name))
  if (!taken.has(base)) return base
  for (let i = 1; i < 10000; i++) {
    const candidate = `${base}.${String(i).padStart(3, '0')}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}.${Date.now()}`
}

const cloneObject = (o: SceneObject): SceneObject => ({
  ...o,
  position: [...o.position] as Vec3,
  rotation: [...o.rotation] as Vec3,
  scale: [...o.scale] as Vec3,
  material: { ...o.material },
  mesh: o.mesh ? { vertices: o.mesh.vertices.map((v) => [...v] as Vec3), faces: o.mesh.faces.map((f) => [...f]) } : undefined,
})

export function cloneSnapshot(s: SceneSnapshot): SceneSnapshot {
  const objects: Record<string, SceneObject> = {}
  for (const [id, o] of Object.entries(s.objects)) objects[id] = cloneObject(o)
  return {
    objects,
    order: [...s.order],
    selection: [...s.selection],
    environment: { ...s.environment, keyPosition: [...s.environment.keyPosition] as Vec3 },
  }
}

export interface SceneStore extends SceneSnapshot {
  past: SceneSnapshot[]
  future: SceneSnapshot[]
  clipboard: SceneObject[]
  projectId: string | null
  projectName: string
  dirty: boolean

  /** Pushes the current state onto the undo stack. Call before a mutation. */
  record: () => void
  undo: () => void
  redo: () => void

  addObject: (kind: ObjectKind, position?: Vec3) => string
  addGroup: (childIds?: string[]) => string
  deleteObjects: (ids: string[]) => void
  duplicateObjects: (ids: string[]) => string[]
  renameObject: (id: string, name: string) => void
  setTransform: (id: string, patch: Partial<Pick<SceneObject, 'position' | 'rotation' | 'scale'>>) => void
  setMaterial: (ids: string[], patch: Partial<MaterialDef>) => void
  setParent: (id: string, parent: string | null) => void
  ungroupObjects: (ids: string[]) => void
  setFlag: (ids: string[], flag: 'visible' | 'locked', value: boolean) => void
  updateMesh: (id: string, mesh: MeshData) => void
  addMeshObject: (name: string, mesh: MeshData, material?: Partial<MaterialDef>) => string
  setEnvironment: (patch: Partial<EnvironmentSettings>) => void

  select: (ids: string[]) => void
  toggleSelect: (id: string) => void
  selectAll: () => void
  clearSelection: () => void

  copy: () => void
  paste: () => string[]

  loadSnapshot: (snapshot: SceneSnapshot, projectId: string | null, projectName: string) => void
  newScene: () => void
  markSaved: (projectId: string, name: string) => void
  snapshot: () => SceneSnapshot
}

function descendantsOf(objects: Record<string, SceneObject>, id: string): string[] {
  const out: string[] = []
  const walk = (parent: string) => {
    for (const o of Object.values(objects)) {
      if (o.parent === parent) {
        out.push(o.id)
        walk(o.id)
      }
    }
  }
  walk(id)
  return out
}

export function isAncestor(objects: Record<string, SceneObject>, ancestor: string, of: string): boolean {
  let cur = objects[of]?.parent ?? null
  while (cur) {
    if (cur === ancestor) return true
    cur = objects[cur]?.parent ?? null
  }
  return false
}

/** Selected ids with no selected ancestor — the roots a group transform applies to. */
export function topLevelSelection(objects: Record<string, SceneObject>, selection: string[]): string[] {
  return selection.filter((id) => !selection.some((other) => other !== id && isAncestor(objects, other, id)))
}

function makeStarterScene(): SceneSnapshot {
  const id = nextId()
  const objects: Record<string, SceneObject> = {
    [id]: {
      id,
      name: 'Cube',
      kind: 'cube',
      parent: null,
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      locked: false,
      material: { ...DEFAULT_MATERIAL },
      mesh: createPrimitive('cube'),
    },
  }
  return { objects, order: [id], selection: [id], environment: { ...DEFAULT_ENVIRONMENT } }
}

export const useSceneStore = create<SceneStore>((set, get) => {
  const starter = makeStarterScene()

  /**
   * Hot-path update: only the touched objects are copied, so gizmo drags and
   * slider scrubs never deep-clone the whole scene. No history entry is pushed;
   * callers record() once at the start of an interaction instead.
   */
  const patchObjects = (ids: string[], mutate: (object: SceneObject) => SceneObject | void) => {
    const state = get()
    let changed = false
    const objects = { ...state.objects }
    for (const id of ids) {
      const current = objects[id]
      if (!current) continue
      // Shallow copy: mesh data is always replaced wholesale, never mutated,
      // so sharing the reference with history snapshots is safe.
      const draft: SceneObject = {
        ...current,
        position: [...current.position] as Vec3,
        rotation: [...current.rotation] as Vec3,
        scale: [...current.scale] as Vec3,
        material: { ...current.material },
      }
      const result = mutate(draft)
      objects[id] = result ?? draft
      changed = true
    }
    if (changed) set({ objects, dirty: true })
  }

  const commit = (mutate: (draft: SceneSnapshot) => void, options: { history?: boolean } = {}) => {
    const state = get()
    const draft = cloneSnapshot({
      objects: state.objects,
      order: state.order,
      selection: state.selection,
      environment: state.environment,
    })
    mutate(draft)
    const past = options.history === false ? state.past : [...state.past, cloneSnapshot(state)].slice(-HISTORY_LIMIT)
    set({
      objects: draft.objects,
      order: draft.order,
      selection: draft.selection,
      environment: draft.environment,
      past,
      future: options.history === false ? state.future : [],
      dirty: true,
    })
  }

  return {
    ...starter,
    past: [],
    future: [],
    clipboard: [],
    projectId: null,
    projectName: 'Untitled Project',
    dirty: false,

    snapshot: () => {
      const s = get()
      return cloneSnapshot({ objects: s.objects, order: s.order, selection: s.selection, environment: s.environment })
    },

    record: () => {
      const s = get()
      set({ past: [...s.past, cloneSnapshot(s)].slice(-HISTORY_LIMIT), future: [] })
    },

    undo: () => {
      const s = get()
      const prev = s.past[s.past.length - 1]
      if (!prev) return
      set({
        ...prev,
        past: s.past.slice(0, -1),
        future: [...s.future, cloneSnapshot(s)].slice(-HISTORY_LIMIT),
        dirty: true,
      })
    },

    redo: () => {
      const s = get()
      const nextState = s.future[s.future.length - 1]
      if (!nextState) return
      set({
        ...nextState,
        past: [...s.past, cloneSnapshot(s)].slice(-HISTORY_LIMIT),
        future: s.future.slice(0, -1),
        dirty: true,
      })
    },

    addObject: (kind, position) => {
      const id = nextId()
      commit((draft) => {
        draft.objects[id] = {
          id,
          name: uniqueName(draft.objects, KIND_LABEL[kind]),
          kind,
          parent: null,
          position: position ?? [0, kind === 'plane' ? 0 : 0.5, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          locked: false,
          material: { ...DEFAULT_MATERIAL },
          mesh: kind === 'group' ? undefined : createPrimitive(kind),
        }
        draft.order.push(id)
        draft.selection = [id]
      })
      return id
    },

    addMeshObject: (name, mesh, material) => {
      const id = nextId()
      commit((draft) => {
        draft.objects[id] = {
          id,
          name: uniqueName(draft.objects, name),
          kind: 'mesh',
          parent: null,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          locked: false,
          material: { ...DEFAULT_MATERIAL, ...material },
          mesh,
        }
        draft.order.push(id)
        draft.selection = [id]
      })
      return id
    },

    addGroup: (childIds) => {
      const id = nextId()
      commit((draft) => {
        const members = (childIds ?? []).filter((c) => draft.objects[c])
        const roots = topLevelSelection(draft.objects, members)
        draft.objects[id] = {
          id,
          name: uniqueName(draft.objects, 'Group'),
          kind: 'group',
          parent: null,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          locked: false,
          material: { ...DEFAULT_MATERIAL },
        }
        draft.order.push(id)
        for (const child of roots) draft.objects[child].parent = id
        draft.selection = [id]
      })
      return id
    },

    deleteObjects: (ids) => {
      commit((draft) => {
        const doomed = new Set<string>()
        for (const id of ids) {
          if (!draft.objects[id]) continue
          doomed.add(id)
          for (const d of descendantsOf(draft.objects, id)) doomed.add(d)
        }
        for (const id of doomed) delete draft.objects[id]
        draft.order = draft.order.filter((id) => !doomed.has(id))
        draft.selection = draft.selection.filter((id) => !doomed.has(id))
      })
    },

    duplicateObjects: (ids) => {
      const created: string[] = []
      commit((draft) => {
        const roots = topLevelSelection(draft.objects, ids.filter((id) => draft.objects[id]))
        const cloneTree = (sourceId: string, parent: string | null): string => {
          const source = draft.objects[sourceId]
          const id = nextId()
          const copy = cloneObject(source)
          copy.id = id
          copy.parent = parent
          copy.name = uniqueName(draft.objects, source.name.replace(/\.\d{3}$/, ''))
          draft.objects[id] = copy
          draft.order.push(id)
          const children = draft.order.filter((c) => draft.objects[c]?.parent === sourceId)
          for (const child of children) cloneTree(child, id)
          return id
        }
        for (const root of roots) created.push(cloneTree(root, draft.objects[root].parent))
        draft.selection = created
      })
      return created
    },

    renameObject: (id, name) => {
      commit((draft) => {
        const o = draft.objects[id]
        if (!o) return
        const trimmed = name.trim()
        if (!trimmed || trimmed === o.name) return
        const others = { ...draft.objects }
        delete others[id]
        o.name = uniqueName(others, trimmed)
      })
    },

    setTransform: (id, patch) => {
      patchObjects([id], (o) => {
        if (o.locked) return
        if (patch.position) o.position = [...patch.position] as Vec3
        if (patch.rotation) o.rotation = [...patch.rotation] as Vec3
        if (patch.scale) o.scale = [...patch.scale] as Vec3
      })
    },

    setMaterial: (ids, patch) => {
      patchObjects(ids, (o) => {
        o.material = { ...o.material, ...patch }
      })
    },

    setParent: (id, parent) => {
      commit((draft) => {
        const o = draft.objects[id]
        if (!o || id === parent) return
        if (parent && (!draft.objects[parent] || isAncestor(draft.objects, id, parent))) return
        o.parent = parent
      })
    },

    ungroupObjects: (ids) => {
      commit((draft) => {
        const groups = ids.filter((id) => draft.objects[id]?.kind === 'group')
        for (const groupId of groups) {
          const parent = draft.objects[groupId]?.parent ?? null
          for (const o of Object.values(draft.objects)) {
            if (o.parent === groupId) o.parent = parent
          }
          delete draft.objects[groupId]
        }
        const removed = new Set(groups)
        draft.order = draft.order.filter((id) => !removed.has(id))
        draft.selection = draft.selection.filter((id) => !removed.has(id))
      })
    },

    setFlag: (ids, flag, value) => {
      commit((draft) => {
        for (const id of ids) {
          const o = draft.objects[id]
          if (o) o[flag] = value
        }
      })
    },

    updateMesh: (id, mesh) => {
      patchObjects([id], (o) => {
        o.mesh = mesh
      })
    },

    setEnvironment: (patch) => {
      commit((draft) => Object.assign(draft.environment, patch), { history: false })
    },

    select: (ids) => set({ selection: [...new Set(ids)] }),

    toggleSelect: (id) => {
      const s = get()
      set({ selection: s.selection.includes(id) ? s.selection.filter((x) => x !== id) : [...s.selection, id] })
    },

    selectAll: () => set({ selection: get().order.filter((id) => !get().objects[id]?.locked) }),

    clearSelection: () => set({ selection: [] }),

    copy: () => {
      const s = get()
      const roots = topLevelSelection(s.objects, s.selection)
      const collected: SceneObject[] = []
      for (const id of roots) {
        collected.push(cloneObject(s.objects[id]))
        for (const d of descendantsOf(s.objects, id)) collected.push(cloneObject(s.objects[d]))
      }
      set({ clipboard: collected })
    },

    paste: () => {
      const created: string[] = []
      const clipboard = get().clipboard
      if (!clipboard.length) return created
      commit((draft) => {
        const remap = new Map<string, string>()
        for (const o of clipboard) remap.set(o.id, nextId())
        for (const o of clipboard) {
          const id = remap.get(o.id)!
          const copy = cloneObject(o)
          copy.id = id
          copy.parent = o.parent && remap.has(o.parent) ? remap.get(o.parent)! : null
          copy.name = uniqueName(draft.objects, o.name.replace(/\.\d{3}$/, ''))
          if (!copy.parent) copy.position = [copy.position[0] + 0.5, copy.position[1], copy.position[2] + 0.5]
          draft.objects[id] = copy
          draft.order.push(id)
          if (!copy.parent) created.push(id)
        }
        draft.selection = created
      })
      return created
    },

    loadSnapshot: (snapshot, projectId, projectName) => {
      const clean = cloneSnapshot(snapshot)
      set({
        ...clean,
        environment: { ...DEFAULT_ENVIRONMENT, ...clean.environment },
        past: [],
        future: [],
        projectId,
        projectName,
        dirty: false,
      })
    },

    newScene: () => {
      set({ ...makeStarterScene(), past: [], future: [], projectId: null, projectName: 'Untitled Project', dirty: false })
    },

    markSaved: (projectId, name) => set({ projectId, projectName: name, dirty: false }),
  }
})
