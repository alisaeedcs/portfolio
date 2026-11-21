import { useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { experience, type Role } from '../content/experience'
import { useStore } from '../store'
import { reduced } from '../scene/viz/common'
import Forest from '../scene/viz/Forest'
import Accelerator from '../scene/viz/Accelerator'
import Hillside from '../scene/viz/Hillside'

const FADE_MS = 500 // matches the opacity transition below

// `dir` is the starting view direction; `r` is the radius of a sphere (around the origin) that contains the whole scene.
const views = {
  lidar: { dir: [4.2, 2.8, 5.2] as const, r: 3.25, scene: <Forest /> },
  accelerator: { dir: [0, 5.2, 6.0] as const, r: 3.6, scene: <Accelerator /> },
  hillside: { dir: [0, 3.8, 8.2] as const, r: 3.65, scene: <Hillside /> },
}

// Places the camera far enough back that the scene's bounding sphere always fits the panel,
// whatever the panel's shape and whatever angle the visitor rotates to. Zoom is off, so it stays fitted.
function Rig({ viz }: { viz: keyof typeof views }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const controls = useRef<OrbitControlsImpl>(null)
  useEffect(() => {
    const [x, y, z] = views[viz].dir
    const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2
    const hHalf = Math.atan(Math.tan(vHalf) * (size.width / size.height))
    const dist = (views[viz].r * 1.05) / Math.sin(Math.min(vHalf, hHalf))
    camera.position.set(x, y, z).normalize().multiplyScalar(dist)
    camera.lookAt(0, 0, 0)
    controls.current?.update()
  }, [viz, camera, size.width, size.height])
  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableZoom={false}
      enableDamping
      autoRotate={!reduced}
      autoRotateSpeed={0.9}
      minPolarAngle={0.35}
      maxPolarAngle={Math.PI / 2.1}
    />
  )
}

export default function ExperienceViz() {
  const open = useStore((s) => s.experienceOpen)
  // Entries without a scene (school) show nothing on the right, the same as when no row is open.
  const picked = open === null ? null : experience[open]
  const role = picked?.viz ? picked : null

  // `shown` is the scene on screen and `visible` is whether it's faded in. Closing a row fades it out and keeps it
  // until it's gone. Picking a different row fades the old scene out, swaps it while it's invisible, then fades the new
  // one in, the same way a scene first appears.
  const [shown, setShown] = useState<Role | null>(role)
  const [visible, setVisible] = useState(role !== null)
  useEffect(() => {
    if (!role) {
      setVisible(false)
      return
    }
    if (!shown || shown === role) {
      setShown(role)
      setVisible(true)
      return
    }
    setVisible(false)
    const t = window.setTimeout(() => {
      setShown(role)
      setVisible(true)
    }, FADE_MS)
    return () => window.clearTimeout(t)
  }, [role, shown])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute bottom-12 left-6 right-6 h-[32vh] lg:bottom-auto lg:left-auto lg:right-10 lg:top-32 lg:h-[min(72vh,40rem)] lg:w-[42vw]"
    >
      <div
        aria-hidden
        className={`h-full w-full transition-opacity duration-500 ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <Canvas dpr={[1, 1.75]} gl={{ alpha: true, antialias: true }} camera={{ fov: 42, near: 0.1, far: 60, position: [4.2, 2.2, 5.2] }}>
          {shown?.viz && views[shown.viz].scene}
          {shown?.viz && <Rig viz={shown.viz} />}
        </Canvas>
      </div>
      <p
        className={`pointer-events-none absolute bottom-0 left-0 translate-y-full pt-3 text-xs tracking-wide text-[var(--muted)] transition-opacity duration-500 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {shown?.vizLabel ?? ''}
      </p>
    </motion.div>
  )
}
