import { motion } from 'framer-motion'
import { experience } from '../content/experience'
import { useStore } from '../store'

const ease = 'ease-[cubic-bezier(0.22,1,0.36,1)]'

export default function Experience() {
  const openIndex = useStore((s) => s.experienceOpen)
  const setOpenIndex = useStore((s) => s.setExperienceOpen)

  return (
    <motion.section
      id="experience"
      aria-label="Experience"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`absolute left-6 right-6 top-44 overflow-y-auto md:left-10 md:right-10 md:top-44 lg:right-auto lg:max-h-[calc(100%-12rem)] lg:w-[min(40rem,46vw)] ${
        openIndex === null ? 'max-h-[calc(100%-12rem)]' : 'max-h-[calc(100%-12rem-32vh)]'
      }`}
    >
      <ul>
        {experience.map((r, i) => {
          const open = openIndex === i
          return (
            <li key={i} className={`transition-[margin] duration-500 ${ease} ${open ? "my-3 md:my-5" : "my-0"}`}>
              <button
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                className="group grid w-full cursor-pointer grid-cols-[1fr] gap-1 py-2.5 text-left md:grid-cols-[9rem_1fr] md:gap-6 md:py-3.5"
              >
                <span className="text-xs tracking-wide text-[var(--muted)] md:pt-2 md:text-sm">{r.dates}</span>

                <span>
                  <span
                    className={`block text-xl font-light tracking-tight transition-colors duration-500 md:text-3xl ${
                      open ? 'text-[var(--ink)]' : 'text-[var(--muted)] group-hover:text-[var(--muted-hover)]'
                    }`}
                  >
                    {r.title}
                  </span>
                  <span className="mt-1 block text-sm text-[var(--muted)] md:text-base">{r.company}</span>

                  <span
                    className={`grid transition-[grid-template-rows,opacity] duration-500 ${ease} ${
                      open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <span className="min-h-0 overflow-hidden">
                      <span className="block max-w-md pt-3 text-sm leading-relaxed text-[var(--muted-hover)] md:text-base">
                        {r.summary}
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
