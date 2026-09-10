import type { Object3D } from 'three'

/**
 * Live map from scene-object id to the three.js node currently rendering it.
 * The gizmo needs real Object3D handles, which React state cannot carry cheaply.
 */
const registry = new Map<string, Object3D>()

export const registerNode = (id: string, node: Object3D | null) => {
  if (node) registry.set(id, node)
  else registry.delete(id)
}

export const getNode = (id: string) => registry.get(id)
