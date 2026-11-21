import { push, rand, type Cloud, type RGB } from './common'

// Little natural props made of points, shared by the scenes. Every function takes the ground height `y0` where it stands.
export const DEEP: RGB = [0.1, 0.4, 0.22]
export const LIME: RGB = [0.48, 0.82, 0.24]
export const TEALG: RGB = [0.08, 0.55, 0.5]
export const OLIVE: RGB = [0.36, 0.5, 0.2]
export const BARK: RGB = [0.2, 0.17, 0.15]
export const BARK_LIGHT: RGB = [0.36, 0.3, 0.26]
export const STONE: RGB = [0.45, 0.43, 0.4]
export const STONE_LIGHT: RGB = [0.62, 0.6, 0.55]
const BLOSSOM: RGB = [0.96, 0.53, 0.62]

export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

// small seeded generator so scenes look the same every time they open
export function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function trunk(c: Cloud, x: number, y0: number, z: number, h: number, r: number, n: number) {
  for (let i = 0; i < n; i++) {
    const y = rand(0, h)
    const rad = r * (1 - 0.4 * (y / h))
    const a = rand(0, Math.PI * 2)
    push(c, x + Math.cos(a) * rad, y0 + y, z + Math.sin(a) * rad, mix(BARK, BARK_LIGHT, Math.random()), 0.03)
  }
}

// A conifer: trunk plus stacked cones.
export function conifer(c: Cloud, x: number, y0: number, z: number, h: number, m: number, tone: number) {
  trunk(c, x, y0, z, h * 0.5, h * 0.04, 80 * m)
  const layers = 3
  for (let k = 0; k < layers; k++) {
    const base = y0 + h * (0.25 + k * 0.2)
    const R0 = h * 0.3 * (1 - k * 0.22) * (0.85 + tone * 0.3)
    for (let i = 0; i < 120 * m; i++) {
      const u = Math.random()
      const a = rand(0, Math.PI * 2)
      const rad = R0 * (1 - u)
      push(c, x + Math.cos(a) * rad, base + u * h * 0.34, z + Math.sin(a) * rad, mix(DEEP, LIME, ((k + u) / layers) * 0.8 + tone * 0.2), 0.05)
    }
  }
}

// A round tree: trunk plus a cluster of leafy blobs. `blossom` makes it pink.
export function roundTree(c: Cloud, x: number, y0: number, z: number, h: number, m: number, tone: number, blossom = false) {
  trunk(c, x, y0, z, h, h * 0.05, 90 * m)
  const blobs = [
    [0, 0, 0, 0.3],
    [0.16, -0.08, 0.05, 0.22],
    [-0.15, -0.05, -0.08, 0.23],
    [0.03, 0.14, -0.12, 0.2],
  ]
  for (const [dx, dy, dz, rad] of blobs) {
    const cx = x + dx * h
    const cy = y0 + h + dy * h
    const cz = z + dz * h
    for (let i = 0; i < 130 * m; i++) {
      const u = Math.random() * 2 - 1
      const a = rand(0, Math.PI * 2)
      const s = Math.sqrt(1 - u * u)
      const rr = rad * h * (0.85 + Math.random() * 0.15)
      const t = Math.min(1, Math.max(0, (u + 1) / 2 + tone * 0.25))
      const col = blossom ? mix(BLOSSOM, [1, 0.8, 0.85], t) : mix(tone > 0.5 ? TEALG : DEEP, LIME, t)
      push(c, cx + rr * s * Math.cos(a), cy + rr * u * 0.85, cz + rr * s * Math.sin(a), col, 0.05)
    }
  }
}

// A low bush or fern clump.
export function bush(c: Cloud, x: number, y0: number, z: number, rad: number, m: number) {
  for (let i = 0; i < 80 * m; i++) {
    const u = Math.random() * 2 - 1
    const a = rand(0, Math.PI * 2)
    const s = Math.sqrt(1 - u * u)
    push(c, x + rad * s * Math.cos(a), y0 + 0.03 + Math.abs(u) * rad * 0.8, z + rad * s * Math.sin(a), mix(DEEP, OLIVE, Math.random()), 0.05)
  }
}

// A boulder: a flattened, lumpy sphere.
export function rock(c: Cloud, x: number, y0: number, z: number, rad: number, m: number) {
  const squash = 0.55 + Math.random() * 0.2
  for (let i = 0; i < 150 * m; i++) {
    const u = Math.random() * 2 - 1
    const a = rand(0, Math.PI * 2)
    const s = Math.sqrt(1 - u * u)
    const lump = 1 + 0.12 * Math.sin(a * 3 + u * 4)
    push(c, x + rad * lump * s * Math.cos(a), y0 + Math.abs(u) * rad * squash, z + rad * lump * s * Math.sin(a), mix(STONE, STONE_LIGHT, Math.random()), 0.04)
  }
}

// A fallen log lying along `angle` (radians, in the ground plane).
export function log(c: Cloud, x: number, y0: number, z: number, len: number, angle: number, m: number) {
  const dx = Math.cos(angle)
  const dz = Math.sin(angle)
  for (let i = 0; i < 260 * m; i++) {
    const along = rand(-len / 2, len / 2)
    const a = rand(0, Math.PI * 2)
    const r = 0.06
    push(c, x + dx * along - dz * Math.cos(a) * r, y0 + 0.06 + Math.sin(a) * r, z + dz * along + dx * Math.cos(a) * r, mix(BARK, BARK_LIGHT, Math.random()), 0.03)
  }
}
