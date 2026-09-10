import type { MeshData, Vec3 } from '../core/types'
import { centroid, normalize } from '../core/math'

export interface EdgeRef {
  /** Sorted vertex pair, the canonical identity of an edge. */
  a: number
  b: number
  key: string
  faces: number[]
}

export const edgeKey = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`)

export function cloneMesh(mesh: MeshData): MeshData {
  return {
    vertices: mesh.vertices.map((v) => [v[0], v[1], v[2]] as Vec3),
    faces: mesh.faces.map((f) => f.slice()),
  }
}

/** All unique edges of the mesh with the faces that use them. */
export function buildEdges(mesh: MeshData): EdgeRef[] {
  const map = new Map<string, EdgeRef>()
  mesh.faces.forEach((face, fi) => {
    for (let i = 0; i < face.length; i++) {
      const a = face[i]
      const b = face[(i + 1) % face.length]
      if (a === b) continue
      const key = edgeKey(a, b)
      let ref = map.get(key)
      if (!ref) {
        ref = { a: Math.min(a, b), b: Math.max(a, b), key, faces: [] }
        map.set(key, ref)
      }
      if (!ref.faces.includes(fi)) ref.faces.push(fi)
    }
  })
  return [...map.values()]
}

export function faceNormal(mesh: MeshData, face: number[]): Vec3 {
  // Newell's method — stable for n-gons and non-planar faces.
  let nx = 0
  let ny = 0
  let nz = 0
  for (let i = 0; i < face.length; i++) {
    const c = mesh.vertices[face[i]]
    const n = mesh.vertices[face[(i + 1) % face.length]]
    if (!c || !n) continue
    nx += (c[1] - n[1]) * (c[2] + n[2])
    ny += (c[2] - n[2]) * (c[0] + n[0])
    nz += (c[0] - n[0]) * (c[1] + n[1])
  }
  return normalize([nx, ny, nz])
}

export function faceCenter(mesh: MeshData, face: number[]): Vec3 {
  return centroid(face.map((i) => mesh.vertices[i]))
}

/** Fan triangulation. Returns triangle indices plus the source face for each triangle. */
export function triangulate(mesh: MeshData): { indices: number[]; triFace: number[] } {
  const indices: number[] = []
  const triFace: number[] = []
  mesh.faces.forEach((face, fi) => {
    for (let i = 1; i < face.length - 1; i++) {
      indices.push(face[0], face[i], face[i + 1])
      triFace.push(fi)
    }
  })
  return { indices, triFace }
}

export interface RenderGeometryData {
  positions: Float32Array
  normals: Float32Array
  /** Source face index per triangle, for face picking. */
  triFace: number[]
  /** Fully averaged normals, used to inflate the selection outline without
   * splitting it at hard edges. */
  outlineNormals: Float32Array
  edgePositions: Float32Array
  vertexPositions: Float32Array
  /** Edge list matching edgePositions, for edge picking. */
  edges: EdgeRef[]
  bounds: { min: Vec3; max: Vec3 }
}

const CREASE_COS = Math.cos((42 * Math.PI) / 180)

/**
 * Builds render buffers from mesh data. Normals are smoothed per vertex but
 * only across faces within the crease angle, so a cube stays sharp and a sphere
 * stays smooth without per-primitive shading flags.
 */
export function buildRenderGeometry(mesh: MeshData): RenderGeometryData {
  const { indices, triFace } = triangulate(mesh)
  const faceNormals = mesh.faces.map((f) => faceNormal(mesh, f))

  const vertexFaces: number[][] = mesh.vertices.map(() => [])
  mesh.faces.forEach((face, fi) => {
    for (const vi of face) {
      const list = vertexFaces[vi]
      if (list && !list.includes(fi)) list.push(fi)
    }
  })

  // Fully averaged per-vertex normals, ignoring the crease angle.
  const smooth: Vec3[] = mesh.vertices.map((_, vi) => {
    let x = 0
    let y = 0
    let z = 0
    for (const fi of vertexFaces[vi] ?? []) {
      const n = faceNormals[fi]
      if (!n) continue
      x += n[0]
      y += n[1]
      z += n[2]
    }
    return normalize([x, y, z])
  })

  const positions = new Float32Array(indices.length * 3)
  const normals = new Float32Array(indices.length * 3)
  const outlineNormals = new Float32Array(indices.length * 3)

  for (let t = 0; t < indices.length; t++) {
    const vi = indices[t]
    const v = mesh.vertices[vi] ?? [0, 0, 0]
    positions[t * 3] = v[0]
    positions[t * 3 + 1] = v[1]
    positions[t * 3 + 2] = v[2]

    const fi = triFace[Math.floor(t / 3)]
    const fn = faceNormals[fi] ?? [0, 1, 0]
    let nx = 0
    let ny = 0
    let nz = 0
    for (const other of vertexFaces[vi] ?? []) {
      const on = faceNormals[other]
      if (!on) continue
      if (on[0] * fn[0] + on[1] * fn[1] + on[2] * fn[2] >= CREASE_COS) {
        nx += on[0]
        ny += on[1]
        nz += on[2]
      }
    }
    const n = normalize([nx, ny, nz])
    const final = n[0] === 0 && n[1] === 0 && n[2] === 0 ? fn : n
    normals[t * 3] = final[0]
    normals[t * 3 + 1] = final[1]
    normals[t * 3 + 2] = final[2]

    const sm = smooth[vi]
    const outline = sm && (sm[0] || sm[1] || sm[2]) ? sm : final
    outlineNormals[t * 3] = outline[0]
    outlineNormals[t * 3 + 1] = outline[1]
    outlineNormals[t * 3 + 2] = outline[2]
  }

  const edges = buildEdges(mesh)
  const edgePositions = new Float32Array(edges.length * 6)
  edges.forEach((e, i) => {
    const a = mesh.vertices[e.a] ?? [0, 0, 0]
    const b = mesh.vertices[e.b] ?? [0, 0, 0]
    edgePositions.set([a[0], a[1], a[2], b[0], b[1], b[2]], i * 6)
  })

  const vertexPositions = new Float32Array(mesh.vertices.length * 3)
  mesh.vertices.forEach((v, i) => vertexPositions.set(v, i * 3))

  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const v of mesh.vertices) {
    for (let i = 0; i < 3; i++) {
      if (v[i] < min[i]) min[i] = v[i]
      if (v[i] > max[i]) max[i] = v[i]
    }
  }
  if (!mesh.vertices.length) {
    min[0] = min[1] = min[2] = 0
    max[0] = max[1] = max[2] = 0
  }

  return {
    positions,
    normals,
    outlineNormals,
    triFace,
    edgePositions,
    vertexPositions,
    edges,
    bounds: { min, max },
  }
}

/** Removes vertices no face references and reindexes the remaining faces. */
export function pruneUnusedVertices(mesh: MeshData): MeshData {
  const used = new Set<number>()
  for (const f of mesh.faces) for (const i of f) used.add(i)
  const remap = new Map<number, number>()
  const vertices: Vec3[] = []
  mesh.vertices.forEach((v, i) => {
    if (used.has(i)) {
      remap.set(i, vertices.length)
      vertices.push([v[0], v[1], v[2]])
    }
  })
  return { vertices, faces: mesh.faces.map((f) => f.map((i) => remap.get(i) ?? 0)) }
}

/** Merges vertices closer than the threshold. Used after imports and boolean-ish edits. */
export function weldVertices(mesh: MeshData, epsilon = 1e-5): MeshData {
  const map = new Map<string, number>()
  const vertices: Vec3[] = []
  const remap: number[] = []
  const q = (n: number) => Math.round(n / epsilon)
  mesh.vertices.forEach((v) => {
    const key = `${q(v[0])}|${q(v[1])}|${q(v[2])}`
    const found = map.get(key)
    if (found !== undefined) {
      remap.push(found)
    } else {
      map.set(key, vertices.length)
      remap.push(vertices.length)
      vertices.push([v[0], v[1], v[2]])
    }
  })
  const faces: number[][] = []
  for (const f of mesh.faces) {
    const mapped: number[] = []
    for (const i of f) {
      const m = remap[i]
      if (mapped[mapped.length - 1] !== m) mapped.push(m)
    }
    if (mapped.length > 2 && mapped[0] === mapped[mapped.length - 1]) mapped.pop()
    if (mapped.length >= 3) faces.push(mapped)
  }
  return { vertices, faces }
}
