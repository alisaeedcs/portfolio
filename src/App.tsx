import { Suspense, lazy, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { copy } from './content/copy'
import { useStore } from './store'
import Contact from './ui/Contact'
import Experience from './ui/Experience'
import Gradient from './ui/Gradient'
import Projects from './ui/Projects'
import Guide from './ui/Guide'
import Intro from './ui/Intro'
import NameMenu from './ui/NameMenu'
import SceneBoundary from './ui/SceneBoundary'

// three.js only loads when the visuals are first needed.
const ExperienceViz = lazy(() => import('./ui/ExperienceViz'))
const ProjectsViz = lazy(() => import('./ui/ProjectsViz'))

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function App() {
  const [gl, setGl] = useState(true)
  const section = useStore((s) => s.section)
  useEffect(() => setGl(hasWebGL()), [])

  // The first time the menu opens, fetch the 3D viewers in the background so they are ready by the time someone picks a page.
  const menuOpen = useStore((s) => s.menuOpen)
  useEffect(() => {
    if (!menuOpen) return
    void import('./ui/ProjectsViz')
    void import('./ui/ExperienceViz')
  }, [menuOpen])

  return (
    <main className="relative h-full w-full">
      <Gradient />
      <h1 className="sr-only">{copy.name}</h1>
      <NameMenu />
      <Guide />
      <Intro />
      <AnimatePresence>
        {section === 'experience' && <Experience key="experience" />}
        {section === 'contact' && <Contact key="contact" />}
        {section === 'projects' && <Projects key="projects" />}
        {section === 'projects' && gl && (
          <SceneBoundary key="projects-viz">
            <Suspense fallback={null}>
              <ProjectsViz />
            </Suspense>
          </SceneBoundary>
        )}
        {section === 'experience' && gl && (
          <SceneBoundary key="viz">
            <Suspense fallback={null}>
              <ExperienceViz />
            </Suspense>
          </SceneBoundary>
        )}
      </AnimatePresence>
    </main>
  )
}
