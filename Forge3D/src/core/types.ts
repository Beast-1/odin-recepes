export type Vec3 = [number, number, number]

/**
 * Polygonal mesh in "face soup" form: an array of vertex positions plus faces
 * that reference them as ordered loops. N-gons are allowed; triangulation only
 * happens at render/export time. Every modeling operation works on this type.
 */
export interface MeshData {
  vertices: Vec3[]
  faces: number[][]
}

export type ObjectKind =
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'plane'
  | 'mesh'
  | 'group'

export interface MaterialDef {
  color: string
  metalness: number
  roughness: number
  opacity: number
  emissive: string
  emissiveIntensity: number
  flatShading: boolean
  doubleSided: boolean
}

export interface SceneObject {
  id: string
  name: string
  kind: ObjectKind
  parent: string | null
  position: Vec3
  rotation: Vec3
  scale: Vec3
  visible: boolean
  locked: boolean
  material: MaterialDef
  /** Absent for groups. */
  mesh?: MeshData
}

export interface EnvironmentSettings {
  background: string
  ambientIntensity: number
  keyIntensity: number
  keyPosition: Vec3
  fillIntensity: number
  rimIntensity: number
  showGrid: boolean
  showAxes: boolean
  shadows: boolean
  fov: number
  orthographic: boolean
}

export interface SceneSnapshot {
  objects: Record<string, SceneObject>
  order: string[]
  selection: string[]
  environment: EnvironmentSettings
}

export interface ProjectRecord {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  scene: SceneSnapshot
}

export type ShadingMode = 'solid' | 'material' | 'wireframe'
export type TransformTool = 'select' | 'move' | 'rotate' | 'scale'
export type EditorMode = 'object' | 'edit'
export type ElementMode = 'vertex' | 'edge' | 'face'
