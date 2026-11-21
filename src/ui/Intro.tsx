import { AnimatePresence, motion } from 'framer-motion'
import { copy } from '../content/copy'
import { useStore } from '../store'

const ease = [0.22, 1, 0.36, 1] as const

// Each line rises into place, softly coming into focus. Leaving is quicker and a little gentler.
const line = {
  hidden: { opacity: 0, y: 56, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1, ease } },
  hide: { opacity: 0, y: 26, filter: 'blur(4px)', transition: { duration: 0.45, ease: [0.5, 0, 0.75, 0] as const } },
}

// The intro is always there on the home page: it rises in when the page opens (and whenever you come back to home),
// and drops away when you move to another page. No scrolling needed.
export default function Intro() {
  const section = useStore((s) => s.section)

  return (
    <AnimatePresence>
      {section === 'hero' && (
        <motion.div
          key="intro"
          initial="hidden"
          animate="show"
          exit="hide"
          variants={{
            show: { transition: { staggerChildren: 0.14, delayChildren: 0.35 } },
            hide: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
          }}
          className="absolute bottom-10 left-6 right-6 md:bottom-14 md:left-10 md:max-w-2xl"
        >
          <motion.h2 variants={line} className="text-2xl font-light tracking-tight md:text-4xl">
            {copy.intro.headline}
          </motion.h2>
          <motion.p variants={line} className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--muted-hover)] md:text-base">
            {copy.intro.detail}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
