import * as THREE from 'three'
import type { MaterialDef } from '../core/types'

export const DEFAULT_MATERIAL: MaterialDef = {
  color: '#b9c0c8',
  metalness: 0.05,
  roughness: 0.45,
  opacity: 1,
  emissive: '#000000',
  emissiveIntensity: 0,
  flatShading: false,
  doubleSided: false,
}

/** A restrained working palette — neutral first, then accent hues. */
export const PALETTE = [
  '#b9c0c8',
  '#4c8dff',
  '#ff9d4d',
  '#43b581',
  '#e5484d',
  '#a78bfa',
  '#f2c94c',
  '#2d3339',
]

/** Viewport colour used when shading is set to Solid. */
export const SOLID_COLOR = '#9aa3ad'

export function makeThreeMaterial(def: MaterialDef): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(def.color),
    metalness: def.metalness,
    roughness: def.roughness,
    opacity: def.opacity,
    transparent: def.opacity < 1,
    emissive: new THREE.Color(def.emissive),
    emissiveIntensity: def.emissiveIntensity,
    flatShading: def.flatShading,
    side: def.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
  })
}

/** Reads whatever standard-material properties an imported material exposes. */
export function readMaterialDef(source: THREE.Material | undefined): Partial<MaterialDef> {
  if (!source) return {}
  const standard = source as THREE.MeshStandardMaterial
  const def: Partial<MaterialDef> = {}
  if (standard.color) def.color = `#${standard.color.getHexString()}`
  if (typeof standard.metalness === 'number') def.metalness = standard.metalness
  if (typeof standard.roughness === 'number') def.roughness = standard.roughness
  if (typeof standard.opacity === 'number') def.opacity = standard.opacity
  return def
}
