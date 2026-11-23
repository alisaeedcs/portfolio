import { useMemo } from 'react'
import PointCloud from './PointCloud'
import { COL, density, newCloud, push, rand, type Cloud, type RGB } from './common'

// The scanner stands in a small clearing; a pulse of light expands from it across the forest.
const SCANNER: [number, number, number] = [0, 0.95, 0.5]
const RADIUS = 2.9

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

// small seeded generator so the forest looks the same every time it opens
function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ground = (x: number, z: number) => 0.12 * Math.sin(x * 1.3) * Math.cos(z * 1.1) + 0.05 * Math.sin(x * 3 + z * 2)

// Leaf colours shift from deep green through lime, with teal and a few blossom trees for variety.
const DEEP: RGB = [0.1, 0.4, 0.22]
const LIME: RGB = [0.48, 0.82, 0.24]
const TEALG: RGB = [0.08, 0.55, 0.5]
const LEAF_YELLOW: RGB = [0.78, 0.82, 0.3]
function leaf(kind: number, t: number): RGB {
  if (kind === 2) return mix([0.9, 0.36, 0.52], [0.98, 0.58, 0.68], clamp01(t)) // blossom: a richer pink, so it still shows on the cream
  if (kind === 1) return mix(TEALG, LIME, clamp01(t))
  return t < 0.6 ? mix(DEEP, LIME, t / 0.6) : mix(LIME, LEAF_YELLOW, (t - 0.6) / 0.4)
}

const BARK: RGB = [0.2, 0.17, 0.15]
const BARK_LIGHT: RGB = [0.36, 0.3, 0.26]

interface Tree {
  x: number
  z: number
  h: number
  r: number
  kind: number // 0 conifer, 1 round, 2 blossom
  tone: number
}

function plantTrees(): Tree[] {
  const r = rng(7)
  const trees: Tree[] = []
  for (let tries = 0; tries < 400 && trees.length < 17; tries++) {
    const a = r() * Math.PI * 2
    const d = Math.sqrt(r()) * (RADIUS - 0.45)
    const x = Math.cos(a) * d
    const z = Math.sin(a) * d
    if (Math.hypot(x - SCANNER[0], z - SCANNER[2]) < 0.85) continue // keep the clearing open
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 0.6)) continue
    const n = trees.length
    trees.push({ x, z, h: 1.5 + r() * 1.1, r: 0.07 + r() * 0.05, kind: n % 7 === 3 || n % 7 === 6 ? 2 : n % 3 === 1 ? 1 : 0, tone: r() })
  }
  return trees
}

// A lidar scan of a small forest: a round patch of ground, conifers, round trees and a few blossoms,
// ferns, rocks, a fallen log, slanting rays of light, and the scanner on its tripod in a clearing.
export default function Forest() {
  const groundCloud = useMemo(() => {
    const c = newCloud()
    const s = density < 1 ? 0.055 : 0.036
    const j = s * 0.4
    const r = rng(3)
    for (let x = -RADIUS; x <= RADIUS; x += s) {
      for (let z = -RADIUS; z <= RADIUS; z += s) {
        if (x * x + z * z > RADIUS * RADIUS) continue
        const px = x + rand(-j, j)
        const pz = z + rand(-j, j)
        const n = 0.5 + 0.5 * Math.sin(px * 2.3 + Math.cos(pz * 1.7) * 2)
        let col = mix([0.3, 0.42, 0.24], [0.62, 0.58, 0.32], n) // moss to dry leaves
        if (r() < 0.012) col = [0.75, 0.5, 0.3] // a few fallen leaves
        const d = Math.hypot(px - SCANNER[0], pz - SCANNER[2])
        const ring = (d * 5) % 1 < 0.09 ? 0.6 : 1 // concentric rings around the scanner
        push(c, px, ground(px, pz), pz, [col[0] * ring, col[1] * ring, col[2] * ring], 0.03)
      }
    }
    return c
  }, [])

  const objects = useMemo(() => {
    const c: Cloud = newCloud()
    const m = density * 1.9

    const trunk = (t: Tree) => {
      const y0 = ground(t.x, t.z)
      for (let i = 0; i < 240 * m; i++) {
        const y = rand(0, t.h)
        const rad = t.r * (1 - 0.45 * (y / t.h))
        const a = rand(0, Math.PI * 2)
        push(c, t.x + Math.cos(a) * rad, y0 + y, t.z + Math.sin(a) * rad, mixBark(Math.random()), 0.03)
      }
    }
    const mixBark = (u: number) => mix(BARK, BARK_LIGHT, u)

    const conifer = (t: Tree) => {
      const y0 = ground(t.x, t.z)
      const layers = 4
      for (let k = 0; k < layers; k++) {
        const base = y0 + t.h * (0.3 + k * 0.17)
        const ch = t.h * 0.42
        const R = 0.5 * (1 - k * 0.2) * (0.8 + t.tone * 0.4)
        for (let i = 0; i < 240 * m; i++) {
          const u = Math.random()
          const rad = R * (1 - u)
          const a = rand(0, Math.PI * 2)
          const heightT = (k + u) / layers
          push(c, t.x + Math.cos(a) * rad, base + u * ch, t.z + Math.sin(a) * rad, leaf(0, heightT * 0.7 + t.tone * 0.2), 0.05)
        }
      }
    }

    const round = (t: Tree) => {
      const y0 = ground(t.x, t.z)
      const blobs = [
        [0, 0, 0, 0.6],
        [0.32, -0.15, 0.1, 0.42],
        [-0.3, -0.1, -0.15, 0.45],
        [0.05, 0.28, -0.25, 0.4],
      ]
      if (t.kind === 2) blobs.push([0, 0.38, 0, 0.5]) // blossom trees get a fuller top, where the pink shows most
      const fill = t.kind === 2 ? 1.6 : 1
      for (const [dx, dy, dz, rad] of blobs) {
        const cx = t.x + dx * t.r * 8
        const cy = y0 + t.h + dy
        const cz = t.z + dz * t.r * 8
        for (let i = 0; i < 320 * m * fill; i++) {
          const u = Math.random() * 2 - 1
          const a = rand(0, Math.PI * 2)
          const s = Math.sqrt(1 - u * u)
          const rr = rad * (0.85 + Math.random() * 0.15)
          const py = cy + rr * u * 0.85
          push(c, cx + rr * s * Math.cos(a), py, cz + rr * s * Math.sin(a), leaf(t.kind, clamp01((py - y0 - t.h + 0.6) / 1.2 + t.tone * 0.25)), 0.05)
        }
      }
    }

    for (const t of plantTrees()) {
      trunk(t)
      if (t.kind === 0) conifer(t)
      else round(t)
    }

    // ferns and bushes on the ground
    const r = rng(11)
    for (let b = 0; b < 16; b++) {
      const a = r() * Math.PI * 2
      const d = Math.sqrt(r()) * (RADIUS - 0.3)
      const x = Math.cos(a) * d
      const z = Math.sin(a) * d
      if (Math.hypot(x - SCANNER[0], z - SCANNER[2]) < 0.6) continue
      const rad = 0.12 + r() * 0.16
      for (let i = 0; i < 90 * m; i++) {
        const u = Math.random() * 2 - 1
        const aa = rand(0, Math.PI * 2)
        const s = Math.sqrt(1 - u * u)
        push(c, x + rad * s * Math.cos(aa), ground(x, z) + 0.06 + Math.abs(u) * rad * 0.8, z + rad * s * Math.sin(aa), mix(DEEP, LIME, Math.random()), 0.05)
      }
    }

    // a fallen log
    for (let i = 0; i < 380 * m; i++) {
      const along = rand(-0.65, 0.65)
      const a = rand(0, Math.PI * 2)
      push(c, -1.1 + along, ground(-1.1, 1.1) + 0.1 + Math.sin(a) * 0.1, 1.1 + 0.25 * along + Math.cos(a) * 0.1, mixBark(Math.random()), 0.03)
    }

    // rocks
    for (const [x, z, rad] of [[1.4, 1.2, 0.22], [-1.7, -0.9, 0.18], [0.9, -1.6, 0.26], [-0.4, 1.8, 0.15]]) {
      for (let i = 0; i < 160 * m; i++) {
        const u = Math.random() * 2 - 1
        const a = rand(0, Math.PI * 2)
        const s = Math.sqrt(1 - u * u)
        push(c, x + rad * s * Math.cos(a), ground(x, z) + Math.abs(u) * rad * 0.7, z + rad * s * Math.sin(a), COL.stone, 0.05)
      }
    }

    // tiny pops of colour: cobalt and pink flowers
    for (let f = 0; f < 22; f++) {
      const a = r() * Math.PI * 2
      const d = Math.sqrt(r()) * (RADIUS - 0.3)
      const x = Math.cos(a) * d
      const z = Math.sin(a) * d
      const col = f % 2 ? COL.cobalt : COL.pink
      for (let i = 0; i < 14; i++) push(c, x + rand(-0.04, 0.04), ground(x, z) + 0.07 + rand(0, 0.05), z + rand(-0.04, 0.04), col, 0.04)
    }

    // slanting rays of light through the canopy
    for (const [x, z] of [[-0.9, -0.4], [0.9, 0.3], [1.5, -0.9]]) {
      for (let i = 0; i < 150 * m; i++) {
        const t = Math.random()
        push(c, x + t * 0.7, 3.0 - t * 3.0 + ground(x, z), z + t * 0.2, [1, 0.92 - t * 0.1, 0.55 + t * 0.1], 0.02)
      }
    }

    // the scanner on its tripod
    for (const a of [0, 2.1, 4.2]) {
      const lx = SCANNER[0] + Math.cos(a) * 0.22
      const lz = SCANNER[2] + Math.sin(a) * 0.22
      for (let i = 0; i < 50 * m; i++) {
        const t = Math.random()
        push(c, SCANNER[0] + (lx - SCANNER[0]) * t, SCANNER[1] - t * SCANNER[1], SCANNER[2] + (lz - SCANNER[2]) * t, COL.ink)
      }
    }
    for (let i = 0; i < 260 * m; i++) {
      const u = Math.random() * 2 - 1
      const a = rand(0, Math.PI * 2)
      const s = Math.sqrt(1 - u * u)
      push(c, SCANNER[0] + 0.12 * s * Math.cos(a), SCANNER[1] + 0.05 + 0.12 * u, SCANNER[2] + 0.12 * s * Math.sin(a), COL.cobalt)
    }
    return c
  }, [])

  return (
    <group position={[0, -1.4, 0]}>
      <PointCloud data={groundCloud} size={16} pulseFrom={SCANNER} fx />
      <PointCloud data={objects} size={23} pulseFrom={SCANNER} fx />
    </group>
  )
}
