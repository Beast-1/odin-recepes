import type { Vec3 } from './types'

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
export const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2])

export function normalize(a: Vec3): Vec3 {
  const l = length(a)
  return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0]
}

export function centroid(points: Vec3[]): Vec3 {
  if (points.length === 0) return [0, 0, 0]
  let x = 0
  let y = 0
  let z = 0
  for (const p of points) {
    x += p[0]
    y += p[1]
    z += p[2]
  }
  const n = points.length
  return [x / n, y / n, z / n]
}

export const DEG = Math.PI / 180
export const RAD = 180 / Math.PI

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Rounds to a sane number of decimals so UI fields never show float noise. */
export const round = (v: number, decimals = 4) => {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}
