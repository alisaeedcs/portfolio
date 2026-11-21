// Soft drifting colour fields: knit pink, acid lime, cobalt haze and warm sunlight on cream.
// Radial gradients instead of CSS blur filters: same look, far cheaper to animate.
const blobs = [
  { color: '247, 217, 184', size: '110vmax', left: '-35%', top: '-45%', anim: 'drift-a 26s', opacity: 1 }, // sunlight
  { color: '244, 163, 187', size: '90vmax', left: '40%', top: '-35%', anim: 'drift-b 32s', opacity: 0.8 }, // pink
  { color: '143, 156, 245', size: '95vmax', left: '30%', top: '30%', anim: 'drift-a 38s reverse', opacity: 0.75 }, // cobalt haze
  { color: '201, 245, 154', size: '75vmax', left: '-25%', top: '35%', anim: 'drift-b 30s reverse', opacity: 0.8 }, // lime
]

export default function Gradient() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: b.size,
            height: b.size,
            left: b.left,
            top: b.top,
            background: `radial-gradient(closest-side, rgba(${b.color}, 1), rgba(${b.color}, 0))`,
            opacity: b.opacity,
            willChange: 'transform',
            animation: `${b.anim} ease-in-out infinite alternate`,
          }}
        />
      ))}
    </div>
  )
}
