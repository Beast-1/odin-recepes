import * as THREE from 'three'
import type { MaterialDef, MeshData, SceneObject, SceneSnapshot, Vec3 } from '../core/types'
import { buildRenderGeometry } from '../modeling/mesh'
import { makeThreeMaterial, readMaterialDef } from '../materials/material'

export function meshDataToGeometry(mesh: MeshData): THREE.BufferGeometry {
  const { positions, normals } = buildRenderGeometry(mesh)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geometry.computeBoundingSphere()
  geometry.computeBoundingBox()
  return geometry
}

/** Builds a throwaway three.js hierarchy from the scene, used only for export. */
export function snapshotToThreeScene(snapshot: SceneSnapshot, onlyIds?: string[]): THREE.Group {
  const root = new THREE.Group()
  root.name = 'Forge3D'
  const nodes = new Map<string, THREE.Object3D>()
  const included = onlyIds && onlyIds.length ? new Set(onlyIds) : null

  const ordered = snapshot.order.filter((id) => {
    const o = snapshot.objects[id]
    if (!o) return false
    if (!included) return true
    if (included.has(id)) return true
    let p = o.parent
    while (p) {
      if (included.has(p)) return true
      p = snapshot.objects[p]?.parent ?? null
    }
    return false
  })

  for (const id of ordered) {
    const o = snapshot.objects[id]
    let node: THREE.Object3D
    if (o.mesh && o.mesh.faces.length) {
      node = new THREE.Mesh(meshDataToGeometry(o.mesh), makeThreeMaterial(o.material))
    } else {
      node = new THREE.Group()
    }
    node.name = o.name
    node.visible = o.visible
    node.position.fromArray(o.position)
    node.rotation.set(o.rotation[0], o.rotation[1], o.rotation[2])
    node.scale.fromArray(o.scale)
    nodes.set(id, node)
  }

  for (const id of ordered) {
    const o = snapshot.objects[id]
    const node = nodes.get(id)!
    const parent = o.parent ? nodes.get(o.parent) : undefined
    ;(parent ?? root).add(node)
  }
  root.updateMatrixWorld(true)
  return root
}

export interface ImportedMesh {
  name: string
  mesh: MeshData
  material: Partial<MaterialDef>
}

function geometryToMeshData(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4): MeshData {
  const source = geometry.index ? geometry.toNonIndexed() : geometry
  const position = source.getAttribute('position')
  if (!position) return { vertices: [], faces: [] }
  const vertices: Vec3[] = []
  const faces: number[][] = []
  const v = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position as THREE.BufferAttribute, i).applyMatrix4(matrix)
    vertices.push([v.x, v.y, v.z])
  }
  for (let i = 0; i + 2 < position.count; i += 3) faces.push([i, i + 1, i + 2])
  if (source !== geometry) source.dispose()
  return { vertices, faces }
}

export function collectImportedMeshes(root: THREE.Object3D, fallbackName: string): ImportedMesh[] {
  const out: ImportedMesh[] = []
  root.updateMatrixWorld(true)
  root.traverse((node) => {
    if (!(node as THREE.Mesh).isMesh) return
    const mesh = node as THREE.Mesh
    const data = geometryToMeshData(mesh.geometry, mesh.matrixWorld)
    if (!data.faces.length) return
    const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    out.push({ name: mesh.name || fallbackName, mesh: data, material: readMaterialDef(source) })
  })
  return out
}

export function disposeScene(root: THREE.Object3D) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (mesh.isMesh) {
      mesh.geometry?.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of materials) m?.dispose()
    }
  })
}

export function objectSummary(objects: Record<string, SceneObject>) {
  let vertices = 0
  let faces = 0
  let meshes = 0
  for (const o of Object.values(objects)) {
    if (!o.mesh) continue
    meshes++
    vertices += o.mesh.vertices.length
    faces += o.mesh.faces.length
  }
  return { meshes, vertices, faces }
}
