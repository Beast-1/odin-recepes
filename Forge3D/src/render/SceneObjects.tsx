import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useShallow } from 'zustand/react/shallow'
import type { SceneObject, ShadingMode } from '../core/types'
import { useSceneStore } from '../state/sceneStore'
import { useUIStore } from '../state/uiStore'
import { edgeGeometry, surfaceGeometry } from './geometry'
import { registerNode } from './registry'
import { EditOverlay } from './EditOverlay'
import { SOLID_COLOR } from '../materials/material'
import { makeOutlineMaterial } from './outline'
import { renderDataFor } from './geometry'


/** r3f overwrites `raycast` with whatever is passed, so opting out means
 * supplying a no-op — and opting in means not passing the prop at all. */
const NO_RAYCAST = () => null
const raycastProps = (enabled: boolean) => (enabled ? {} : { raycast: NO_RAYCAST })

function useDisposable<T extends { dispose(): void }>(factory: () => T, deps: unknown[]): T {
  const value = useMemo(factory, deps)
  const ref = useRef(value)
  useEffect(() => {
    const previous = ref.current
    ref.current = value
    if (previous !== value) previous.dispose()
  }, [value])
  useEffect(() => () => ref.current.dispose(), [])
  return value
}

interface NodeProps {
  id: string
  shading: ShadingMode
}

function ObjectNode({ id, shading }: NodeProps) {
  const object = useSceneStore((s) => s.objects[id]) as SceneObject | undefined
  const childIds = useSceneStore(useShallow((s) => s.order.filter((c) => s.objects[c]?.parent === id)))
  const selection = useSceneStore((s) => s.selection)
  const select = useSceneStore((s) => s.select)
  const toggleSelect = useSceneStore((s) => s.toggleSelect)
  const mode = useUIStore((s) => s.mode)
  const editTarget = useUIStore((s) => s.editTarget)
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    registerNode(id, groupRef.current)
    return () => registerNode(id, null)
  }, [id])

  const mesh = object?.mesh
  const geometry = useDisposable(() => (mesh ? surfaceGeometry(mesh) : new THREE.BufferGeometry()), [mesh])
  const wire = useDisposable(() => (mesh ? edgeGeometry(mesh) : new THREE.BufferGeometry()), [mesh])
  const outlineMaterial = useDisposable(() => makeOutlineMaterial('#ff9d4d'), [])
  // Dense meshes read better with a silhouette alone; a low-poly cage stays legible.
  const lowPoly = mesh ? renderDataFor(mesh).edges.length <= 32 : false

  if (!object) return null

  const isSelected = selection.includes(id)
  const isEditing = mode === 'edit' && editTarget === id
  const dimmed = mode === 'edit' && editTarget !== id
  const pickable = !object.locked && !dimmed && mode === 'object'

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!pickable) return
    event.stopPropagation()
    if (event.shiftKey || event.ctrlKey || event.metaKey) toggleSelect(id)
    else select([id])
  }

  const material = object.material
  const showSurface = shading !== 'wireframe'
  const showWire = shading === 'wireframe' || (isSelected && mode === 'object' && lowPoly)

  return (
    <group
      ref={groupRef}
      name={object.name}
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
      visible={object.visible}
      userData={{ forgeId: id }}
    >
      {mesh && mesh.faces.length > 0 && (
        <>
          {showSurface && (
            <mesh
              geometry={geometry}
              castShadow
              receiveShadow
              onPointerDown={handleClick}
              {...raycastProps(pickable || isEditing)}
            >
              {shading === 'material' ? (
                <meshStandardMaterial
                  color={material.color}
                  metalness={material.metalness}
                  roughness={material.roughness}
                  opacity={dimmed ? Math.min(material.opacity, 0.25) : material.opacity}
                  transparent={material.opacity < 1 || dimmed}
                  emissive={material.emissive}
                  emissiveIntensity={material.emissiveIntensity}
                  flatShading={material.flatShading}
                  side={material.doubleSided ? THREE.DoubleSide : THREE.FrontSide}
                  polygonOffset
                  polygonOffsetFactor={1}
                  polygonOffsetUnits={1}
                />
              ) : (
                <meshStandardMaterial
                  color={SOLID_COLOR}
                  metalness={0}
                  roughness={0.62}
                  opacity={dimmed ? 0.25 : 1}
                  transparent={dimmed}
                  flatShading={material.flatShading}
                  side={material.doubleSided ? THREE.DoubleSide : THREE.FrontSide}
                  polygonOffset
                  polygonOffsetFactor={1}
                  polygonOffsetUnits={1}
                />
              )}
            </mesh>
          )}
          {isSelected && !isEditing && shading !== 'wireframe' && (
            <mesh geometry={geometry} material={outlineMaterial} raycast={NO_RAYCAST} renderOrder={1} />
          )}
          {showWire && !isEditing && (
            <lineSegments geometry={wire} raycast={NO_RAYCAST} renderOrder={2}>
              <lineBasicMaterial
                color={isSelected ? '#ff9d4d' : '#4a525b'}
                transparent
                opacity={shading === 'wireframe' && !isSelected ? 0.75 : 1}
                toneMapped={false}
              />
            </lineSegments>
          )}
          {isEditing && <EditOverlay objectId={id} />}
        </>
      )}
      {childIds.map((child) => (
        <ObjectNode key={child} id={child} shading={shading} />
      ))}
    </group>
  )
}

export function SceneObjects({ shading }: { shading: ShadingMode }) {
  const roots = useSceneStore(useShallow((s) => s.order.filter((id) => !s.objects[id]?.parent)))
  return (
    <>
      {roots.map((id) => (
        <ObjectNode key={id} id={id} shading={shading} />
      ))}
    </>
  )
}
