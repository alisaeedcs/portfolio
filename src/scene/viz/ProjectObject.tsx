import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { reduced } from './common'

// Each project is a soft, rounded, glossy object made of simple shapes. (`points` and `pointColor` on a part are
// leftovers from an earlier point-cloud version and aren't used.)
type Shape = 'blob' | 'dotbox' | 'window' | 'robot'

interface Part {
  geo: THREE.BufferGeometry
  color: string
  roughness?: number
  clearcoat?: number
  emissive?: string
  emissiveIntensity?: number
  opacity?: number
  doubleSide?: boolean
  map?: THREE.Texture
  points: number // how many points to scatter over this part's surface
  pointColor?: string // points can differ from the solid, e.g. a dark body with bright points
}

// XLeRobot, cartoon version: a stubby little three-tier cart with the real star on top, a pair of chunky black-sleeved
// arms and a camera mast with a cute face. The right arm holds a can, and a googly-eyed buddy peeks out between
// the arms. The cart is kept short so the top gets most of the attention.
function buildRobot(): Part[] {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
  // rounded boxes are non-indexed while cylinders and capsules are indexed, and merging needs them to match
  const merge = (gs: THREE.BufferGeometry[]) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)))!
  const rbox = (w: number, h: number, d: number, r: number, x: number, y: number, z: number) => {
    const g = new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001))
    g.translate(x, y, z)
    return g
  }
  const cylinder = (rt: number, rb: number, h: number, x: number, y: number, z: number) => {
    const g = new THREE.CylinderGeometry(rt, rb, h, 32)
    g.translate(x, y, z)
    return g
  }
  const ball = (r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
    const g = new THREE.SphereGeometry(r, 24, 18)
    g.scale(sx, sy, sz)
    g.translate(x, y, z)
    return g
  }
  // a capsule running from point a to point b, like a limb
  const limb = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
    const len = a.distanceTo(b)
    const g = new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 10, 20)
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()))
    const mid = a.clone().add(b).multiplyScalar(0.5)
    g.translate(mid.x, mid.y, mid.z)
    return g
  }
  // a ring around a limb, perpendicular to `dir`
  const band = (at: THREE.Vector3, dir: THREE.Vector3, r: number, tube: number) => {
    const g = new THREE.TorusGeometry(r, tube, 10, 28)
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), dir.clone().normalize()))
    g.translate(at.x, at.y, at.z)
    return g
  }
  // A two-finger gripper at `at`, pointing along `dir`. It has a round wrist joint, a rounded palm, two chunky
  // fingers with pale grip pads and rounded tips, and a tiny wrist camera on top. `gap` is how far apart the fingers sit.
  const gripper = (at: THREE.Vector3, dir: THREE.Vector3, gap: number) => {
    const z = dir.clone().normalize()
    const x = V(0, 1, 0).cross(z).normalize()
    const y = z.clone().cross(x)
    const m = new THREE.Matrix4().makeBasis(x, y, z).setPosition(at)
    const place = (g: THREE.BufferGeometry) => g.applyMatrix4(m)
    const black: THREE.BufferGeometry[] = [ball(0.16, 0, 0, -0.03), rbox(0.32, 0.25, 0.24, 0.08, 0, 0, 0.14), rbox(0.12, 0.07, 0.14, 0.03, 0, 0.16, 0.16)]
    const pads: THREE.BufferGeometry[] = []
    for (const s of [-1, 1]) {
      black.push(rbox(0.09, 0.14, 0.36, 0.04, s * gap, 0, 0.42), ball(0.062, s * gap, 0, 0.6, 1, 1.1, 1.2))
      pads.push(rbox(0.022, 0.11, 0.24, 0.01, s * (gap - 0.055), 0, 0.45))
    }
    const lens = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16)
    lens.rotateX(Math.PI / 2)
    lens.translate(0, 0.16, 0.235)
    return { black: merge(black.map(place)), pads: merge(pads.map(place)), lens: place(lens) }
  }

  // the stubby cart
  const TOP = 1.7 // height of the top tray's floor
  const W = 1.9
  const D = 1.2
  const trays = [0.45, 1.07, TOP].map((y) =>
    merge([
      rbox(W, 0.08, D, 0.04, 0, y, 0),
      rbox(W, 0.2, 0.06, 0.03, 0, y + 0.12, D / 2 - 0.03),
      rbox(W, 0.2, 0.06, 0.03, 0, y + 0.12, -D / 2 + 0.03),
      rbox(0.06, 0.2, D, 0.03, W / 2 - 0.03, y + 0.12, 0),
      rbox(0.06, 0.2, D, 0.03, -W / 2 + 0.03, y + 0.12, 0),
    ]),
  )
  const posts: THREE.BufferGeometry[] = []
  for (const x of [-W / 2 + 0.1, W / 2 - 0.1]) {
    for (const z of [-D / 2 + 0.1, D / 2 - 0.1]) posts.push(cylinder(0.055, 0.055, TOP - 0.21, x, (0.41 + TOP + 0.2) / 2, z)) // from the underside of the bottom tray up; nothing hangs below it
  }
  // Proper caster wheels: a dark tyre, a lighter grey hub ring set inside it, a small cap in the middle, and a little
  // fork bracket holding the wheel under the cart.
  const tyres: THREE.BufferGeometry[] = []
  const hubs: THREE.BufferGeometry[] = []
  const caps: THREE.BufferGeometry[] = []
  const brackets: THREE.BufferGeometry[] = []
  const wheelDisc = (r: number, width: number, x: number, y: number, z: number) => {
    const g = new THREE.CylinderGeometry(r, r, width, 36)
    g.rotateZ(Math.PI / 2) // the wheel turns about the sideways axis
    g.translate(x, y, z)
    return g
  }
  for (const x of [-W / 2 + 0.15, W / 2 - 0.15]) {
    for (const z of [-D / 2 + 0.15, D / 2 - 0.15]) {
      tyres.push(wheelDisc(0.135, 0.1, x, 0.18, z))
      hubs.push(wheelDisc(0.088, 0.112, x, 0.18, z))
      caps.push(wheelDisc(0.035, 0.124, x, 0.18, z))
      brackets.push(rbox(0.022, 0.2, 0.11, 0.01, x - 0.068, 0.295, z), rbox(0.022, 0.2, 0.11, 0.01, x + 0.068, 0.295, z), rbox(0.17, 0.035, 0.13, 0.015, x, 0.398, z))
    }
  }

  // the top deck
  const bases = merge([
    rbox(1.0, 0.34, 0.8, 0.1, 0, TOP + 0.21, 0),
    cylinder(0.27, 0.27, 0.46, -0.5, TOP + 0.44, 0.02),
    cylinder(0.27, 0.27, 0.46, 0.5, TOP + 0.44, 0.02),
  ])
  const by = TOP + 0.62 // where the arms leave their bases
  // left arm: up and out, then bending over with the hand to the side
  const lS = V(-0.5, by, 0.02)
  const lE = V(-0.95, by + 0.85, 0.05)
  const lW = V(-1.65, by + 0.55, 0.3)
  // right arm: reaching forward with the hand around a can
  const rS = V(0.5, by, 0.02)
  const rE = V(1.0, by + 0.75, 0.05)
  const rW = V(0.8, by + 0.45, 0.9)
  // XLeRobot's arms, cartoon style: chunky dark links joined by boxy servos with silver horns, a few little cables,
  // and a two-finger gripper with a wrist camera on the end.
  const link = (a: THREE.Vector3, b: THREE.Vector3, w: number, d: number) => {
    const len = a.distanceTo(b)
    const g = new RoundedBoxGeometry(w, len, d, 4, Math.min(0.07, w / 2 - 0.001, d / 2 - 0.001))
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()))
    const mid = a.clone().add(b).multiplyScalar(0.5)
    g.translate(mid.x, mid.y, mid.z)
    return g
  }
  // a boxy servo with a silver horn disc and a dark screw on each side
  const servo = (at: THREE.Vector3, size: number) => {
    const sides = [-1, 1]
    return {
      block: rbox(size, size * 0.9, size, 0.08, at.x, at.y, at.z),
      horns: sides.map((s) => {
        const g = new THREE.CylinderGeometry(size * 0.34, size * 0.34, 0.05, 24)
        g.rotateX(Math.PI / 2)
        g.translate(at.x, at.y, at.z + s * (size / 2 + 0.01))
        return g
      }),
      screws: sides.map((s) => ball(0.035, at.x, at.y, at.z + s * (size / 2 + 0.04))),
    }
  }
  // A thin cable running straight along the face of a link between two joints, lying right on the surface. The red
  // one (phase 0) and the white one (anything else) sit side by side on the side of the arm that faces the viewer.
  const wrap = (a: THREE.Vector3, b: THREE.Vector3, phase: number, r: number) => {
    const axis = b.clone().sub(a)
    const len = axis.length()
    axis.normalize()
    const side = V(0, 0, 1).sub(axis.clone().multiplyScalar(axis.z)).normalize()
    const across = axis.clone().cross(side)
    const off = side.multiplyScalar(r - 0.01).add(across.multiplyScalar(phase === 0 ? 0.035 : -0.035))
    const p0 = a.clone().add(axis.clone().multiplyScalar(len * 0.2)).add(off)
    const p1 = a.clone().add(axis.clone().multiplyScalar(len * 0.8)).add(off)
    return new THREE.TubeGeometry(new THREE.LineCurve3(p0, p1), 2, 0.016, 6)
  }

  const arms = { links: [] as THREE.BufferGeometry[], blocks: [] as THREE.BufferGeometry[], horns: [] as THREE.BufferGeometry[], screws: [] as THREE.BufferGeometry[], red: [] as THREE.BufferGeometry[], white: [] as THREE.BufferGeometry[] }
  const addArm = (S: THREE.Vector3, E: THREE.Vector3, Wr: THREE.Vector3) => {
    const dir = Wr.clone().sub(E).normalize()
    const wristAt = Wr.clone().sub(dir.clone().multiplyScalar(0.13))
    for (const [at, size] of [[S, 0.36], [E, 0.34], [wristAt, 0.26]] as [THREE.Vector3, number][]) {
      const s = servo(at, size)
      arms.blocks.push(s.block)
      arms.horns.push(...s.horns)
      arms.screws.push(...s.screws)
    }
    arms.links.push(link(S, E, 0.2, 0.22), link(E, wristAt, 0.17, 0.19))
    // one red and one white cable running along each arm
    arms.red.push(wrap(S, E, 0, 0.135), wrap(E, wristAt, 0, 0.115))
    arms.white.push(wrap(S, E, Math.PI, 0.135), wrap(E, wristAt, Math.PI, 0.115))
  }
  addArm(lS, lE, lW)
  addArm(rS, rE, rW)

  // the mast: a little ladder frame with a motor block at the top, like the open frame on the real robot
  const mastBars: THREE.BufferGeometry[] = [
    link(V(-0.11, by - 0.05, -0.08), V(-0.08, by + 1.05, -0.08), 0.07, 0.13),
    link(V(0.11, by - 0.05, -0.08), V(0.08, by + 1.05, -0.08), 0.07, 0.13),
  ]
  for (const t of [0.08, 0.28, 0.48, 0.68, 0.88]) mastBars.push(rbox(0.2 - 0.05 * t, 0.05, 0.09, 0.02, 0, by - 0.05 + 1.1 * t, -0.08))
  arms.blocks.push(rbox(0.56, 0.13, 0.46, 0.05, 0, by - 0.09, -0.08), rbox(0.3, 0.3, 0.26, 0.07, 0, by + 1.18, -0.08))

  const gl = gripper(lW, lW.clone().sub(lE), 0.1)
  const rd = rW.clone().sub(rE).normalize()
  const gr = gripper(rW, rW.clone().sub(rE), 0.19) // opened a little wider, around the can

  // the camera, with a face
  const camY = by + 1.42
  const camera = rbox(0.95, 0.3, 0.24, 0.1, 0, camY, -0.04)
  const lens = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 28)
  lens.rotateX(Math.PI / 2)
  lens.translate(0, camY, 0.09)
  const shine = ball(0.03, 0.035, camY + 0.035, 0.115)
  const cheeks = merge([ball(0.065, -0.33, camY - 0.03, 0.085, 1, 0.65, 0.4), ball(0.065, 0.33, camY - 0.03, 0.085, 1, 0.65, 0.4)])

  // A soda can with some real detail: a printed label with a white wave and script lettering (a "cola" design of
  // my own, not a real brand's logo), a tapered neck, silver lid with a rim and pull tab, and a rounded silver base.
  const canTexture = () => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 352
    const g = c.getContext('2d')!
    g.fillStyle = '#e8281f'
    g.fillRect(0, 0, 1024, 352)
    g.fillStyle = 'rgba(255,255,255,0.08)'
    g.fillRect(0, 0, 1024, 26)
    g.fillRect(0, 326, 1024, 26)
    for (const cx of [256, 768]) {
      g.fillStyle = '#ffffff'
      g.beginPath()
      g.moveTo(cx - 235, 248)
      g.bezierCurveTo(cx - 120, 200, cx + 20, 300, cx + 235, 226)
      g.lineTo(cx + 235, 262)
      g.bezierCurveTo(cx + 20, 336, cx - 120, 236, cx - 235, 286)
      g.closePath()
      g.fill()
      g.save()
      g.translate(cx, 150)
      g.rotate(-0.07)
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.font = 'italic 700 132px "Segoe Script","Brush Script MT","Snell Roundhand",cursive'
      g.fillStyle = 'rgba(120,0,0,0.35)'
      g.fillText('cola', 5, 6)
      g.fillStyle = '#ffffff'
      g.fillText('cola', 0, 0)
      g.restore()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }
  const canAt = (cx: number, cy: number, cz: number) => {
    const H = 0.3 // height of the printed body
    const yb = cy - 0.2 // the can's bottom edge
    const at = (g: THREE.BufferGeometry, y: number) => g.translate(cx, yb + y, cz)
    const body = new THREE.CylinderGeometry(0.14, 0.14, H, 48, 1, true)
    at(body, 0.03 + H / 2)
    const neck = new THREE.CylinderGeometry(0.105, 0.14, 0.06, 48, 1, true)
    at(neck, 0.03 + H + 0.03)
    const base = new THREE.CylinderGeometry(0.14, 0.112, 0.035, 48)
    at(base, 0.0175)
    const rim = new THREE.TorusGeometry(0.105, 0.013, 10, 48)
    rim.rotateX(Math.PI / 2)
    at(rim, 0.03 + H + 0.06)
    const lid = new THREE.CylinderGeometry(0.097, 0.097, 0.014, 40)
    at(lid, 0.03 + H + 0.052)
    const tabRing = new THREE.TorusGeometry(0.022, 0.007, 8, 20)
    tabRing.rotateX(Math.PI / 2)
    tabRing.translate(cx + 0.045, yb + 0.03 + H + 0.066, cz)
    const tab = rbox(0.085, 0.01, 0.045, 0.012, cx + 0.015, yb + 0.03 + H + 0.063, cz)
    return { body, silver: merge([neck, base, rim, lid, tabRing, tab]) }
  }
  const redCan = canAt(rW.x + rd.x * 0.5, rW.y + rd.y * 0.5, rW.z + rd.z * 0.5)

  // Plastic cups standing on the tray: hollow and a little flared, with a rim, a drink and a straw.
  const wall = [new THREE.Vector2(0, 0.03), new THREE.Vector2(0.115, 0.03), new THREE.Vector2(0.178, 0.45), new THREE.Vector2(0.2, 0.46), new THREE.Vector2(0.128, 0), new THREE.Vector2(0, 0)]
  const cupAt = (cx: number, cz: number) => {
    const cy = TOP + 0.04
    const body = new THREE.LatheGeometry(wall, 40)
    body.translate(cx, cy, cz)
    const rim = new THREE.TorusGeometry(0.192, 0.02, 12, 40)
    rim.rotateX(Math.PI / 2)
    rim.translate(cx, cy + 0.46, cz)
    return {
      body,
      rim,
      drink: cylinder(0.168, 0.12, 0.3, cx, cy + 0.18, cz),
      straw: limb(V(cx + 0.04, cy + 0.08, cz), V(cx + 0.12, cy + 0.7, cz - 0.02), 0.022),
    }
  }
  const greenCup = cupAt(-0.76, 0.38)

  // the googly-eyed buddy sits at the front of the tray, clear of the rim
  const buddy = rbox(0.42, 0.2, 0.28, 0.07, 0.05, TOP + 0.15, 0.3)
  const eyes = merge([ball(0.105, -0.06, TOP + 0.37, 0.34), ball(0.105, 0.16, TOP + 0.37, 0.34)])
  const pupils = merge([ball(0.05, -0.055, TOP + 0.37, 0.44), ball(0.05, 0.165, TOP + 0.37, 0.44)])

  // the arms, mast and camera are nudged back a little to leave room for the buddy and the cup in front
  const back = (g: THREE.BufferGeometry) => g.translate(0, 0, -0.1)

  const parts: Part[] = [
    { geo: merge([...trays, ...posts]), color: '#4aa8ff', roughness: 0.35, clearcoat: 0.9, points: 0 },
    { geo: merge(tyres), color: '#26272b', roughness: 0.7, points: 0 },
    { geo: merge(hubs), color: '#a3a9b2', roughness: 0.35, clearcoat: 0.6, points: 0 },
    { geo: merge(caps), color: '#6b717a', roughness: 0.4, points: 0 },
    { geo: merge(brackets), color: '#6b717a', roughness: 0.45, clearcoat: 0.4, points: 0 },
    { geo: back(bases), color: '#24262c', roughness: 0.5, clearcoat: 0.3, points: 0 },
    { geo: back(merge([...arms.links, ...mastBars])), color: '#3b3f47', roughness: 0.45, clearcoat: 0.5, points: 0 },
    { geo: back(merge(arms.blocks)), color: '#1f2126', roughness: 0.5, clearcoat: 0.4, points: 0 },
    { geo: back(merge(arms.horns)), color: '#c8ccd3', roughness: 0.3, clearcoat: 0.8, points: 0 },
    { geo: back(merge(arms.screws)), color: '#14151a', roughness: 0.4, points: 0 },
    { geo: back(merge([gl.black, gr.black])), color: '#1b1c21', roughness: 0.4, clearcoat: 0.5, points: 0 },
    { geo: back(merge(arms.red)), color: '#ff4d4d', roughness: 0.5, points: 0 },
    { geo: back(merge(arms.white)), color: '#f3f3f3', roughness: 0.5, points: 0 },
    { geo: back(merge([gl.pads, gr.pads])), color: '#ece7de', roughness: 0.6, points: 0 },
    { geo: back(merge([gl.lens, gr.lens])), color: '#2a3bff', roughness: 0.2, clearcoat: 1, emissive: '#2a3bff', emissiveIntensity: 0.5, points: 0 },
    { geo: back(camera), color: '#f1f3f7', roughness: 0.3, clearcoat: 0.9, points: 0 },
    { geo: back(lens), color: '#15161a', roughness: 0.2, clearcoat: 1, points: 0 },
    { geo: back(shine), color: '#ffffff', roughness: 0.1, emissive: '#ffffff', emissiveIntensity: 0.6, points: 0 },
    { geo: back(cheeks), color: '#ff8fb1', roughness: 0.5, points: 0 },
    { geo: back(redCan.body), color: '#ffffff', map: canTexture(), roughness: 0.3, clearcoat: 0.9, points: 0 },
    { geo: back(redCan.silver), color: '#d9dde3', roughness: 0.25, clearcoat: 0.8, points: 0 },
    { geo: greenCup.body, color: '#e6f6ff', roughness: 0.1, clearcoat: 1, opacity: 0.35, doubleSide: true, points: 0 },
    { geo: greenCup.rim, color: '#ffffff', roughness: 0.3, clearcoat: 1, points: 0 },
    { geo: greenCup.drink, color: '#7bf24d', roughness: 0.15, clearcoat: 1, points: 0 },
    { geo: greenCup.straw, color: '#ff8fb1', roughness: 0.3, clearcoat: 1, points: 0 },
    { geo: buddy, color: '#ffc83d', roughness: 0.4, clearcoat: 0.6, points: 0 },
    { geo: eyes, color: '#ffffff', roughness: 0.2, clearcoat: 1, points: 0 },
    { geo: pupils, color: '#15161a', roughness: 0.2, points: 0 },
  ]

  // centre the whole robot and scale it to sit inside the viewer
  const box = new THREE.Box3()
  for (const p of parts) {
    p.geo.computeBoundingBox()
    box.union(p.geo.boundingBox!)
  }
  const centre = box.getCenter(new THREE.Vector3())
  centre.x = 0 // spin around the cart's own vertical axis, not the middle of the arms' reach
  centre.z = 0
  for (const p of parts) p.geo.translate(-centre.x, -centre.y, -centre.z)
  // the true radius: the farthest any point is from the centre (tighter than the box's corner-to-corner sphere)
  let radius = 0
  for (const p of parts) {
    const pos = p.geo.attributes.position
    for (let i = 0; i < pos.count; i++) radius = Math.max(radius, Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)))
  }
  const k = 2.15 / radius
  for (const p of parts) p.geo.scale(k, k, k)
  return parts
}

function build(shape: Shape): Part[] {
  if (shape === 'blob') {
    let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1.2, 6)
    g.deleteAttribute('normal')
    g.deleteAttribute('uv')
    g = mergeVertices(g) // share vertices so the normals come out smooth, not faceted
    const p = g.attributes.position
    const v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      const k = 1 + 0.16 * Math.sin(v.x * 2.6 + 1.3) + 0.13 * Math.sin(v.y * 3.1 + 0.7) + 0.11 * Math.sin(v.z * 3.7 + 2.1)
      v.multiplyScalar(k)
      p.setXYZ(i, v.x, v.y * 0.92, v.z)
    }
    g.computeVertexNormals()
    return [{ geo: g, color: '#ff8fb1', roughness: 0.28, clearcoat: 1, points: 9000 }]
  }

  if (shape === 'robot') return buildRobot()

  if (shape === 'dotbox') {
    const body = new RoundedBoxGeometry(2.2, 2.9, 0.5, 6, 0.22)
    // the perforated grid: pale discs on the front face
    const discs: THREE.BufferGeometry[] = []
    for (let cx = 0; cx < 5; cx++) {
      for (let cy = 0; cy < 6; cy++) {
        const d = new THREE.CircleGeometry(0.15, 28)
        d.translate(-0.8 + cx * 0.4, -1.0 + cy * 0.4, 0.2515)
        discs.push(d)
      }
    }
    const holes = mergeGeometries(discs)!
    // charms: a cobalt flower and a pink pill, like the toy case it's borrowed from
    const petals: THREE.BufferGeometry[] = []
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const s = new THREE.SphereGeometry(0.1, 14, 14)
      s.translate(0.62 + Math.cos(a) * 0.19, -0.92 + Math.sin(a) * 0.19, 0.36)
      petals.push(s)
    }
    const core = new THREE.SphereGeometry(0.13, 16, 16)
    core.translate(0.62, -0.92, 0.38)
    petals.push(core)
    const flower = mergeGeometries(petals)!
    const pill = new THREE.CapsuleGeometry(0.1, 0.3, 8, 14)
    pill.rotateZ(-0.7)
    pill.translate(-0.55, 0.75, 0.34)
    return [
      { geo: body, color: '#5cf23a', roughness: 0.35, clearcoat: 0.8, points: 7000 },
      { geo: holes, color: '#cfe8f3', roughness: 0.5, points: 1600 },
      { geo: flower, color: '#2a3bff', roughness: 0.3, clearcoat: 1, points: 900 },
      { geo: pill, color: '#ff8fb1', roughness: 0.3, clearcoat: 1, points: 500 },
    ]
  }

  // window: a dark rounded device with one large glowing window and a thin light bar
  const body = new RoundedBoxGeometry(2.3, 2.7, 0.9, 6, 0.3)
  const win = new RoundedBoxGeometry(1.75, 1.35, 0.08, 4, 0.14)
  win.translate(0, 0.2, 0.46)
  const bar = new RoundedBoxGeometry(0.95, 0.07, 0.06, 3, 0.03)
  bar.translate(0, -0.93, 0.46)
  return [
    { geo: body, color: '#0f1a45', roughness: 0.4, clearcoat: 0.9, points: 7500, pointColor: '#2a3bff' },
    { geo: win, color: '#7cc4ff', emissive: '#4aa8ff', emissiveIntensity: 1.5, roughness: 0.2, points: 2600, pointColor: '#00aaff' },
    { geo: bar, color: '#d6f0ff', emissive: '#bfe6ff', emissiveIntensity: 1.6, points: 300, pointColor: '#00aaff' },
  ]
}

const easeOutBack = (t: number) => {
  const c1 = 1.5
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
const easeInOut = (t: number) => t * t * (3 - 2 * t)

// The object itself, as a solid. It settles into place with a small bounce when it appears.
export default function ProjectObject({ shape, play = true }: { shape: Shape; play?: boolean }) {
  const parts = useMemo(() => build(shape), [shape])

  const mats = useMemo(
    () =>
      parts.map(
        (part) =>
          new THREE.MeshPhysicalMaterial({
            color: part.color,
            roughness: part.roughness ?? 0.4,
            clearcoat: part.clearcoat ?? 0,
            clearcoatRoughness: 0.15,
            emissive: part.emissive ?? '#000000',
            emissiveIntensity: part.emissiveIntensity ?? 0,
            transparent: (part.opacity ?? 1) < 1,
            opacity: part.opacity ?? 1,
            depthWrite: (part.opacity ?? 1) >= 1,
            side: part.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
            map: part.map ?? null,
          }),
      ),
    [parts],
  )

  const group = useRef<THREE.Group>(null)
  const born = useRef(-1)
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    if (!play) {
      // waiting, invisible, to be revealed: hold the starting pose so the settle-in plays when it is shown
      born.current = -1
      g.scale.setScalar(0.8)
      g.position.y = -0.3
      return
    }
    if (born.current < 0) born.current = clock.elapsedTime
    const k = reduced ? 1 : Math.min(1, (clock.elapsedTime - born.current) / 0.95)
    g.scale.setScalar(0.8 + 0.2 * easeOutBack(k))
    g.position.y = (1 - easeInOut(k)) * -0.3
  })

  useEffect(
    () => () => {
      mats.forEach((m) => m.dispose())
      parts.forEach((p) => {
        p.geo.dispose()
        p.map?.dispose()
      })
    },
    [mats, parts],
  )

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} />
      <directionalLight position={[-4, 2, -3]} intensity={0.9} color="#ffd9e6" />
      <group ref={group}>
        {parts.map((part, i) => (
          <mesh key={i} geometry={part.geo} material={mats[i]} />
        ))}
      </group>
    </>
  )
}
