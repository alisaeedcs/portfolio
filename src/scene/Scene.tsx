import { Canvas } from '@react-three/fiber'

// Milestone 1: empty, transparent canvas. PointField arrives in milestone 2.
export default function Scene() {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 2, 8], fov: 60, near: 0.1, far: 200 }}
    />
  )
}
