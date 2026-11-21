import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { reduced, type Cloud, type RGB } from './common'

export const MAX_PINGS = 7
export const PING_SPEED = 0.2 // ring and packet cycles per second; shared so each ring starts as its packet departs

const vert = `
#define NP ${MAX_PINGS}
uniform float uSize; uniform float uPR; uniform float uScanY;
uniform float uRadial; uniform vec3 uOrigin; uniform float uScanR;
uniform float uFx; uniform float uFocus; uniform float uTime;
uniform float uPingOn; uniform vec4 uPing[NP]; uniform vec3 uPingCol[NP];
attribute vec3 aColor;
varying vec3 vColor; varying float vGlow; varying float vMod; varying float vPing; varying vec3 vPingCol;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float g = 0.0;
  if (uRadial > 0.5) {
    float d = distance(position, uOrigin);
    g = smoothstep(0.2, 0.0, abs(d - uScanR)) * (1.0 - smoothstep(3.2, 4.8, uScanR));
  } else if (uScanY > -99.0) {
    g = smoothstep(0.13, 0.0, abs(position.y - uScanY));
  }
  vGlow = g;
  vColor = aColor;

  // sensor pings: each one sends a ring across the ground that lights up the points it touches
  float pg = 0.0;
  vec3 pc = vec3(0.0);
  if (uPingOn > 0.5) {
    for (int i = 0; i < NP; i++) {
      float life = uPing[i].w;
      float t = clamp(life / 0.4, 0.0, 1.0);
      float d = distance(position.xz, uPing[i].xz);
      float r = (1.0 - (1.0 - t) * (1.0 - t)) * 1.6;
      float edge = smoothstep(0.12, 0.0, abs(d - r));
      float trail = smoothstep(r - 0.7, r, d) * step(d, r) * 0.75;
      float s = (edge + trail) * 1.3 * (1.0 - t) * (1.0 - t * 0.6) * step(life, 0.4);
      pc += uPingCol[i] * s;
      pg += s;
    }
  }
  vPing = clamp(pg, 0.0, 1.0);
  vPingCol = pg > 0.001 ? pc / pg : vec3(1.0);

  float m = 1.0;
  if (uFx > 0.5) {
    // atmospheric depth: far points fade, and every point shimmers a little
    float rel = (-mv.z - uFocus) / 3.0;
    float h = fract(sin(dot(position, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    m = (1.0 - 0.6 * smoothstep(-0.4, 1.0, rel)) * (0.82 + 0.18 * sin(uTime * 2.4 + h * 6.2831));
  }
  vMod = m;
  gl_PointSize = uSize * uPR * (1.0 + g * 1.0 + vPing * 1.1) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`

const frag = `
uniform vec3 uAccent;
varying vec3 vColor; varying float vGlow; varying float vMod; varying float vPing; varying vec3 vPingCol;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  vec3 col = mix(mix(vColor, uAccent, vGlow), vPingCol, vPing);
  float a = smoothstep(0.5, 0.15, d) * (0.7 + 0.3 * max(vGlow, vPing)) * vMod;
  gl_FragColor = vec4(col, a);
}`

export interface Ping {
  pos: [number, number, number]
  color: RGB
  phase: number
}

interface Props {
  data: Cloud
  size?: number
  scan?: boolean
  // a sphere of light that expands from this point, like a lidar pulse
  pulseFrom?: [number, number, number]
  // depth fade for distant points plus a gentle shimmer
  fx?: boolean
  // sensors that send rings of coloured light across the points
  pings?: Ping[]
  accent?: RGB
}

// Soft round points. `scan` sweeps a band up and down; `pulseFrom` sends an expanding shell of light from a point;
// `pings` lights up the points around each sensor in turn.
export default function PointCloud({ data, size = 40, scan = false, pulseFrom, fx = false, pings, accent = [0.12, 0.18, 0.82] }: Props) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(data.pos, 3))
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(data.col, 3))
    return g
  }, [data])

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uSize: { value: size },
          uPR: { value: Math.min(window.devicePixelRatio, 2) },
          uScanY: { value: -999 },
          uRadial: { value: pulseFrom ? 1 : 0 },
          uOrigin: { value: new THREE.Vector3(...(pulseFrom ?? [0, 0, 0])) },
          uScanR: { value: 0 },
          uFx: { value: fx ? 1 : 0 },
          uFocus: { value: 10 },
          uTime: { value: 0 },
          uPingOn: { value: pings ? 1 : 0 },
          uPing: { value: Array.from({ length: MAX_PINGS }, () => new THREE.Vector4(0, 0, 0, 1)) },
          uPingCol: { value: Array.from({ length: MAX_PINGS }, () => new THREE.Color(1, 1, 1)) },
          uAccent: { value: new THREE.Color(...accent) },
        },
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    pings?.slice(0, MAX_PINGS).forEach((p, i) => {
      mat.uniforms.uPing.value[i].set(p.pos[0], p.pos[1], p.pos[2], 1)
      mat.uniforms.uPingCol.value[i].setRGB(p.color[0], p.color[1], p.color[2])
    })
  }, [pings, mat])

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime
    if (pulseFrom) mat.uniforms.uScanR.value = reduced ? 1.5 : (t * 1.0) % 5.2
    else if (scan) mat.uniforms.uScanY.value = 1.25 + Math.sin(reduced ? 1 : t * 0.8) * 1.05
    mat.uniforms.uTime.value = reduced ? 0 : t
    mat.uniforms.uFocus.value = camera.position.length()
    pings?.slice(0, MAX_PINGS).forEach((p, i) => {
      mat.uniforms.uPing.value[i].w = reduced ? 0.4 : (t * PING_SPEED + p.phase) % 1
    })
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
