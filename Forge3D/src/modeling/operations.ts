import type { MeshData, Vec3 } from '../core/types'
import { add, cross, dot, length, mul, normalize, sub } from '../core/math'
import { buildEdges, cloneMesh, edgeKey, faceCenter, faceNormal, pruneUnusedVertices } from './mesh'

export interface ElementSelection {
  vertices: number[]
  edges: string[]
  faces: number[]
}

export const emptySelection = (): ElementSelection => ({ vertices: [], edges: [], faces: [] })

/** Every vertex touched by the given selection, in any element mode. */
export function selectionVertices(mesh: MeshData, sel: ElementSelection): number[] {
  const set = new Set<number>(sel.vertices)
  for (const key of sel.edges) {
    const [a, b] = key.split('_').map(Number)
    set.add(a)
    set.add(b)
  }
  for (const fi of sel.faces) for (const v of mesh.faces[fi] ?? []) set.add(v)
  return [...set].filter((i) => mesh.vertices[i] !== undefined)
}

export function selectionCenter(mesh: MeshData, sel: ElementSelection): Vec3 | null {
  const verts = selectionVertices(mesh, sel)
  if (!verts.length) return null
  let x = 0
  let y = 0
  let z = 0
  for (const i of verts) {
    const v = mesh.vertices[i]
    x += v[0]
    y += v[1]
    z += v[2]
  }
  return [x / verts.length, y / verts.length, z / verts.length]
}

function averageNormal(mesh: MeshData, faces: number[]): Vec3 {
  let n: Vec3 = [0, 0, 0]
  for (const fi of faces) {
    const f = mesh.faces[fi]
    if (!f) continue
    n = add(n, faceNormal(mesh, f))
  }
  const norm = normalize(n)
  return norm[0] === 0 && norm[1] === 0 && norm[2] === 0 ? [0, 1, 0] : norm
}

export interface OperationResult {
  mesh: MeshData
  selection: ElementSelection
}

/**
 * Region extrude: the selected faces are lifted along their averaged normal and
 * the open boundary of the region is closed with side walls.
 */
export function extrudeFaces(mesh: MeshData, faces: number[], distance: number): OperationResult {
  if (!faces.length || distance === 0) return { mesh, selection: { vertices: [], edges: [], faces } }
  const selected = new Set(faces)
  const next = cloneMesh(mesh)
  const dir = mul(averageNormal(mesh, faces), distance)

  // Count how often each directed edge appears inside the selected region;
  // an edge used once is on the region boundary and needs a wall.
  const usage = new Map<string, number>()
  for (const fi of selected) {
    const f = mesh.faces[fi]
    if (!f) continue
    for (let i = 0; i < f.length; i++) {
      const key = edgeKey(f[i], f[(i + 1) % f.length])
      usage.set(key, (usage.get(key) ?? 0) + 1)
    }
  }

  const remap = new Map<number, number>()
  for (const fi of selected) {
    for (const vi of mesh.faces[fi] ?? []) {
      if (remap.has(vi)) continue
      const v = mesh.vertices[vi]
      remap.set(vi, next.vertices.push(add(v, dir)) - 1)
    }
  }

  const walls: number[][] = []
  for (const fi of selected) {
    const f = mesh.faces[fi]
    if (!f) continue
    for (let i = 0; i < f.length; i++) {
      const a = f[i]
      const b = f[(i + 1) % f.length]
      if ((usage.get(edgeKey(a, b)) ?? 0) !== 1) continue
      walls.push([a, b, remap.get(b)!, remap.get(a)!])
    }
    next.faces[fi] = f.map((vi) => remap.get(vi)!)
  }
  next.faces.push(...walls)
  return { mesh: next, selection: { vertices: [], edges: [], faces: [...selected] } }
}

/** Individual inset: each selected face gets a smaller copy joined by a ring of quads. */
export function insetFaces(mesh: MeshData, faces: number[], amount: number): OperationResult {
  if (!faces.length || amount <= 0) return { mesh, selection: { vertices: [], edges: [], faces } }
  const next = cloneMesh(mesh)
  const resulting: number[] = []

  for (const fi of faces) {
    const f = mesh.faces[fi]
    if (!f || f.length < 3) continue
    const center = faceCenter(mesh, f)
    // Never collapse the face: cap the inset at 45% of the shortest centre ray.
    let maxRay = Infinity
    for (const vi of f) maxRay = Math.min(maxRay, length(sub(mesh.vertices[vi], center)))
    const t = Math.min(amount, maxRay * 0.45)

    const inner = f.map((vi) => {
      const v = mesh.vertices[vi]
      const toCenter = normalize(sub(center, v))
      return next.vertices.push(add(v, mul(toCenter, t))) - 1
    })

    for (let i = 0; i < f.length; i++) {
      const a = f[i]
      const b = f[(i + 1) % f.length]
      next.faces.push([a, b, inner[(i + 1) % f.length], inner[i]])
    }
    next.faces[fi] = inner
    resulting.push(fi)
  }
  return { mesh: next, selection: { vertices: [], edges: [], faces: resulting } }
}

/**
 * Corner bevel. Every selected vertex is truncated: each incident edge gains a
 * new vertex at `amount` along it, incident faces are re-cornered onto those
 * vertices, and the resulting ring is capped with a new face.
 */
export function bevelVertices(mesh: MeshData, vertices: number[], amount: number): OperationResult {
  if (!vertices.length || amount <= 0) {
    return { mesh, selection: { vertices, edges: [], faces: [] } }
  }
  const selected = new Set(vertices)
  const next: MeshData = { vertices: mesh.vertices.map((v) => [...v] as Vec3), faces: [] }

  const edges = buildEdges(mesh)
  const neighbours = new Map<number, number[]>()
  for (const e of edges) {
    if (selected.has(e.a)) neighbours.set(e.a, [...(neighbours.get(e.a) ?? []), e.b])
    if (selected.has(e.b)) neighbours.set(e.b, [...(neighbours.get(e.b) ?? []), e.a])
  }

  // One new vertex per (selected vertex, incident edge) pair.
  const cut = new Map<string, number>()
  for (const [v, ns] of neighbours) {
    const p = mesh.vertices[v]
    for (const u of ns) {
      const d = sub(mesh.vertices[u], p)
      const len = length(d)
      // Both ends may be bevelled, so never take more than 45% of an edge.
      const t = Math.min(amount, len * 0.45)
      cut.set(`${v}:${u}`, next.vertices.push(add(p, mul(normalize(d), t))) - 1)
    }
  }

  // Rebuild every face with truncated corners.
  const cornerPairs = new Map<number, Array<[number, number]>>()
  for (const f of mesh.faces) {
    const loop: number[] = []
    for (let i = 0; i < f.length; i++) {
      const c = f[i]
      if (!selected.has(c)) {
        loop.push(c)
        continue
      }
      const prev = f[(i - 1 + f.length) % f.length]
      const nxt = f[(i + 1) % f.length]
      const a = cut.get(`${c}:${prev}`)
      const b = cut.get(`${c}:${nxt}`)
      if (a === undefined || b === undefined) {
        loop.push(c)
        continue
      }
      loop.push(a, b)
      cornerPairs.set(c, [...(cornerPairs.get(c) ?? []), [a, b]])
    }
    if (loop.length >= 3) next.faces.push(loop)
  }

  const capFaces: number[] = []
  for (const v of selected) {
    const pairs = cornerPairs.get(v)
    if (!pairs || pairs.length < 3) continue
    // Faces around v chain together: one face's leading cut vertex is the
    // trailing cut vertex of its neighbour. Walking that gives the cap loop.
    const link = new Map<number, number>()
    for (const [a, b] of pairs) link.set(b, a)
    const loop: number[] = []
    let cursor = pairs[0][1]
    const guard = pairs.length + 1
    for (let i = 0; i < guard; i++) {
      loop.push(cursor)
      const nextV = link.get(cursor)
      if (nextV === undefined || nextV === loop[0]) break
      cursor = nextV
    }
    if (loop.length < 3) continue

    // Orient the cap away from the original vertex.
    const pts = loop.map((i) => next.vertices[i])
    const n = normalize(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])))
    const outward = sub(pts[0], mesh.vertices[v])
    capFaces.push(next.faces.push(dot(n, outward) >= 0 ? loop : loop.slice().reverse()) - 1)
  }

  // pruneUnusedVertices preserves face order, so the cap indices stay valid.
  return { mesh: pruneUnusedVertices(next), selection: { vertices: [], edges: [], faces: capFaces } }
}

/** Deletes whatever the selection covers and drops orphaned vertices. */
export function deleteElements(
  mesh: MeshData,
  sel: ElementSelection,
  mode: 'vertex' | 'edge' | 'face',
): OperationResult {
  const doomed = new Set<number>()
  if (mode === 'face') {
    for (const fi of sel.faces) doomed.add(fi)
  } else if (mode === 'vertex') {
    const verts = new Set(sel.vertices)
    mesh.faces.forEach((f, fi) => {
      if (f.some((v) => verts.has(v))) doomed.add(fi)
    })
  } else {
    const keys = new Set(sel.edges)
    mesh.faces.forEach((f, fi) => {
      for (let i = 0; i < f.length; i++) {
        if (keys.has(edgeKey(f[i], f[(i + 1) % f.length]))) {
          doomed.add(fi)
          return
        }
      }
    })
  }
  const kept = mesh.faces.filter((_, fi) => !doomed.has(fi))
  return { mesh: pruneUnusedVertices({ vertices: mesh.vertices, faces: kept }), selection: emptySelection() }
}

/** Splits every face into quads around its centre — a simple, predictable subdivide. */
export function subdivideFaces(mesh: MeshData, faces: number[]): OperationResult {
  if (!faces.length) return { mesh, selection: { vertices: [], edges: [], faces } }
  const target = new Set(faces)
  const next = cloneMesh(mesh)
  const midpoints = new Map<string, number>()
  const midpoint = (a: number, b: number) => {
    const key = edgeKey(a, b)
    const found = midpoints.get(key)
    if (found !== undefined) return found
    const p = mul(add(next.vertices[a], next.vertices[b]), 0.5)
    const idx = next.vertices.push(p) - 1
    midpoints.set(key, idx)
    return idx
  }

  const created: number[] = []
  const rebuilt: number[][] = []
  next.faces.forEach((f, fi) => {
    if (!target.has(fi)) {
      rebuilt.push(f)
      return
    }
    const center = next.vertices.push(faceCenter(next, f)) - 1
    for (let i = 0; i < f.length; i++) {
      const prev = f[(i - 1 + f.length) % f.length]
      const cur = f[i]
      const nxt = f[(i + 1) % f.length]
      created.push(rebuilt.push([midpoint(prev, cur), cur, midpoint(cur, nxt), center]) - 1)
    }
  })
  next.faces = rebuilt
  return { mesh: next, selection: { vertices: [], edges: [], faces: created } }
}

/** Reverses the winding of the selected faces (or all faces when none given). */
export function flipNormals(mesh: MeshData, faces?: number[]): MeshData {
  const target = faces && faces.length ? new Set(faces) : null
  return {
    vertices: mesh.vertices.map((v) => [...v] as Vec3),
    faces: mesh.faces.map((f, fi) => (!target || target.has(fi) ? f.slice().reverse() : f.slice())),
  }
}
