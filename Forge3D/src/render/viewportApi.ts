import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useSceneStore } from '../state/sceneStore'
import { getNode } from './registry'

interface ViewportRefs {
  controls: OrbitControlsImpl | null
  camera: THREE.Camera | null
}

export const viewportRefs: ViewportRefs = { controls: null, camera: null }

const box = new THREE.Box3()
const size = new THREE.Vector3()
const center = new THREE.Vector3()

function boundsOf(ids: string[]): THREE.Box3 | null {
  box.makeEmpty()
  let found = false
  for (const id of ids) {
    const node = getNode(id)
    if (!node) continue
    node.updateMatrixWorld(true)
    const local = new THREE.Box3().setFromObject(node)
    if (local.isEmpty()) continue
    box.union(local)
    found = true
  }
  return found ? box : null
}

/** Frames the current selection, or the whole scene when nothing is selected. */
export function frameSelection() {
  const state = useSceneStore.getState()
  const ids = state.selection.length ? state.selection : state.order
  const bounds = boundsOf(ids)
  const { controls, camera } = viewportRefs
  if (!controls || !camera) return
  if (!bounds) {
    controls.target.set(0, 0, 0)
    camera.position.set(4.5, 3.4, 5.2)
    controls.update()
    return
  }
  bounds.getSize(size)
  bounds.getCenter(center)
  const radius = Math.max(size.length() * 0.5, 0.35)
  const direction = camera.position.clone().sub(controls.target).normalize()
  if (direction.lengthSq() < 1e-6) direction.set(1, 0.8, 1).normalize()
  const distance = radius * 3.1
  controls.target.copy(center)
  camera.position.copy(center).addScaledVector(direction, distance)
  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    const cam = camera as THREE.OrthographicCamera
    cam.zoom = 1.6 / radius
    cam.updateProjectionMatrix()
  }
  controls.update()
}

export type ViewPreset = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'home'

const PRESETS: Record<ViewPreset, [number, number, number]> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  right: [1, 0, 0],
  left: [-1, 0, 0],
  top: [0, 1, 0.0001],
  bottom: [0, -1, 0.0001],
  home: [0.82, 0.6, 0.95],
}

export function setView(preset: ViewPreset) {
  const { controls, camera } = viewportRefs
  if (!controls || !camera) return
  const distance = camera.position.distanceTo(controls.target) || 8
  const dir = new THREE.Vector3(...PRESETS[preset]).normalize()
  camera.position.copy(controls.target).addScaledVector(dir, distance)
  camera.up.set(0, 1, 0)
  controls.update()
}
