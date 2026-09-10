import type { EnvironmentSettings } from '../core/types'

export { DEFAULT_MATERIAL, PALETTE } from '../materials/material'

export const DEFAULT_ENVIRONMENT: EnvironmentSettings = {
  background: '#15181c',
  ambientIntensity: 0.55,
  keyIntensity: 2.1,
  keyPosition: [4, 6, 3],
  fillIntensity: 0.5,
  rimIntensity: 0.8,
  showGrid: true,
  showAxes: true,
  shadows: true,
  fov: 45,
  orthographic: false,
}
