import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import type { SceneSnapshot } from '../core/types'
import { weldVertices } from '../modeling/mesh'
import { collectImportedMeshes, disposeScene, type ImportedMesh } from './three-bridge'

export const IMPORT_ACCEPT = '.glb,.gltf,.obj,.stl,.json'

const extensionOf = (filename: string) => filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()

export interface ImportResult {
  kind: 'meshes' | 'project'
  name: string
  meshes: ImportedMesh[]
  project?: { name: string; scene: SceneSnapshot }
}

export async function importFile(file: File): Promise<ImportResult> {
  const ext = extensionOf(file.name)
  const baseName = file.name.replace(/\.[^.]+$/, '')

  if (ext === 'json') {
    const parsed = JSON.parse(await file.text()) as { format?: string; name?: string; scene?: SceneSnapshot }
    if (parsed.format !== 'forge3d-project' || !parsed.scene) {
      throw new Error('That JSON file is not a FORGE3D project.')
    }
    return { kind: 'project', name: baseName, meshes: [], project: { name: parsed.name ?? baseName, scene: parsed.scene } }
  }

  if (ext === 'stl') {
    const geometry = new STLLoader().parse(await file.arrayBuffer())
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial())
    mesh.name = baseName
    const meshes = collectImportedMeshes(mesh, baseName).map((m) => ({ ...m, mesh: weldVertices(m.mesh) }))
    disposeScene(mesh)
    return { kind: 'meshes', name: baseName, meshes }
  }

  if (ext === 'obj') {
    const root = new OBJLoader().parse(await file.text())
    const meshes = collectImportedMeshes(root, baseName).map((m) => ({ ...m, mesh: weldVertices(m.mesh) }))
    disposeScene(root)
    return { kind: 'meshes', name: baseName, meshes }
  }

  if (ext === 'glb' || ext === 'gltf') {
    const buffer = await file.arrayBuffer()
    const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
      new GLTFLoader().parse(buffer, '', (result) => resolve(result as unknown as { scene: THREE.Group }), reject)
    })
    const meshes = collectImportedMeshes(gltf.scene, baseName).map((m) => ({ ...m, mesh: weldVertices(m.mesh) }))
    disposeScene(gltf.scene)
    return { kind: 'meshes', name: baseName, meshes }
  }

  throw new Error(`Unsupported file type ".${ext}".`)
}

export function pickFiles(accept: string, multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.style.display = 'none'
    document.body.appendChild(input)
    input.addEventListener('change', () => {
      resolve(input.files ? [...input.files] : [])
      input.remove()
    })
    input.addEventListener('cancel', () => {
      resolve([])
      input.remove()
    })
    input.click()
  })
}
