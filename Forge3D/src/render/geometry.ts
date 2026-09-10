import * as THREE from 'three'
import type { MeshData } from '../core/types'
import { buildRenderGeometry, type RenderGeometryData } from '../modeling/mesh'

const cache = new WeakMap<MeshData, RenderGeometryData>()

export function renderDataFor(mesh: MeshData): RenderGeometryData {
  let data = cache.get(mesh)
  if (!data) {
    data = buildRenderGeometry(mesh)
    cache.set(mesh, data)
  }
  return data
}

export function surfaceGeometry(mesh: MeshData): THREE.BufferGeometry {
  const data = renderDataFor(mesh)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3))
  geometry.setAttribute('outlineNormal', new THREE.BufferAttribute(data.outlineNormals, 3))
  geometry.computeBoundingSphere()
  geometry.computeBoundingBox()
  return geometry
}

export function edgeGeometry(mesh: MeshData): THREE.BufferGeometry {
  const data = renderDataFor(mesh)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(data.edgePositions, 3))
  geometry.computeBoundingSphere()
  return geometry
}

export function pointGeometry(mesh: MeshData): THREE.BufferGeometry {
  const data = renderDataFor(mesh)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(data.vertexPositions, 3))
  geometry.computeBoundingSphere()
  return geometry
}

/** Geometry containing only the given faces — used to highlight a face selection. */
export function faceSubsetGeometry(mesh: MeshData, faces: number[]): THREE.BufferGeometry {
  const positions: number[] = []
  for (const fi of faces) {
    const face = mesh.faces[fi]
    if (!face) continue
    for (let i = 1; i < face.length - 1; i++) {
      for (const vi of [face[0], face[i], face[i + 1]]) {
        const v = mesh.vertices[vi]
        if (v) positions.push(v[0], v[1], v[2])
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function subsetLineGeometry(mesh: MeshData, keys: string[]): THREE.BufferGeometry {
  const positions: number[] = []
  for (const key of keys) {
    const [a, b] = key.split('_').map(Number)
    const va = mesh.vertices[a]
    const vb = mesh.vertices[b]
    if (va && vb) positions.push(va[0], va[1], va[2], vb[0], vb[1], vb[2])
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geometry
}

export function subsetPointGeometry(mesh: MeshData, indices: number[]): THREE.BufferGeometry {
  const positions: number[] = []
  for (const i of indices) {
    const v = mesh.vertices[i]
    if (v) positions.push(v[0], v[1], v[2])
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geometry
}
