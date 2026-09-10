import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useSceneStore } from '../state/sceneStore'
import { useUIStore } from '../state/uiStore'
import {
  edgeGeometry,
  faceSubsetGeometry,
  pointGeometry,
  renderDataFor,
  subsetLineGeometry,
  subsetPointGeometry,
  surfaceGeometry,
} from './geometry'

const NO_RAYCAST = () => null
const raycastProps = (enabled: boolean) => (enabled ? {} : { raycast: NO_RAYCAST })

function useAutoDispose<T extends { dispose(): void }>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    const previous = ref.current
    ref.current = value
    if (previous !== value) previous.dispose()
  }, [value])
  useEffect(() => () => ref.current.dispose(), [])
  return value
}

export function EditOverlay({ objectId }: { objectId: string }) {
  const mesh = useSceneStore((s) => s.objects[objectId]?.mesh)
  const elementMode = useUIStore((s) => s.elementMode)
  const selection = useUIStore((s) => s.elementSelection)
  const setSelection = useUIStore((s) => s.setElementSelection)

  const pickGeometry = useAutoDispose(useMemo(() => (mesh ? surfaceGeometry(mesh) : new THREE.BufferGeometry()), [mesh]))
  const wireGeometry = useAutoDispose(useMemo(() => (mesh ? edgeGeometry(mesh) : new THREE.BufferGeometry()), [mesh]))
  const pointsGeometry = useAutoDispose(useMemo(() => (mesh ? pointGeometry(mesh) : new THREE.BufferGeometry()), [mesh]))
  const selectedFaces = useAutoDispose(
    useMemo(() => (mesh ? faceSubsetGeometry(mesh, selection.faces) : new THREE.BufferGeometry()), [mesh, selection.faces]),
  )
  const selectedEdges = useAutoDispose(
    useMemo(() => (mesh ? subsetLineGeometry(mesh, selection.edges) : new THREE.BufferGeometry()), [mesh, selection.edges]),
  )
  const selectedPoints = useAutoDispose(
    useMemo(
      () => (mesh ? subsetPointGeometry(mesh, selection.vertices) : new THREE.BufferGeometry()),
      [mesh, selection.vertices],
    ),
  )

  const data = useMemo(() => (mesh ? renderDataFor(mesh) : null), [mesh])
  if (!mesh || !data) return null

  const additive = (event: ThreeEvent<MouseEvent>) => event.shiftKey || event.ctrlKey || event.metaKey

  const pickFace = (event: ThreeEvent<MouseEvent>) => {
    if (elementMode !== 'face' || event.faceIndex === undefined || event.faceIndex === null) return
    event.stopPropagation()
    const face = data.triFace[event.faceIndex]
    if (face === undefined) return
    const current = selection.faces
    const next = additive(event)
      ? current.includes(face)
        ? current.filter((f) => f !== face)
        : [...current, face]
      : [face]
    setSelection({ vertices: [], edges: [], faces: next })
  }

  const pickEdge = (event: ThreeEvent<MouseEvent>) => {
    if (elementMode !== 'edge' || event.index === undefined) return
    event.stopPropagation()
    const edge = data.edges[Math.floor(event.index / 2)]
    if (!edge) return
    const current = selection.edges
    const next = additive(event)
      ? current.includes(edge.key)
        ? current.filter((k) => k !== edge.key)
        : [...current, edge.key]
      : [edge.key]
    setSelection({ vertices: [], edges: next, faces: [] })
  }

  const pickVertex = (event: ThreeEvent<MouseEvent>) => {
    if (elementMode !== 'vertex' || event.index === undefined) return
    event.stopPropagation()
    const index = event.index
    const current = selection.vertices
    const next = additive(event)
      ? current.includes(index)
        ? current.filter((v) => v !== index)
        : [...current, index]
      : [index]
    setSelection({ vertices: next, edges: [], faces: [] })
  }

  return (
    <group>
      <mesh geometry={pickGeometry} onPointerDown={pickFace} {...raycastProps(elementMode === 'face')}>
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {selection.faces.length > 0 && (
        <mesh geometry={selectedFaces} raycast={NO_RAYCAST} renderOrder={3}>
          <meshBasicMaterial
            color="#ff9d4d"
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
            depthTest
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}

      <lineSegments
        geometry={wireGeometry}
        onPointerDown={pickEdge}
        {...raycastProps(elementMode === 'edge')}
        renderOrder={4}
      >
        <lineBasicMaterial color="#5d6771" toneMapped={false} />
      </lineSegments>

      {selection.edges.length > 0 && (
        <lineSegments geometry={selectedEdges} raycast={NO_RAYCAST} renderOrder={5}>
          <lineBasicMaterial color="#ff9d4d" toneMapped={false} />
        </lineSegments>
      )}

      <points
        geometry={pointsGeometry}
        onPointerDown={pickVertex}
        {...raycastProps(elementMode === 'vertex')}
        renderOrder={6}
      >
        <pointsMaterial color="#c8d0d8" size={6} sizeAttenuation={false} toneMapped={false} />
      </points>

      {selection.vertices.length > 0 && (
        <points geometry={selectedPoints} raycast={NO_RAYCAST} renderOrder={7}>
          <pointsMaterial color="#ff9d4d" size={9} sizeAttenuation={false} toneMapped={false} depthTest={false} />
        </points>
      )}
    </group>
  )
}
