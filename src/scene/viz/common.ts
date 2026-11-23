export type RGB = [number, number, number]

// Palette from the references, tuned to read on the cream gradient.
export const COL = {
  ink: [0.17, 0.17, 0.15] as RGB,
  stone: [0.36, 0.35, 0.33] as RGB,
  mist: [0.5, 0.49, 0.46] as RGB,
  cobalt: [0.12, 0.18, 0.82] as RGB,
  pink: [0.96, 0.53, 0.62] as RGB,
  lime: [0.3, 0.85, 0.2] as RGB,
}

export const reduced =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// A few fewer points on phones, so they stay smooth. The dots shrink with the panel (see PointCloud), so the scene still looks like the desktop one.
export const density = typeof window !== 'undefined' && window.innerWidth < 768 ? 0.85 : 1

export const rand = (a: number, b: number) => a + Math.random() * (b - a)

export interface Cloud {
  pos: number[]
  col: number[]
}

export const newCloud = (): Cloud => ({ pos: [], col: [] })

export function push(c: Cloud, x: number, y: number, z: number, rgb: RGB, tint = 0.08) {
  c.pos.push(x, y, z)
  const t = rand(-tint, tint)
  c.col.push(rgb[0] + t, rgb[1] + t, rgb[2] + t)
}

// Random points on the surface of a box.
export function box(c: Cloud, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, n: number, rgb: RGB) {
  const ax = sy * sz
  const ay = sx * sz
  const az = sx * sy
  const total = ax + ay + az
  for (let i = 0; i < n; i++) {
    const r = Math.random() * total
    const s = Math.random() < 0.5 ? -0.5 : 0.5
    let x = rand(-0.5, 0.5)
    let y = rand(-0.5, 0.5)
    let z = rand(-0.5, 0.5)
    if (r < ax) x = s
    else if (r < ax + ay) y = s
    else z = s
    push(c, cx + x * sx, cy + y * sy, cz + z * sz, rgb)
  }
}

export function sphere(c: Cloud, cx: number, cy: number, cz: number, rad: number, n: number, rgb: RGB) {
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1
    const t = Math.random() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    push(c, cx + rad * s * Math.cos(t), cy + rad * u, cz + rad * s * Math.sin(t), rgb)
  }
}

export const fragSimple = `
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(vColor, smoothstep(0.5, 0.15, d));
}`
