import { useMemo } from 'react'
import PointCloud from './PointCloud'
import { COL, box, density, newCloud, push, rand, sphere, type Cloud, type RGB } from './common'

const SCANNER: [number, number, number] = [0.1, 1.0, 1.2]

const inDoor = (x: number, y: number) => x > 0.7 && x < 1.5 && y < 2.0
// the window sits on the left wall, clear of the bookshelf
const inWindow = (y: number, z: number) => y > 1.0 && y < 1.95 && z > -1.45 && z < -0.25

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

// Colour shifts across the room: warm peach low, violet in the middle, cobalt up high, like a depth-coloured scan.
const PEACH: RGB = [0.95, 0.5, 0.3]
const VIOLET: RGB = [0.5, 0.3, 0.85]
const BLUEISH: RGB = [0.14, 0.3, 0.95]
function wallColor(x: number, y: number, z: number): RGB {
  const t = clamp01(y / 2.4 + (x + z) * 0.04)
  const c = t < 0.5 ? mix(PEACH, VIOLET, t * 2) : mix(VIOLET, BLUEISH, (t - 0.5) * 2)
  const lines = (y * 9) % 1 < 0.14 ? 0.72 : 1 // faint horizontal scan lines
  return [c[0] * lines, c[1] * lines, c[2] * lines]
}

const TEAL: RGB = [0.08, 0.5, 0.45]
const MAUVE: RGB = [0.62, 0.25, 0.55]
function floorColor(x: number, z: number): RGB {
  const t = clamp01((x + z + 4) / 8)
  const c = mix(TEAL, MAUVE, t)
  const d = Math.hypot(x - SCANNER[0], z - SCANNER[2])
  const rings = (d * 5) % 1 < 0.1 ? 0.6 : 1 // concentric rings, like the scanner's sweep
  return [c[0] * rings, c[1] * rings, c[2] * rings]
}

function edge(c: Cloud, a: number[], b: number[], n: number, rgb: RGB) {
  for (let i = 0; i < n; i++) {
    const t = Math.random()
    push(c, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, rgb, 0.03)
  }
}

// A painting on the back wall: a blob of shifting colour inside a thin frame.
function painting(c: Cloud, cx: number, cy: number, w: number, h: number, n: number) {
  for (let i = 0; i < n; i++) {
    const u = Math.random()
    const v = Math.random()
    const t = clamp01(u * 0.6 + v * 0.4 + Math.sin(u * 5) * 0.12)
    const col = t < 0.5 ? mix(COL.pink, COL.cobalt, t * 2) : mix(COL.cobalt, COL.lime, (t - 0.5) * 2)
    push(c, cx - w / 2 + u * w, cy - h / 2 + v * h, -1.99, col, 0.05)
  }
  const E = 60
  edge(c, [cx - w / 2, cy - h / 2, -1.98], [cx + w / 2, cy - h / 2, -1.98], E, COL.ink)
  edge(c, [cx - w / 2, cy + h / 2, -1.98], [cx + w / 2, cy + h / 2, -1.98], E, COL.ink)
  edge(c, [cx - w / 2, cy - h / 2, -1.98], [cx - w / 2, cy + h / 2, -1.98], E, COL.ink)
  edge(c, [cx + w / 2, cy - h / 2, -1.98], [cx + w / 2, cy + h / 2, -1.98], E, COL.ink)
}

// A lidar scan of a living room. Walls and floor are fine, colour-shifting points; furniture is bolder
// so it reads at a glance; a pulse of light expands from the scanner across everything it touches,
// and distant points fade and shimmer for depth.
export default function LidarRoom() {
  const surfaces = useMemo(() => {
    const c = newCloud()
    const s = density < 1 ? 0.05 : 0.034
    const j = s * 0.4
    const put = (x: number, y: number, z: number, rgb: RGB) => push(c, x, y, z, rgb, 0.02)
    for (let x = -2; x <= 2; x += s) for (let z = -2; z <= 2; z += s) put(x + rand(-j, j), 0, z + rand(-j, j), floorColor(x, z))
    for (let x = -2; x <= 2; x += s)
      for (let y = 0; y <= 2.4; y += s) if (!inDoor(x, y)) put(x + rand(-j, j), y + rand(-j, j), -2, wallColor(x, y, -2))
    for (let z = -2; z <= 2; z += s)
      for (let y = 0; y <= 2.4; y += s) if (!inWindow(y, z)) put(-2, y + rand(-j, j), z + rand(-j, j), wallColor(-2, y, z))
    return c
  }, [])

  const objects = useMemo(() => {
    const c = newCloud()
    const m = density

    // crisp edges where surfaces meet, plus baseboards
    const E = 260 * m
    edge(c, [-2, 0, -2], [2, 0, -2], E, COL.ink)
    edge(c, [-2, 0, -2], [-2, 0, 2], E, COL.ink)
    edge(c, [-2, 0, -2], [-2, 2.4, -2], E, COL.ink)
    edge(c, [-2, 2.4, -2], [2, 2.4, -2], E, COL.ink)
    edge(c, [-2, 2.4, -2], [-2, 2.4, 2], E, COL.ink)
    edge(c, [2, 0, -2], [2, 0, 2], E * 0.6, COL.stone)
    edge(c, [-2, 0, 2], [2, 0, 2], E * 0.6, COL.stone)
    edge(c, [-2, 0.1, -1.99], [0.7, 0.1, -1.99], E * 0.7, COL.stone)
    edge(c, [1.5, 0.1, -1.99], [2, 0.1, -1.99], E * 0.3, COL.stone)
    edge(c, [-1.99, 0.1, -2], [-1.99, 0.1, 2], E * 0.7, COL.stone)

    // door
    box(c, 0.7, 1.0, -2, 0.05, 2.0, 0.05, 110 * m, COL.ink)
    box(c, 1.5, 1.0, -2, 0.05, 2.0, 0.05, 110 * m, COL.ink)
    box(c, 1.1, 2.0, -2, 0.85, 0.05, 0.05, 90 * m, COL.ink)

    // window on the left wall, with glass catching the light and curtains either side
    box(c, -1.99, 1.475, -0.85, 0.02, 0.95, 1.2, 560 * m, COL.cobalt)
    edge(c, [-1.97, 1.0, -1.45], [-1.97, 1.95, -1.45], 90 * m, COL.ink)
    edge(c, [-1.97, 1.0, -0.25], [-1.97, 1.95, -0.25], 90 * m, COL.ink)
    edge(c, [-1.97, 1.0, -1.45], [-1.97, 1.0, -0.25], 90 * m, COL.ink)
    edge(c, [-1.97, 1.95, -1.45], [-1.97, 1.95, -0.25], 90 * m, COL.ink)
    box(c, -1.9, 1.25, -1.62, 0.1, 2.0, 0.22, 360 * m, COL.pink)
    box(c, -1.9, 1.25, -0.08, 0.1, 2.0, 0.22, 360 * m, COL.pink)

    // paintings on the back wall
    painting(c, -0.7, 1.55, 0.9, 0.6, Math.round(900 * m))
    painting(c, 0.05, 1.35, 0.35, 0.45, Math.round(300 * m))

    // rug
    for (let i = 0; i < 1800 * m; i++) {
      const a = rand(0, Math.PI * 2)
      const r = Math.sqrt(Math.random()) * 0.95
      push(c, 0.55 + Math.cos(a) * r, 0.006, 0.3 + Math.sin(a) * r * 0.7, COL.pink, 0.04)
    }

    // furniture, dense and dark
    box(c, 0.55, 0.62, 0.3, 1.0, 0.05, 0.6, 800 * m, COL.ink)
    for (const [lx, lz] of [[0.1, 0.05], [1.0, 0.05], [0.1, 0.55], [1.0, 0.55]]) box(c, lx, 0.31, lz, 0.05, 0.62, 0.05, 70 * m, COL.ink)
    box(c, -0.7, 0.25, -1.45, 1.8, 0.5, 0.75, 1800 * m, COL.ink)
    box(c, -0.7, 0.65, -1.8, 1.8, 0.5, 0.14, 800 * m, COL.ink)
    box(c, -1.55, 0.45, -1.45, 0.14, 0.4, 0.75, 350 * m, COL.ink)
    box(c, 0.15, 0.45, -1.45, 0.14, 0.4, 0.75, 350 * m, COL.ink)

    // bookshelf against the left wall, on the other side of the room from the window
    box(c, -1.8, 0.9, 1.15, 0.35, 1.8, 0.9, 900 * m, COL.stone)
    for (const y of [0.4, 0.8, 1.2, 1.6]) box(c, -1.75, y, 1.15, 0.3, 0.03, 0.86, 150 * m, COL.ink)
    for (let i = 0; i < 160 * m; i++) {
      const y = [0.55, 0.95, 1.35, 1.75][Math.floor(Math.random() * 4)]
      push(c, -1.72, y - rand(0, 0.12), rand(0.75, 1.55), Math.random() < 0.5 ? COL.pink : COL.cobalt, 0.05)
    }

    // pendant lamp over the table, floor lamp in the corner, plant
    edge(c, [0.55, 2.4, 0.3], [0.55, 1.85, 0.3], 60 * m, COL.ink)
    sphere(c, 0.55, 1.75, 0.3, 0.17, 300 * m, COL.pink)
    box(c, 1.6, 0.65, -1.7, 0.04, 1.3, 0.04, 90 * m, COL.ink)
    sphere(c, 1.6, 1.4, -1.7, 0.22, 380 * m, COL.pink)
    sphere(c, 1.55, 0.6, 1.3, 0.4, 850 * m, COL.lime)
    box(c, 1.55, 0.15, 1.3, 0.3, 0.3, 0.3, 180 * m, COL.ink)

    // the scanner on its tripod
    for (const a of [0, 2.1, 4.2]) {
      const lx = SCANNER[0] + Math.cos(a) * 0.22
      const lz = SCANNER[2] + Math.sin(a) * 0.22
      for (let i = 0; i < 50 * m; i++) {
        const t = Math.random()
        push(c, SCANNER[0] + (lx - SCANNER[0]) * t, SCANNER[1] - t * SCANNER[1], SCANNER[2] + (lz - SCANNER[2]) * t, COL.ink)
      }
    }
    sphere(c, SCANNER[0], SCANNER[1] + 0.05, SCANNER[2], 0.12, 260 * m, COL.cobalt)
    return c
  }, [])

  return (
    <group position={[0, -1.1, 0]}>
      <PointCloud data={surfaces} size={24} pulseFrom={SCANNER} fx />
      <PointCloud data={objects} size={40} pulseFrom={SCANNER} fx />
    </group>
  )
}
