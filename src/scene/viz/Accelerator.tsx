import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import PointCloud from './PointCloud'
import { box, density, newCloud, push, rand, reduced, type Cloud, type RGB } from './common'

// A synchrotron light source in the style of Berkeley Lab's Advanced Light Source: a domed hall, a big storage ring,
// a smaller booster ring inside it, a linear accelerator feeding the booster, and beamlines running off the ring to
// experiment stations. Drawn like a glowing holographic blueprint.
const R = 2.2 // storage ring
const RB = 1.15 // booster ring
const MAGNETS = 24
const FLOOR_Y = -0.45
const FLOOR_R = 3.3

const PINK: RGB = [1.0, 0.3, 0.55]
const SKY: RGB = [0.0, 0.667, 1.0] // #00aaff
const INK: RGB = [0.17, 0.17, 0.2]
const STEEL: RGB = [0.34, 0.38, 0.48]
const PALE: RGB = [0.42, 0.5, 0.7]
const GLOW: RGB = [0.45, 0.68, 1.0]

const beamVert = `
uniform float uTime; uniform float uR; uniform float uDir; uniform float uSize; uniform float uPR;
attribute float aAngle; attribute vec3 aColor;
varying vec3 vColor;
void main() {
  float a = aAngle + uDir * uTime;
  vec3 p = vec3(cos(a) * uR, 0.0, sin(a) * uR) + position;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vColor = aColor;
  gl_PointSize = uSize * uPR / -mv.z;
  gl_Position = projectionMatrix * mv;
}`

const beamFrag = `
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(vColor, smoothstep(0.5, 0.3, d));
}`

// Tight, crisp bunches circling a ring, animated entirely on the GPU.
function Beam({ dir, rgb, radius, speed = 0.9, bunches = 3, size = 170 }: { dir: 1 | -1; rgb: RGB; radius: number; speed?: number; bunches?: number; size?: number }) {
  const { geo, mat } = useMemo(() => {
    const per = Math.round(90 * density)
    const jit: number[] = []
    const ang: number[] = []
    const col: number[] = []
    for (let b = 0; b < bunches; b++) {
      for (let i = 0; i < per; i++) {
        ang.push((b / bunches) * Math.PI * 2 + rand(-0.07, 0.07))
        jit.push(rand(-0.02, 0.02), rand(-0.02, 0.02), rand(-0.02, 0.02))
        col.push(...rgb)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(jit, 3))
    g.setAttribute('aAngle', new THREE.Float32BufferAttribute(ang, 1))
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3))
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uR: { value: radius },
        uDir: { value: dir },
        uSize: { value: size },
        uPR: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: beamVert,
      fragmentShader: beamFrag,
      transparent: true,
      depthWrite: false,
    })
    return { geo: g, mat: m }
  }, [dir, rgb, radius, bunches, size])

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = reduced ? 0.6 : clock.elapsedTime * speed
  })
  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
    },
    [geo, mat],
  )
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

const pulseVert = `
uniform float uTime; uniform float uSpeed; uniform float uSize; uniform float uPR;
attribute vec3 aEnd; attribute float aPhase; attribute vec3 aColor;
varying vec3 vColor; varying float vA;
void main() {
  float t = fract(uTime * uSpeed + aPhase);
  vec3 p = mix(position, aEnd, t);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vColor = aColor;
  vA = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.82, 1.0, t));
  gl_PointSize = uSize * uPR * (0.7 + 0.5 * t) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`

const pulseFrag = `
varying vec3 vColor; varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(vColor, smoothstep(0.5, 0.2, d) * vA);
}`

interface Run {
  from: [number, number, number]
  to: [number, number, number]
  rgb: RGB
}

// Light travelling along straight runs (the beamlines and the linac), on the GPU.
function Pulses({ runs, per = 4, speed = 0.3, size = 120 }: { runs: Run[]; per?: number; speed?: number; size?: number }) {
  const { geo, mat } = useMemo(() => {
    const start: number[] = []
    const end: number[] = []
    const phase: number[] = []
    const col: number[] = []
    runs.forEach((r, k) => {
      for (let i = 0; i < per; i++) {
        start.push(...r.from)
        end.push(...r.to)
        phase.push(i / per + (k % 5) * 0.07)
        col.push(...r.rgb)
      }
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(start, 3))
    g.setAttribute('aEnd', new THREE.Float32BufferAttribute(end, 3))
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1))
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3))
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSpeed: { value: speed }, uSize: { value: size }, uPR: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: pulseVert,
      fragmentShader: pulseFrag,
      transparent: true,
      depthWrite: false,
    })
    return { geo: g, mat: m }
  }, [runs, per, speed, size])

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = reduced ? 0.3 : clock.elapsedTime
  })
  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
    },
    [geo, mat],
  )
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

function segment(c: Cloud, a: [number, number, number], b: [number, number, number], n: number, rgb: RGB, tint = 0.03) {
  for (let i = 0; i < n; i++) {
    const t = Math.random()
    push(c, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, rgb, tint)
  }
}

function circle(c: Cloud, radius: number, y: number, n: number, rgb: RGB, tint = 0.03) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2)
    push(c, Math.cos(a) * radius, y, Math.sin(a) * radius, rgb, tint)
  }
}

// A block of magnets sitting around a ring, each turned to follow it.
function magnets(c: Cloud, radius: number, count: number, size: [number, number, number], perBlock: number, colour: (k: number) => RGB) {
  for (let k = 0; k < count; k++) {
    const th = (k / count) * Math.PI * 2
    const cx = Math.cos(th) * radius
    const cz = Math.sin(th) * radius
    const pts = newCloud()
    box(pts, 0, 0, 0, size[0], size[1], size[2], perBlock, colour(k))
    const mat = new THREE.Matrix4().makeRotationY(-th)
    const v = new THREE.Vector3()
    for (let i = 0; i < pts.pos.length; i += 3) {
      v.set(pts.pos[i], pts.pos[i + 1], pts.pos[i + 2]).applyMatrix4(mat)
      c.pos.push(v.x + cx, v.y, v.z + cz)
      c.col.push(pts.col[i], pts.col[i + 1], pts.col[i + 2])
    }
  }
}

const BEAMLINES = 12
const LINAC_Z = 1.15 // the linac runs along this line, touching the booster
const LINAC_X0 = -3.0

// Beamlines leave the storage ring along its tangent and end at experiment stations.
const lines: { from: [number, number, number]; to: [number, number, number]; end: [number, number, number]; th: number }[] = (() => {
  const out = []
  for (let k = 0; k < BEAMLINES; k++) {
    const th = (k / BEAMLINES) * Math.PI * 2 + 0.2
    const px = Math.cos(th) * R
    const pz = Math.sin(th) * R
    const tx = -Math.sin(th)
    const tz = Math.cos(th)
    const len = 1.55
    out.push({ from: [px, 0, pz] as [number, number, number], to: [px + tx * len, 0, pz + tz * len] as [number, number, number], end: [px + tx * (len + 0.12), 0, pz + tz * (len + 0.12)] as [number, number, number], th })
  }
  return out
})()

export default function Accelerator() {
  const data = useMemo(() => {
    const c = newCloud()
    const m = density * 1.5

    // the hall floor: concentric rings and radial spokes, like a blueprint
    for (const rr of [0.55, 1.15, 1.7, 2.2, 2.75, FLOOR_R]) circle(c, rr, FLOOR_Y, Math.round(rr * 220 * density), PALE, 0.05)
    for (let s = 0; s < 24; s++) {
      const a = (s / 24) * Math.PI * 2
      segment(c, [Math.cos(a) * 0.3, FLOOR_Y, Math.sin(a) * 0.3], [Math.cos(a) * FLOOR_R, FLOOR_Y, Math.sin(a) * FLOOR_R], Math.round(140 * density), PALE, 0.05)
    }
    for (let i = 0; i < 1800 * density; i++) {
      const a = rand(0, Math.PI * 2)
      const r = Math.sqrt(Math.random()) * FLOOR_R
      push(c, Math.cos(a) * r, FLOOR_Y, Math.sin(a) * r, [0.66, 0.7, 0.78], 0.05)
    }

    // the dome: a few meridians and rings of pale points, like a hologram of the hall's roof
    const domeH = 2.0
    const domeR = FLOOR_R - 0.05
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      for (let i = 0; i < 70 * density; i++) {
        const phi = Math.random() * (Math.PI / 2)
        push(c, Math.cos(a) * Math.cos(phi) * domeR, FLOOR_Y + Math.sin(phi) * domeH, Math.sin(a) * Math.cos(phi) * domeR, GLOW, 0.04)
      }
    }
    for (const phiDeg of [22, 42, 62, 78]) {
      const phi = (phiDeg * Math.PI) / 180
      circle(c, Math.cos(phi) * domeR, FLOOR_Y + Math.sin(phi) * domeH, Math.round(Math.cos(phi) * 260 * density), GLOW, 0.04)
    }

    // storage ring: pipe plus magnet blocks in dark steel, with blue and pink lights
    for (let i = 0; i < 7500 * m; i++) {
      const th = rand(0, Math.PI * 2)
      const ph = rand(0, Math.PI * 2)
      push(c, (R + Math.cos(ph) * 0.05) * Math.cos(th), Math.sin(ph) * 0.05, (R + Math.cos(ph) * 0.05) * Math.sin(th), INK, 0.03)
    }
    magnets(c, R, MAGNETS, [0.26, 0.24, 0.34], Math.round(240 * m), (k) => (k % 6 === 3 ? PINK : k % 3 === 0 ? SKY : k % 2 ? INK : STEEL))

    // booster ring inside, smaller and lighter
    for (let i = 0; i < 3500 * m; i++) {
      const th = rand(0, Math.PI * 2)
      const ph = rand(0, Math.PI * 2)
      push(c, (RB + Math.cos(ph) * 0.035) * Math.cos(th), Math.sin(ph) * 0.035, (RB + Math.cos(ph) * 0.035) * Math.sin(th), STEEL, 0.03)
    }
    magnets(c, RB, 12, [0.16, 0.15, 0.2], Math.round(120 * m), (k) => (k % 4 === 0 ? SKY : INK))

    // linear accelerator: a straight run of cavities from the electron gun to the booster
    segment(c, [LINAC_X0, 0, LINAC_Z], [0, 0, LINAC_Z], Math.round(900 * m), INK)
    for (let k = 0; k < 9; k++) {
      const x = LINAC_X0 + 0.28 + k * 0.3
      for (let i = 0; i < 60 * m; i++) {
        const a = rand(0, Math.PI * 2)
        push(c, x + rand(-0.07, 0.07), Math.cos(a) * 0.11, LINAC_Z + Math.sin(a) * 0.11, k % 2 ? SKY : GLOW, 0.04)
      }
    }
    box(c, LINAC_X0 - 0.15, 0, LINAC_Z, 0.35, 0.3, 0.3, Math.round(300 * m), SKY)

    // beamlines out to experiment stations, each with a glowing end
    for (const [k, l] of lines.entries()) {
      segment(c, l.from, l.to, Math.round(520 * density), STEEL)
      const dx = l.to[0] - l.from[0]
      const dz = l.to[2] - l.from[2]
      const mat = new THREE.Matrix4().makeRotationY(-Math.atan2(dz, dx))
      const pts = newCloud()
      box(pts, 0, 0, 0, 0.3, 0.2, 0.24, Math.round(170 * m), k % 3 === 0 ? PINK : SKY)
      const v = new THREE.Vector3()
      for (let i = 0; i < pts.pos.length; i += 3) {
        v.set(pts.pos[i], pts.pos[i + 1], pts.pos[i + 2]).applyMatrix4(mat)
        c.pos.push(v.x + l.end[0], v.y, v.z + l.end[2])
        c.col.push(pts.col[i], pts.col[i + 1], pts.col[i + 2])
      }
    }
    return c
  }, [])

  const runs = useMemo<Run[]>(
    () => [
      ...lines.map((l, k) => ({ from: l.from, to: l.to, rgb: k % 3 === 0 ? PINK : SKY })),
      { from: [LINAC_X0, 0, LINAC_Z] as [number, number, number], to: [-0.05, 0, LINAC_Z] as [number, number, number], rgb: GLOW },
    ],
    [],
  )

  return (
    <group>
      <PointCloud data={data} size={22} />
      <Pulses runs={runs} per={4} />
      <Beam dir={1} rgb={PINK} radius={R + 0.05} />
      <Beam dir={-1} rgb={SKY} radius={R - 0.05} />
      <Beam dir={1} rgb={[0.1, 0.85, 1.0]} radius={RB} speed={1.7} bunches={2} size={120} />
    </group>
  )
}
