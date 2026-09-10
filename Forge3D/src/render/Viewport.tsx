import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { GizmoHelper, GizmoViewport, Grid, OrbitControls } from '@react-three/drei'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useSceneStore } from '../state/sceneStore'
import { useUIStore } from '../state/uiStore'
import { SceneObjects } from './SceneObjects'
import { Gizmo } from './Gizmo'
import { viewportRefs } from './viewportApi'

const NO_RAYCAST = () => null

function AxisLines() {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const extent = 1000
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-extent, 0, 0, extent, 0, 0, 0, 0, -extent, 0, 0, extent], 3),
    )
    g.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(
        [0.72, 0.22, 0.27, 0.72, 0.22, 0.27, 0.2, 0.4, 0.78, 0.2, 0.4, 0.78],
        3,
      ),
    )
    return g
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <lineSegments geometry={geometry} raycast={NO_RAYCAST} renderOrder={1} position={[0, 0.002, 0]}>
      <lineBasicMaterial vertexColors transparent opacity={0.9} toneMapped={false} depthWrite={false} />
    </lineSegments>
  )
}

function Rig() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls)
  useEffect(() => {
    viewportRefs.camera = camera
    viewportRefs.controls = (controls as unknown as OrbitControlsImpl) ?? null
  }, [camera, controls])
  return null
}

/**
 * Generates an image-based lighting probe locally (no HDRI download) so metallic
 * and low-roughness materials have something to reflect.
 */
function EnvironmentProbe() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const target = pmrem.fromScene(room, 0.04)
    scene.environment = target.texture
    scene.environmentIntensity = 0.35
    return () => {
      scene.environment = null
      target.dispose()
      pmrem.dispose()
      room.traverse((node) => {
        const mesh = node as THREE.Mesh
        if (mesh.isMesh) mesh.geometry?.dispose()
      })
    }
  }, [gl, scene])
  return null
}

function Lights() {
  const env = useSceneStore((s) => s.environment)
  const keyRef = useRef<THREE.DirectionalLight>(null)
  return (
    <>
      <ambientLight intensity={env.ambientIntensity} />
      <hemisphereLight args={['#8fa6c0', '#2a2d31', env.fillIntensity]} />
      <directionalLight
        ref={keyRef}
        position={env.keyPosition}
        intensity={env.keyIntensity}
        castShadow={env.shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0008}
      />
      <directionalLight position={[-5, 3, -4]} intensity={env.rimIntensity} color="#9db8dd" />
    </>
  )
}

function ShadowCatcher() {
  const shadows = useSceneStore((s) => s.environment.shadows)
  if (!shadows) return null
  // depthWrite stays off: the catcher is a huge transparent plane and would
  // otherwise sort ahead of the grid and hide it from some camera angles.
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.004, 0]}
      receiveShadow
      raycast={NO_RAYCAST}
      renderOrder={-2}
    >
      <planeGeometry args={[200, 200]} />
      <shadowMaterial opacity={0.3} depthWrite={false} />
    </mesh>
  )
}

export function Viewport() {
  const env = useSceneStore((s) => s.environment)
  const clearSelection = useSceneStore((s) => s.clearSelection)
  const shading = useUIStore((s) => s.shading)
  const mode = useUIStore((s) => s.mode)
  const clearElementSelection = useUIStore((s) => s.clearElementSelection)

  const handleMissed = () => {
    if (mode === 'edit') clearElementSelection()
    else clearSelection()
  }

  return (
    <Canvas
      shadows={env.shadows}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true, alpha: false }}
      camera={{ position: [4.5, 3.4, 5.2], fov: env.fov, near: 0.05, far: 500 }}
      orthographic={env.orthographic}
      raycaster={{
        params: {
          Points: { threshold: 0.075 },
          Line: { threshold: 0.035 },
          Mesh: {},
          LOD: {},
          Sprite: {},
        },
      }}
      onPointerMissed={handleMissed}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(env.background)
        scene.background = new THREE.Color(env.background)
      }}
    >
      <color attach="background" args={[env.background]} />
      <fog attach="fog" args={[env.background, 42, 130]} />
      <Rig />
      <EnvironmentProbe />
      <Lights />
      <ShadowCatcher />
      {env.showGrid && (
        <Grid
          args={[100, 100]}
          cellSize={0.25}
          cellThickness={0.6}
          cellColor="#333a42"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#4b545e"
          infiniteGrid
          fadeDistance={80}
          fadeStrength={1.1}
          followCamera={false}
          side={THREE.DoubleSide}
        />
      )}
      {env.showAxes && <AxisLines />}
      <SceneObjects shading={shading} />
      <Gizmo />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.75}
        panSpeed={0.9}
        zoomSpeed={0.9}
        minDistance={0.2}
        maxDistance={220}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
      />
      <GizmoHelper alignment="top-right" margin={[68, 108]}>
        <GizmoViewport
          axisColors={['#c74b52', '#5fa860', '#4577c7']}
          labelColor="#e6e9ec"
          hideNegativeAxes={false}
        />
      </GizmoHelper>
    </Canvas>
  )
}
