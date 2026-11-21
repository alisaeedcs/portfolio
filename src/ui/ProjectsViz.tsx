import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { projects, type Project } from '../content/projects'
import { useStore } from '../store'
import { reduced } from '../scene/viz/common'
import ProjectObject from '../scene/viz/ProjectObject'

const FADE_MS = 500 // matches the opacity transition below
const RADIUS = 2.2 // radius of a sphere around the origin that holds every object

const SWING = 0.85 // how far (radians, about 49 degrees) the front-facing robot sways each way

// Backs the camera off far enough that the object fits the panel at any angle. Zoom is off, so it stays fitted.
// Most objects turn all the way round on their own. With `swing`, the object stays facing the front and sways gently
// from side to side instead. A drag can spin it all the way round; when the drag ends, it eases back (the short way)
// to facing the front and carries on swaying.
function Rig({ swing }: { swing: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const controls = useRef<OrbitControlsImpl>(null)
  const dragging = useRef(false)
  const azimuth = useRef(0)

  useEffect(() => {
    const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2
    const hHalf = Math.atan(Math.tan(vHalf) * (size.width / size.height))
    const dist = (RADIUS * 1.12) / Math.sin(Math.min(vHalf, hHalf))
    const [dx, dy, dz] = swing ? [0, 1.3, 5] : [2.4, 1.4, 5]
    camera.position.set(dx, dy, dz).normalize().multiplyScalar(dist)
    camera.lookAt(0, 0, 0)
    azimuth.current = 0
    controls.current?.update()
  }, [camera, size.width, size.height, swing])

  useFrame(({ clock }) => {
    const c = controls.current
    if (!swing || !c) return
    const p = camera.position
    const radius = Math.hypot(p.x, p.z)
    if (dragging.current) {
      azimuth.current = Math.atan2(p.x, p.z) // follow the visitor's hand
      return
    }
    const target = reduced ? 0 : SWING * Math.sin(clock.elapsedTime * 0.55)
    let delta = target - azimuth.current
    delta -= Math.round(delta / (Math.PI * 2)) * Math.PI * 2 // the short way round, never the long one
    azimuth.current += delta * 0.05 // ease toward the sway, so letting go never jumps
    camera.position.x = Math.sin(azimuth.current) * radius
    camera.position.z = Math.cos(azimuth.current) * radius
    camera.lookAt(0, 0, 0)
    c.update()
  })

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableZoom={false}
      enableDamping
      autoRotate={!reduced && !swing}
      autoRotateSpeed={1.1}
      minPolarAngle={0.9}
      maxPolarAngle={Math.PI / 1.9}
      onStart={() => (dragging.current = true)}
      onEnd={() => (dragging.current = false)}
    />
  )
}

// The object beside the project list. Closing a row fades it out; switching rows fades the old one out, swaps it
// while it's invisible, then fades the new one in, same as the experience scenes.
export default function ProjectsViz() {
  const open = useStore((s) => s.projectOpen)
  const project = open === null ? null : projects[open]

  const [shown, setShown] = useState<Project | null>(project)
  const [visible, setVisible] = useState(project !== null)

  // Warm-up: building the robot, compiling its materials and creating the WebGL context all take a moment. If that
  // happens at the instant of the first click, the slide and fade stutter. So the first project is built quietly,
  // invisible, shortly after the page appears, once its own fade-in is done. Clicking it then just reveals it.
  useEffect(() => {
    const t = window.setTimeout(() => setShown((s) => s ?? projects[0] ?? null), 300)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!project) {
      setVisible(false)
      return
    }
    if (!shown || shown === project) {
      setShown(project)
      setVisible(true)
      return
    }
    setVisible(false)
    const t = window.setTimeout(() => {
      setShown(project)
      setVisible(true)
    }, FADE_MS)
    return () => window.clearTimeout(t)
  }, [project, shown])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute bottom-12 left-6 right-6 h-[32vh] lg:bottom-auto lg:left-auto lg:right-10 lg:top-32 lg:h-[min(72vh,40rem)] lg:w-[42vw]"
    >
      <div aria-hidden className={`h-full w-full transition-opacity duration-500 ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <Canvas dpr={[1, 1.75]} gl={{ alpha: true, antialias: true }} camera={{ fov: 40, near: 0.1, far: 60, position: [3, 2, 6] }}>
          {shown && <ProjectObject key={shown.id} shape={shown.shape} play={visible} />}
          <Rig swing={shown?.shape === 'robot'} />
        </Canvas>
      </div>
    </motion.div>
  )
}
