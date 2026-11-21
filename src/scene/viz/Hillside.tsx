import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import PointCloud, { PING_SPEED, type Ping } from './PointCloud'
import { density, newCloud, push, rand, reduced, type RGB } from './common'
import { bush, conifer, log, rng, rock, roundTree } from './nature'

const height = (x: number, z: number) =>
  0.55 * Math.sin(x * 0.8) * Math.cos(z * 0.65) + 0.22 * Math.sin(x * 2.1 + z * 1.3) + 0.3 * x

// Two colours for the outer sensors and the light each ping spreads across the ground; the gateway in the middle is green.
const ORANGE: RGB = [1.0, 0.42, 0.18]
const FUCHSIA: RGB = [0.0, 0.667, 1.0] // #00aaff
const EMERALD: RGB = [0.04, 0.7, 0.46]
const hex = (c: RGB) => `#${c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`

const SENSORS: { x: number; z: number; color: RGB }[] = [
  { x: -2.2, z: -1.4, color: ORANGE },
  { x: -0.9, z: 1.6, color: FUCHSIA },
  { x: 0.2, z: -0.6, color: EMERALD }, // gateway
  { x: 1.3, z: 1.2, color: ORANGE },
  { x: 2.0, z: -1.8, color: FUCHSIA },
  { x: -1.6, z: 0.3, color: ORANGE },
  { x: 0.9, z: -2.2, color: FUCHSIA },
]
const GATEWAY = 2
// Evenly spaced turns, alternating colours: sensor 0 (orange), 4 (fuchsia), 3, 1, 5, 6. Each sends a packet one sixth of a cycle after the last.
const ORDER = [0, 4, 3, 1, 5, 6]
const turn = (i: number) => ORDER.indexOf(i) / ORDER.length

// Shared between the links and the gateway: each arriving packet bumps this, and it fades back down.
const gateway = { flash: 0 }

// The ground: sage low down, a touch of mauve up high, dark contour lines. Pings light it up.
const LOW: RGB = [0.52, 0.6, 0.44]
const HIGH: RGB = [0.62, 0.52, 0.56]
const CONTOUR: RGB = [0.17, 0.17, 0.15]

const top = (i: number) => new THREE.Vector3(SENSORS[i].x, height(SENSORS[i].x, SENSORS[i].z) + 0.3, SENSORS[i].z)

// An arc between a sensor and the gateway, plus a data packet travelling along it.
function Link({ from, to, color, phase }: { from: number; to: number; color: RGB; phase: number }) {
  const packet = useRef<THREE.Mesh>(null!)
  const { curve, line } = useMemo(() => {
    const a = top(from)
    const b = top(to)
    const mid = a.clone().add(b).multiplyScalar(0.5)
    mid.y += 0.55
    const cv = new THREE.QuadraticBezierCurve3(a, mid, b)
    const geo = new THREE.BufferGeometry().setFromPoints(cv.getPoints(40))
    const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#2b2a27', transparent: true, opacity: 0.3 }))
    return { curve: cv, line: ln }
  }, [from, to])

  const prev = useRef(0)
  useFrame(({ clock }) => {
    const t = reduced ? 0.5 : (clock.elapsedTime * PING_SPEED + phase) % 1
    packet.current.position.copy(curve.getPoint(t))
    if (t < prev.current) gateway.flash = Math.min(1, gateway.flash + 0.75) // the packet just arrived
    prev.current = t
  })

  return (
    <group>
      <primitive object={line} />
      <mesh ref={packet}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color={hex(color)} />
      </mesh>
    </group>
  )
}

// The centre node: it swells and glows a little each time a packet arrives.
function GatewayNode({ position, color }: { position: [number, number, number]; color: RGB }) {
  const core = useRef<THREE.Mesh>(null!)
  const halo = useRef<THREE.Mesh>(null!)
  const base = useMemo(() => new THREE.Color(hex(color)), [color])
  const white = useMemo(() => new THREE.Color('#ffffff'), [])
  useFrame(() => {
    gateway.flash *= 0.94
    const f = gateway.flash
    core.current.scale.setScalar(1 + f * 0.45)
    ;(core.current.material as THREE.MeshBasicMaterial).color.copy(base).lerp(white, f * 0.55)
    halo.current.scale.setScalar(0.8 + f * 0.9)
    ;(halo.current.material as THREE.MeshBasicMaterial).opacity = f * 0.4
  })
  return (
    <group position={position}>
      <mesh ref={core}>
        <sphereGeometry args={[0.11, 20, 20]} />
        <meshBasicMaterial color={hex(color)} />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[0.26, 20, 20]} />
        <meshBasicMaterial color={hex(color)} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

// An outer sensor: its ball gives a quick pop at the moment it sends a packet, the same moment its ring bursts out below.
function SensorNode({ position, color, phase }: { position: [number, number, number]; color: RGB; phase: number }) {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => {
    const t = reduced ? 0.5 : (clock.elapsedTime * PING_SPEED + phase) % 1
    ref.current.scale.setScalar(1 + 0.6 * Math.max(0, 1 - t / 0.12))
  })
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.07, 16, 16]} />
      <meshBasicMaterial color={hex(color)} />
    </mesh>
  )
}

// A hillside of lidar points with contour lines, coloured sensors, and data flowing to a gateway.
export default function Hillside() {
  const data = useMemo(() => {
    const c = newCloud()
    const step = density < 1 ? 0.075 : 0.054
    for (let x = -3.2; x <= 3.2; x += step) {
      for (let z = -3.2; z <= 3.2; z += step) {
        const px = x + rand(-step / 2, step / 2)
        const pz = z + rand(-step / 2, step / 2)
        if (px * px + pz * pz > 3.2 * 3.2) continue // a round patch of hillside, so no corners to clip
        const h = height(px, pz)
        const t = THREE.MathUtils.clamp((h + 1.2) / 2.4, 0, 1)
        const contour = (h * 4) % 1
        const onLine = contour < 0.045 || contour > 0.955
        const rgb: RGB = onLine ? CONTOUR : [LOW[0] + (HIGH[0] - LOW[0]) * t, LOW[1] + (HIGH[1] - LOW[1]) * t, LOW[2] + (HIGH[2] - LOW[2]) * t]
        push(c, px, h, pz, rgb, 0.04)
      }
    }
    return c
  }, [])

  // terrain features: boulders, trees of a few kinds, and shrubs, kept clear of the sensors
  const scenery = useMemo(() => {
    const c = newCloud()
    const m = density * 1.2
    const r = rng(21)
    const clear = (x: number, z: number, d: number) => SENSORS.every((s) => Math.hypot(s.x - x, s.z - z) > d)
    const inside = (x: number, z: number, lim = 3.0) => x * x + z * z < lim * lim

    for (let tries = 0, n = 0; tries < 400 && n < 13; tries++) {
      const x = (r() * 2 - 1) * 3.0
      const z = (r() * 2 - 1) * 3.0
      if (!inside(x, z, 2.95) || !clear(x, z, 0.6)) continue
      const y = height(x, z)
      const k = n % 5
      const h = 0.3 + r() * 0.35
      if (k === 0 || k === 3) conifer(c, x, y, z, h * 1.2, m, r())
      else if (k === 1) roundTree(c, x, y, z, h * 0.75, m, r(), n % 10 === 1)
      else if (k === 2) bush(c, x, y, z, 0.08 + r() * 0.1, m)
      else rock(c, x, y, z, 0.07 + r() * 0.13, m)
      n++
    }
    for (let tries = 0, n = 0; tries < 200 && n < 4; tries++) {
      const x = (r() * 2 - 1) * 3.0
      const z = (r() * 2 - 1) * 3.0
      if (!inside(x, z, 2.9) || !clear(x, z, 0.5)) continue
      rock(c, x, height(x, z), z, 0.12 + r() * 0.16, m)
      n++
    }
    log(c, 1.0, height(1.0, 0.4), 0.4, 0.5, 0.5, m)
    return c
  }, [])

  const pings = useMemo<Ping[]>(
    () => SENSORS.map((s, i) => ({ pos: [s.x, 0, s.z], color: s.color, phase: i === GATEWAY ? 0.5 : turn(i) })),
    [],
  )

  return (
    <group position={[0, -0.3, 0]}>
      <PointCloud data={data} size={32} pings={pings} />
      <PointCloud data={scenery} size={24} />
      {SENSORS.map((s, i) => {
        const y = height(s.x, s.z)
        return (
          <group key={i}>
            <mesh position={[s.x, y + 0.15, s.z]}>
              <cylinderGeometry args={[0.02, 0.02, 0.3, 10]} />
              <meshBasicMaterial color="#1c1b19" />
            </mesh>
            {i === GATEWAY ? (
              <GatewayNode position={[s.x, y + 0.3, s.z]} color={s.color} />
            ) : (
              <SensorNode position={[s.x, y + 0.3, s.z]} color={s.color} phase={turn(i)} />
            )}
            {i !== GATEWAY && <Link from={i} to={GATEWAY} color={s.color} phase={turn(i)} />}
          </group>
        )
      })}
    </group>
  )
}
