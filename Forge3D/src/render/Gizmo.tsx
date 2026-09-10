import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import { useShallow } from 'zustand/react/shallow'
import type { Vec3 } from '../core/types'
import { topLevelSelection, useSceneStore } from '../state/sceneStore'
import { useUIStore } from '../state/uiStore'
import { selectionCenter, selectionVertices } from '../modeling/operations'
import { cloneMesh } from '../modeling/mesh'
import { getNode } from './registry'

const tmpMatrix = new THREE.Matrix4()
const tmpInverse = new THREE.Matrix4()
const tmpPos = new THREE.Vector3()
const tmpQuat = new THREE.Quaternion()
const tmpScale = new THREE.Vector3()
const tmpEuler = new THREE.Euler()
const tmpVec = new THREE.Vector3()

const MODE_MAP = { move: 'translate', rotate: 'rotate', scale: 'scale' } as const

/** Gizmo for whole objects. A proxy node carries the handles so multi-selection works. */
function ObjectGizmo() {
  const tool = useUIStore((s) => s.tool)
  const space = useUIStore((s) => s.space)
  const snapEnabled = useUIStore((s) => s.snapEnabled)
  const snapTranslate = useUIStore((s) => s.snapTranslate)
  const snapRotate = useUIStore((s) => s.snapRotate)
  const snapScale = useUIStore((s) => s.snapScale)

  const objects = useSceneStore((s) => s.objects)
  const selection = useSceneStore((s) => s.selection)
  const setTransform = useSceneStore((s) => s.setTransform)
  const record = useSceneStore((s) => s.record)

  const targets = useMemo(
    () => topLevelSelection(objects, selection).filter((id) => objects[id] && !objects[id].locked),
    [objects, selection],
  )

  const proxy = useMemo(() => {
    const node = new THREE.Object3D()
    node.name = 'ForgeGizmoProxy'
    return node
  }, [])

  const dragging = useRef(false)
  const initialProxy = useRef(new THREE.Matrix4())
  const initialWorld = useRef<Map<string, THREE.Matrix4>>(new Map())

  const syncProxy = () => {
    if (dragging.current || !targets.length) return
    tmpVec.set(0, 0, 0)
    let counted = 0
    for (const id of targets) {
      const node = getNode(id)
      if (!node) continue
      node.updateMatrixWorld(true)
      tmpVec.add(tmpPos.setFromMatrixPosition(node.matrixWorld))
      counted++
    }
    if (!counted) return
    proxy.position.copy(tmpVec.divideScalar(counted))
    proxy.scale.set(1, 1, 1)
    if (space === 'local' && targets.length === 1) {
      const node = getNode(targets[0])
      if (node) node.getWorldQuaternion(proxy.quaternion)
    } else {
      proxy.quaternion.identity()
    }
    proxy.updateMatrixWorld(true)
  }

  useFrame(syncProxy)
  useEffect(syncProxy, [targets.length, space])

  if (!targets.length) return null

  const handleDown = () => {
    dragging.current = true
    record()
    proxy.updateMatrixWorld(true)
    initialProxy.current.copy(proxy.matrixWorld).invert()
    initialWorld.current.clear()
    for (const id of targets) {
      const node = getNode(id)
      if (node) {
        node.updateMatrixWorld(true)
        initialWorld.current.set(id, node.matrixWorld.clone())
      }
    }
  }

  const handleUp = () => {
    dragging.current = false
  }

  const handleChange = () => {
    if (!dragging.current) return
    proxy.updateMatrixWorld(true)
    const delta = tmpMatrix.copy(proxy.matrixWorld).multiply(initialProxy.current)
    for (const id of targets) {
      const start = initialWorld.current.get(id)
      const node = getNode(id)
      if (!start || !node) continue
      const world = start.clone().premultiply(delta)
      const parent = node.parent
      if (parent) {
        parent.updateMatrixWorld(true)
        world.premultiply(tmpInverse.copy(parent.matrixWorld).invert())
      }
      world.decompose(tmpPos, tmpQuat, tmpScale)
      tmpEuler.setFromQuaternion(tmpQuat, 'XYZ')
      setTransform(id, {
        position: [tmpPos.x, tmpPos.y, tmpPos.z] as Vec3,
        rotation: [tmpEuler.x, tmpEuler.y, tmpEuler.z] as Vec3,
        scale: [tmpScale.x, tmpScale.y, tmpScale.z] as Vec3,
      })
    }
  }

  return (
    <>
      <primitive object={proxy} />
      <TransformControls
        object={proxy}
        mode={MODE_MAP[tool as keyof typeof MODE_MAP] ?? 'translate'}
        space={space}
        size={0.85}
        translationSnap={snapEnabled ? snapTranslate : null}
        rotationSnap={snapEnabled ? (snapRotate * Math.PI) / 180 : null}
        scaleSnap={snapEnabled ? snapScale : null}
        onMouseDown={handleDown}
        onMouseUp={handleUp}
        onObjectChange={handleChange}
      />
    </>
  )
}

/** Gizmo for mesh elements. The proxy is parented to the edited object so the
 * handle deltas arrive already expressed in that object's local space. */
function EditGizmo() {
  const tool = useUIStore((s) => s.tool)
  const editTarget = useUIStore((s) => s.editTarget)
  const elementSelection = useUIStore((s) => s.elementSelection)
  const snapEnabled = useUIStore((s) => s.snapEnabled)
  const snapTranslate = useUIStore((s) => s.snapTranslate)
  const snapRotate = useUIStore((s) => s.snapRotate)
  const snapScale = useUIStore((s) => s.snapScale)

  const mesh = useSceneStore((s) => (editTarget ? s.objects[editTarget]?.mesh : undefined))
  const updateMesh = useSceneStore((s) => s.updateMesh)
  const record = useSceneStore((s) => s.record)

  const proxy = useMemo(() => {
    const node = new THREE.Object3D()
    node.name = 'ForgeEditProxy'
    return node
  }, [])

  const dragging = useRef(false)
  const initialProxy = useRef(new THREE.Matrix4())
  const startVertices = useRef<Array<{ index: number; p: Vec3 }>>([])

  const center = useMemo(() => (mesh ? selectionCenter(mesh, elementSelection) : null), [mesh, elementSelection])
  const host = editTarget ? getNode(editTarget) : undefined

  useEffect(() => {
    if (!host) return
    host.add(proxy)
    return () => {
      host.remove(proxy)
    }
  }, [host, proxy])

  useEffect(() => {
    if (dragging.current || !center) return
    proxy.position.set(center[0], center[1], center[2])
    proxy.quaternion.identity()
    proxy.scale.set(1, 1, 1)
    proxy.updateMatrix()
    proxy.updateMatrixWorld(true)
  }, [center, proxy])

  if (!mesh || !center || !host || !editTarget) return null

  const handleDown = () => {
    dragging.current = true
    record()
    proxy.updateMatrix()
    initialProxy.current.copy(proxy.matrix).invert()
    startVertices.current = selectionVertices(mesh, elementSelection).map((index) => ({
      index,
      p: [...mesh.vertices[index]] as Vec3,
    }))
  }

  const handleUp = () => {
    dragging.current = false
  }

  const handleChange = () => {
    if (!dragging.current) return
    proxy.updateMatrix()
    const delta = tmpMatrix.copy(proxy.matrix).multiply(initialProxy.current)
    const current = useSceneStore.getState().objects[editTarget]?.mesh
    if (!current) return
    const next = cloneMesh(current)
    for (const { index, p } of startVertices.current) {
      tmpPos.set(p[0], p[1], p[2]).applyMatrix4(delta)
      next.vertices[index] = [tmpPos.x, tmpPos.y, tmpPos.z]
    }
    updateMesh(editTarget, next)
  }

  return (
    <TransformControls
      object={proxy}
      mode={MODE_MAP[tool as keyof typeof MODE_MAP] ?? 'translate'}
      space="local"
      size={0.7}
      translationSnap={snapEnabled ? snapTranslate : null}
      rotationSnap={snapEnabled ? (snapRotate * Math.PI) / 180 : null}
      scaleSnap={snapEnabled ? snapScale : null}
      onMouseDown={handleDown}
      onMouseUp={handleUp}
      onObjectChange={handleChange}
    />
  )
}

export function Gizmo() {
  const mode = useUIStore((s) => s.mode)
  const tool = useUIStore((s) => s.tool)
  const hasSelection = useSceneStore(useShallow((s) => s.selection.length > 0))
  if (tool === 'select') return null
  if (mode === 'edit') return <EditGizmo />
  return hasSelection ? <ObjectGizmo /> : null
}
