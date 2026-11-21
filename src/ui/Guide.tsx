import { useEffect, useRef } from 'react'
import { useStore } from '../store'

// After 7 seconds on the home page without the name menu being opened, a little line-drawn paper plane takes off
// from wherever the cursor is and flies nose-first into the name. Its nose scrunches up like paper, the name gives
// a little jolt, and the plane tumbles all the way down off the bottom of the screen. The wait does not depend on
// the mouse moving or staying still. It repeats while the menu stays closed; opening the menu stops it, and the
// 7 seconds start again each time the menu closes or the visitor comes back to the home page.
const WAIT = 7000 // time on the home page, menu closed, before the first flight
const MAX_FLIGHTS = 3 // it only ever flies this many times per visit, then leaves the page alone
const REPEAT = 12000 // pause between flights
const CRUNCH = 420 // ms of scrunching at the nose
const GRAVITY = 1700 // px/s² while falling

type Pt = { x: number; y: number }

// Catmull-Rom spline through the waypoints; `f` runs from 0 to pts.length - 1.
function spline(pts: Pt[], f: number): Pt {
  const n = pts.length - 1
  const g = Math.min(Math.max(f, 0), n - 0.0001)
  const i = Math.floor(g)
  const u = g - i
  const p0 = pts[Math.max(i - 1, 0)]
  const p1 = pts[i]
  const p2 = pts[i + 1]
  const p3 = pts[Math.min(i + 2, n)]
  const u2 = u * u
  const u3 = u2 * u
  return {
    x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
    y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
  }
}

// The plane: a thin-lined paper plane (outline and a fold down the middle). Nose points to +x.
const OUTLINE: [number, number][] = [[14, 0], [-12, 11], [-8, 0], [-12, -11], [14, 0]]
const FOLD: [number, number][] = [[14, 0], [-8, 0]]

// Draws the plane at `pos`, rotated by `angle`. `crunch` goes 0..1: the body shortens toward the nose.
function drawPlane(ctx: CanvasRenderingContext2D, pos: Pt, angle: number, bank: number, crunch: number, scale = 1) {
  ctx.save()
  ctx.translate(pos.x, pos.y)
  ctx.rotate(angle)
  ctx.scale(scale, scale)
  const squash = 1 - 0.5 * crunch
  const at = (x: number, y: number, i: number): [number, number] => [
    (14 + (x - 14) * squash) * 1.15,
    (y * (1 + 0.3 * crunch) * bank) * 1.15,
  ]
  ctx.strokeStyle = 'rgba(43, 42, 39, 0.9)'
  ctx.lineWidth = 0.9
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const [path, o] of [[OUTLINE, 0], [FOLD, 10]] as const) {
    ctx.beginPath()
    path.forEach(([x, y], i) => {
      // the notch in the tail fills in as it crunches, so the back edge ends up flat instead of a "V"/"M"
      const [px, py] = at(o === 0 && i === 2 ? x - 4 * crunch : x, y, i + o)
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.stroke()
  }
  ctx.restore()
}

// The flight to the name, then a straight run at the name's end. It leaves from `from` (the cursor) with a lazy
// S-curve across the page; with no usable cursor (touch, or the mouse is already beside the name) it swoops in
// from the lower right instead.
function plan(w: number, h: number, r: DOMRect, from: Pt | null) {
  // the plane is drawn around its centre and its nose sticks out about 16px, so stop the centre that far plus a hair from the text
  const hit: Pt = { x: Math.min(r.right + 19, w - 60), y: r.top + r.height / 2 }
  const S: Pt = from && Math.hypot(from.x - hit.x, from.y - hit.y) > 260 ? from : { x: w + 60, y: h * 0.8 }
  const F: Pt = { x: hit.x + 190, y: hit.y } // where the final, level run at the name begins
  const dx = F.x - S.x
  const dy = F.y - S.y
  const dist = Math.hypot(dx, dy) || 1

  // One long sweep: it climbs away from the start, swings wide, and arrives at F level and heading left, with no kinks.
  let nx = -dy / dist
  let ny = dx / dist
  if (ny > 0) {
    nx = -nx
    ny = -ny // use the side that lifts the plane upward first
  }
  const P1: Pt = { x: S.x + dx * 0.22 + nx * dist * 0.38, y: S.y + dy * 0.22 + ny * dist * 0.38 }
  const P2: Pt = { x: F.x + Math.min(dist * 0.42, 420), y: F.y + Math.min(dist * 0.05, 40) }
  const bez = (t: number): Pt => {
    const u = 1 - t
    return {
      x: u * u * u * S.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * F.x,
      y: u * u * u * S.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * F.y,
    }
  }
  const weave = Math.min(dist * 0.03, 24) // a gentle wobble along the sweep, fading to nothing at both ends

  const N = 560
  const xs: Pt[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const p = bez(t)
    const q = bez(Math.min(t + 0.004, 1))
    const p0 = bez(Math.max(t - 0.004, 0))
    const tx = q.x - p0.x
    const ty = q.y - p0.y
    const tl = Math.hypot(tx, ty) || 1
    const off = weave * Math.sin(t * Math.PI * 3) * Math.sin(t * Math.PI)
    xs.push({ x: p.x - (ty / tl) * off, y: p.y + (tx / tl) * off })
  }
  for (let i = 1; i <= 70; i++) xs.push({ x: F.x + (hit.x - F.x) * (i / 70), y: F.y + (hit.y - F.y) * (i / 70) }) // the straight run in

  const cum: number[] = [0]
  for (let i = 1; i < xs.length; i++) cum.push(cum[i - 1] + Math.hypot(xs[i].x - xs[i - 1].x, xs[i].y - xs[i - 1].y))
  return { xs, cum, hit }
}

export default function Guide() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const cursor = useRef<Pt | null>(null) // last known mouse position; stays null on touch screens
  const flights = useRef(0) // how many times it has flown this visit
  const section = useStore((s) => s.section)
  const menuOpen = useStore((s) => s.menuOpen)

  useEffect(() => {
    if (section !== 'hero' || menuOpen) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const cv = canvas.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return

    let raf = 0
    let timer = 0
    let stopped = false

    const track = (e: PointerEvent) => {
      cursor.current = { x: e.clientX, y: e.clientY } // a mouse, or the last place a finger touched
    }
    window.addEventListener('pointermove', track, { passive: true })
    window.addEventListener('pointerdown', track, { passive: true })

    const fly = () => {
      if (stopped) return
      if (document.hidden) {
        timer = window.setTimeout(fly, 2000)
        return
      }
      const nameEl = document.querySelector<HTMLElement>('nav button')
      if (!nameEl) return
      flights.current += 1
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      cv.width = w * dpr
      cv.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const launch = cursor.current && cursor.current.x > 0 && cursor.current.x < w && cursor.current.y > 0 && cursor.current.y < h ? { ...cursor.current } : null
      const { xs, cum, hit } = plan(w, h, nameEl.getBoundingClientRect(), launch)
      const popsOut = launch !== null && Math.hypot(xs[0].x - (w + 60), xs[0].y - h * 0.8) > 1 // true when it starts at the cursor
      const total = cum[cum.length - 1]
      const approach = Math.min(Math.max(total / 0.26, 2800), 4800) // about 260px a second, within sensible limits
      const start = performance.now()
      let last = start
      let heading = NaN // smoothed heading, so the nose swings round instead of snapping
      let prevAim = NaN
      let roll = 0
      let phase: 'fly' | 'crunch' | 'fall' = 'fly'
      let phaseStart = start
      let angle = Math.PI
      const pos: Pt = { ...xs[0] }
      let vx = 0
      let vy = 0
      let spin = 0

      const frame = (now: number) => {
        if (stopped) return
        const dt = Math.min((now - last) / 1000, 0.05)
        last = now
        ctx.clearRect(0, 0, w, h)

        if (phase === 'fly') {
          const k = Math.min((now - start) / approach, 1)
          const target = Math.pow(k, 1.3) * total // starts gently and speeds up into the dive at the name
          let lo = 0
          let hi = cum.length - 1
          while (lo < hi) {
            const mid = (lo + hi) >> 1
            if (cum[mid] < target) lo = mid + 1
            else hi = mid
          }
          const i = Math.max(1, Math.min(lo, xs.length - 1))
          pos.x = xs[i].x
          pos.y = xs[i].y
          const a = xs[Math.max(i - 5, 0)]
          const b = xs[Math.min(i + 5, xs.length - 1)]
          const aim = Math.atan2(b.y - a.y, b.x - a.x)
          const wrap = (v: number) => Math.atan2(Math.sin(v), Math.cos(v))
          // the nose follows the path with a little lag, and the plane rolls into the turn
          heading = Number.isNaN(heading) ? aim : heading + wrap(aim - heading) * (1 - Math.exp(-dt * 12))
          const turn = Number.isNaN(prevAim) || dt === 0 ? 0 : wrap(aim - prevAim) / dt
          prevAim = aim
          angle = heading
          roll = roll + (Math.max(-1.1, Math.min(1.1, turn * 0.35)) - roll) * (1 - Math.exp(-dt * 8))
          // when it leaves the cursor it pops out of it: small and growing over the first moments
          const pop = popsOut ? Math.min(1, (now - start) / 300) : 1
          drawPlane(ctx, pos, angle, 0.25 + 0.75 * Math.abs(Math.cos(roll)), 0, 0.25 + 0.75 * (1 - Math.pow(1 - pop, 3)))
          if (k >= 1) {
            phase = 'crunch'
            phaseStart = now
            pos.x = hit.x
            pos.y = hit.y
            angle = Math.PI // nose pointing left, into the name
            // the name takes the knock
            nameEl.animate(
              [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(-1px)' }, { transform: 'translateX(0)' }],
              { duration: 360, easing: 'ease-out' },
            )
          }
        } else if (phase === 'crunch') {
          const k = Math.min((now - phaseStart) / CRUNCH, 1)
          const c = 1 - Math.pow(1 - k, 3)
          const push = 9 * c // it rebounds a touch as it scrunches
          drawPlane(ctx, { x: hit.x + push, y: hit.y }, angle, 1, c)
          if (k >= 1) {
            phase = 'fall'
            phaseStart = now
            pos.x = hit.x + push
            pos.y = hit.y
            vx = 70
            vy = -60
            spin = -6
          }
        } else {
          vy = Math.min(vy + GRAVITY * dt, 1100)
          pos.x += (vx + Math.sin((now - phaseStart) / 170) * 55) * dt // paper flutters as it drops
          pos.y += vy * dt
          angle += spin * dt
          drawPlane(ctx, pos, angle, 1, 1)
          if (pos.y > h + 40) {
            ctx.clearRect(0, 0, w, h)
            if (flights.current < MAX_FLIGHTS) timer = window.setTimeout(fly, REPEAT)
            return
          }
        }
        raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
    }

    if (flights.current < MAX_FLIGHTS) timer = window.setTimeout(fly, WAIT)
    return () => {
      stopped = true
      window.removeEventListener('pointermove', track)
      window.removeEventListener('pointerdown', track)
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
      ctx.clearRect(0, 0, cv.width, cv.height)
    }
  }, [section, menuOpen])

  return <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 z-30 h-full w-full" />
}
