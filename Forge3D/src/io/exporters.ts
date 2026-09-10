import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import type { SceneSnapshot } from '../core/types'
import { disposeScene, snapshotToThreeScene } from './three-bridge'

export type ExportFormat = 'glb' | 'gltf' | 'obj' | 'stl'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

const safeName = (name: string) => name.trim().replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'forge3d'

export async function exportScene(
  snapshot: SceneSnapshot,
  format: ExportFormat,
  projectName: string,
  onlyIds?: string[],
): Promise<string> {
  const root = snapshotToThreeScene(snapshot, onlyIds)
  const base = safeName(projectName)
  try {
    if (format === 'obj') {
      const text = new OBJExporter().parse(root)
      download(new Blob([text], { type: 'text/plain' }), `${base}.obj`)
      return `${base}.obj`
    }
    if (format === 'stl') {
      const text = new STLExporter().parse(root, { binary: false }) as unknown as string
      download(new Blob([text], { type: 'model/stl' }), `${base}.stl`)
      return `${base}.stl`
    }
    const binary = format === 'glb'
    const result = await new Promise<ArrayBuffer | Record<string, unknown>>((resolve, reject) => {
      new GLTFExporter().parse(root, resolve, reject, { binary, onlyVisible: false })
    })
    if (binary) {
      download(new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' }), `${base}.glb`)
      return `${base}.glb`
    }
    download(new Blob([JSON.stringify(result, null, 2)], { type: 'model/gltf+json' }), `${base}.gltf`)
    return `${base}.gltf`
  } finally {
    disposeScene(root)
  }
}

export function exportProjectJson(snapshot: SceneSnapshot, projectName: string) {
  const payload = { format: 'forge3d-project', version: 1, name: projectName, scene: snapshot }
  download(new Blob([JSON.stringify(payload)], { type: 'application/json' }), `${safeName(projectName)}.forge3d.json`)
}
