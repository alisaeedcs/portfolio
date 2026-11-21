import { useState } from 'react'
import { motion } from 'framer-motion'
import { contact } from '../content/contact'

const row = 'grid grid-cols-[1fr] gap-1 py-2.5 md:grid-cols-[9rem_1fr] md:gap-6 md:py-3.5'
const label = 'text-xs tracking-wide text-[var(--muted)] md:pt-1.5 md:text-sm'
const value = 'text-left text-base text-[var(--link)] transition-colors duration-200 hover:text-[var(--ink)] md:text-xl'

export default function Contact() {
  const { name, domain, tld } = contact.email
  const [copied, setCopied] = useState(false)

  // shown as "name [at] domain [dot] tld"; the real address only exists when it's copied or opened
  const address = () => `${name}@${domain}.${tld}`
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(address())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      window.location.href = `mailto:${address()}`
    }
  }

  return (
    <motion.section
      id="contact"
      aria-label="Contact"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute left-6 right-6 top-44 md:left-10 md:right-10 md:top-44 lg:right-auto lg:w-[min(40rem,46vw)]"
    >
      <ul>
        {contact.links.map((l) => (
          <li key={l.label} className={row}>
            <span className={label}>{l.label}</span>
            <a href={l.url} target="_blank" rel="noopener noreferrer" className={value}>
              {l.value}
            </a>
          </li>
        ))}
        <li className={row}>
          <span className={label}>email</span>
          <button onClick={copyEmail} className={`cursor-pointer ${value}`} aria-label="Copy email address">
            {copied ? 'copied.' : `${name} [at] ${domain} [dot] ${tld}`}
          </button>
        </li>
      </ul>
    </motion.section>
  )
}
