import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { copy } from '../content/copy'
import { useStore } from '../store'

// "hero" is home: nothing is shown next to the name.
const fade = { duration: 0.25 }
// The back arrow: a little shorter than "contact", the shortest word in the menu, so it never pokes past the words above it.
const ARROW_WIDTH = 44
const ARROW_STROKE = 0.9
// What the last menu item looks like on pages other than home: the word "back" or a long thin arrow.
const BACK_AS = 'word' as 'word' | 'arrow'

export default function NameMenu() {
  const [open, setOpen] = useState(false)
  const setMenuOpen = useStore((s) => s.setMenuOpen)
  useEffect(() => setMenuOpen(open), [open, setMenuOpen])
  useEffect(() => () => setMenuOpen(false), [setMenuOpen])
  const section = useStore((s) => s.section)
  const setSection = useStore((s) => s.setSection)


  const choose = (s: string) => {
    setSection(s)
    setOpen(false)
  }

  return (
    <nav aria-label="Main" className="absolute left-6 top-6 md:left-10 md:top-8">
      <div className="relative flex h-6 items-baseline text-lg">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="main-menu"
          className="cursor-pointer"
        >
          {copy.name}
        </button>

        {/* popLayout: the old word fades out while the new one fades in, so there's never a blank. */}
        <AnimatePresence mode="popLayout" initial={false}>
          {section !== 'hero' && (
            <motion.span
              key={section}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
              className="select-none text-[var(--muted)]"
            >
              {`'s ${section}`}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {open && (
          <motion.ul
            id="main-menu"
            className="mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
          >
            {copy.menu
              .filter((s) => s !== section)
              .map((s) => (
                <li key={s}>
                  <button
                    onClick={() => choose(s)}
                    className="block cursor-pointer py-1 text-left text-sm text-[var(--muted)] transition-colors duration-200 hover:text-[var(--muted-hover)]"
                  >
                    {s}
                  </button>
                </li>
              ))}
            {/* On any page but home, the menu ends with a long, quiet arrow that goes back to the home page. */}
            {section !== 'hero' && (
              <li>
                <button
                  onClick={() => choose('hero')}
                  aria-label="Back to the home page"
                  className="block cursor-pointer py-1 text-left text-sm text-[var(--muted)] transition-colors duration-200 hover:text-[var(--muted-hover)]"
                >
                  {BACK_AS === 'word' ? (
                    'back'
                  ) : (
                  <svg
                    width={ARROW_WIDTH}
                    height="12"
                    viewBox={`0 0 ${ARROW_WIDTH} 12`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={ARROW_STROKE}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d={`M${ARROW_WIDTH - 1.5} 6H2.5M6.5 2.2L2.5 6l4 3.8`} />
                  </svg>
                  )}
                </button>
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </nav>

  )
}
