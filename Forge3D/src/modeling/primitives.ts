import type { MeshData, ObjectKind, Vec3 } from '../core/types'

export interface PrimitiveOptions {
  size?: number
  segments?: number
  rings?: number
  radius?: number
  tube?: number
  height?: number
}

function grid(rows: number, cols: number, at: (r: number, c: number) => Vec3) {
  const verts: Vec3[] = []
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) verts.push(at(r, c))
  const idx = (r: number, c: number) => r * (cols + 1) + c
  return { verts, idx }
}

export function makeCube(size = 1): MeshData {
  const s = size / 2
  const vertices: Vec3[] = [
    [-s, -s, -s],
    [s, -s, -s],
    [s, s, -s],
    [-s, s, -s],
    [-s, -s, s],
    [s, -s, s],
    [s, s, s],
    [-s, s, s],
  ]
  const faces = [
    [4, 5, 6, 7], // +Z
    [1, 0, 3, 2], // -Z
    [5, 1, 2, 6], // +X
    [0, 4, 7, 3], // -X
    [7, 6, 2, 3], // +Y
    [0, 1, 5, 4], // -Y
  ]
  return { vertices, faces }
}

export function makePlane(size = 2, segments = 1): MeshData {
  const half = size / 2
  const { verts, idx } = grid(segments, segments, (r, c) => [
    -half + (c / segments) * size,
    0,
    -half + (r / segments) * size,
  ])
  const faces: number[][] = []
  for (let r = 0; r < segments; r++) {
    for (let c = 0; c < segments; c++) {
      faces.push([idx(r, c), idx(r + 1, c), idx(r + 1, c + 1), idx(r, c + 1)])
    }
  }
  return { vertices: verts, faces }
}

export function makeSphere(radius = 0.5, segments = 24, rings = 16): MeshData {
  const vertices: Vec3[] = []
  const faces: number[][] = []
  const top = vertices.push([0, radius, 0]) - 1
  for (let r = 1; r < rings; r++) {
    const phi = (r / rings) * Math.PI
    for (let s = 0; s < segments; s++) {
      const theta = (s / segments) * Math.PI * 2
      vertices.push([
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
      ])
    }
  }
  const bottom = vertices.push([0, -radius, 0]) - 1
  const ring = (r: number, s: number) => 1 + (r - 1) * segments + (s % segments)

  for (let s = 0; s < segments; s++) faces.push([top, ring(1, s + 1), ring(1, s)])
  for (let r = 1; r < rings - 1; r++) {
    for (let s = 0; s < segments; s++) {
      faces.push([ring(r, s), ring(r, s + 1), ring(r + 1, s + 1), ring(r + 1, s)])
    }
  }
  for (let s = 0; s < segments; s++) faces.push([bottom, ring(rings - 1, s), ring(rings - 1, s + 1)])
  return { vertices, faces }
}

export function makeCylinder(radius = 0.5, height = 1, segments = 24): MeshData {
  const h = height / 2
  const vertices: Vec3[] = []
  for (let s = 0; s < segments; s++) {
    const t = (s / segments) * Math.PI * 2
    vertices.push([Math.cos(t) * radius, h, Math.sin(t) * radius])
  }
  for (let s = 0; s < segments; s++) {
    const t = (s / segments) * Math.PI * 2
    vertices.push([Math.cos(t) * radius, -h, Math.sin(t) * radius])
  }
  const faces: number[][] = []
  for (let s = 0; s < segments; s++) {
    const n = (s + 1) % segments
    faces.push([s, n, segments + n, segments + s])
  }
  // Cap winding: the top cap must face +Y, the bottom cap -Y.
  faces.push(Array.from({ length: segments }, (_, i) => i).reverse())
  faces.push(Array.from({ length: segments }, (_, i) => segments + i))
  return { vertices, faces }
}

export function makeCone(radius = 0.5, height = 1, segments = 24): MeshData {
  const h = height / 2
  const vertices: Vec3[] = []
  for (let s = 0; s < segments; s++) {
    const t = (s / segments) * Math.PI * 2
    vertices.push([Math.cos(t) * radius, -h, Math.sin(t) * radius])
  }
  const apex = vertices.push([0, h, 0]) - 1
  const faces: number[][] = []
  for (let s = 0; s < segments; s++) {
    const n = (s + 1) % segments
    faces.push([n, s, apex])
  }
  faces.push(Array.from({ length: segments }, (_, i) => i))
  return { vertices, faces }
}

export function makeTorus(radius = 0.5, tube = 0.18, segments = 32, rings = 16): MeshData {
  const vertices: Vec3[] = []
  for (let i = 0; i < segments; i++) {
    const u = (i / segments) * Math.PI * 2
    for (let j = 0; j < rings; j++) {
      const v = (j / rings) * Math.PI * 2
      vertices.push([
        (radius + tube * Math.cos(v)) * Math.cos(u),
        tube * Math.sin(v),
        (radius + tube * Math.cos(v)) * Math.sin(u),
      ])
    }
  }
  const at = (i: number, j: number) => (i % segments) * rings + (j % rings)
  const faces: number[][] = []
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < rings; j++) {
      faces.push([at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i + 1, j)])
    }
  }
  return { vertices, faces }
}

export function createPrimitive(kind: ObjectKind, options: PrimitiveOptions = {}): MeshData {
  switch (kind) {
    case 'cube':
      return makeCube(options.size ?? 1)
    case 'plane':
      return makePlane(options.size ?? 2, options.segments ?? 1)
    case 'sphere':
      return makeSphere(options.radius ?? 0.5, options.segments ?? 24, options.rings ?? 16)
    case 'cylinder':
      return makeCylinder(options.radius ?? 0.5, options.height ?? 1, options.segments ?? 24)
    case 'cone':
      return makeCone(options.radius ?? 0.5, options.height ?? 1, options.segments ?? 24)
    case 'torus':
      return makeTorus(options.radius ?? 0.5, options.tube ?? 0.18, options.segments ?? 32, options.rings ?? 16)
    default:
      return makeCube(1)
  }
}
