import type { UIEvent } from 'react'

// Shows the list's thin scrollbar while it is being scrolled or dragged, and hides it again a moment after.
const timers = new WeakMap<Element, number>()

export function revealScrollbar(e: UIEvent<HTMLElement>) {
  const el = e.currentTarget
  el.dataset.scrolling = 'true'
  window.clearTimeout(timers.get(el))
  timers.set(el, window.setTimeout(() => delete el.dataset.scrolling, 900))
}
