import { motion } from 'framer-motion'
import { projects } from '../content/projects'
import { useStore } from '../store'
import { revealScrollbar } from './revealScrollbar'

const ease = 'ease-[cubic-bezier(0.22,1,0.36,1)]'

export default function Projects() {
  const openIndex = useStore((s) => s.projectOpen)
  const setOpenIndex = useStore((s) => s.setProjectOpen)

  return (
    <motion.section
      id="projects"
      aria-label="Projects"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onScroll={revealScrollbar}
      className={`scroll-reveal absolute left-6 right-6 top-44 overflow-y-auto md:left-10 md:right-10 md:top-44 lg:right-auto lg:max-h-[calc(100%-12rem)] lg:w-[min(40rem,46vw)] ${
        openIndex === null ? 'max-h-[calc(100%-12rem)]' : 'max-h-[calc(100%-14rem-32vh)]'
      }`}
    >
      <ul>
        {projects.map((p, i) => {
          const open = openIndex === i
          return (
            <li key={p.id} className={`transition-[padding] duration-[900ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${open ? 'pl-5 md:pl-14' : 'pl-0'}`}>
              <button
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                className="group block w-full cursor-pointer py-2.5 text-left md:py-3.5"
              >
                <span>
                  <span
                    className={`block text-xl font-light tracking-tight transition-colors duration-500 md:text-3xl ${
                      open ? 'text-[var(--ink)]' : 'text-[var(--muted)] group-hover:text-[var(--muted-hover)]'
                    }`}
                  >
                    {p.title}
                  </span>
                  <span
                    className={`grid transition-[grid-template-rows,opacity] duration-500 ${ease} ${
                      open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <span className="min-h-0 overflow-hidden">
                      <span className="block max-w-md space-y-2 pt-2 text-sm leading-relaxed text-[var(--muted-hover)] md:text-base">
                        {p.description.map((line, k) => (
                          <span key={k} className="block">
                            {line}
                          </span>
                        ))}
                      </span>
                    </span>
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </motion.section>
  )
}
