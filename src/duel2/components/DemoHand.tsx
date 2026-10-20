// The demo's hand (rule: a hand the child recognizes as a hand, and the object moves with it). It moves from → to;
// `onMove(t)` lets the dragged object follow (t from 0 to 1); `onDone` fires at the end.
import { useEffect, useState } from 'react'

/** `loop`: repeat the gesture (with a short rest) while the demo's words play. */
export function DemoHand(p: { from: { x: number; y: number }; to: { x: number; y: number }; durationMs: number; onMove?: (t: number) => void; onDone: () => void; loop?: boolean }) {
  const [t, setT] = useState(0)
  useEffect(() => {
    let start = performance.now()
    let raf = 0
    let done = false
    const REST = 700
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / p.durationMs)
      setT(k)
      p.onMove?.(k)
      if (k < 1) raf = requestAnimationFrame(step)
      else if (p.loop) {
        if (now - start >= p.durationMs + REST) start = now
        raf = requestAnimationFrame(step)
      } else if (!done) { done = true; p.onDone() }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // the demo runs once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
  const x = p.from.x + (p.to.x - p.from.x) * e
  const y = p.from.y + (p.to.y - p.from.y) * e
  return (
    <g data-demo-hand transform={`translate(${x} ${y})`} style={{ pointerEvents: 'none' }}>
      {/* a pointing hand: index finger up-left, folded fingers, thumb, cuff */}
      <path d="M0 0 c-6 -4 -10 2 -6 8 l18 34 c-10 -2 -18 4 -14 12 l20 26 c6 8 16 12 28 10 l18 -4 c14 -3 20 -16 16 -30 l-10 -34 c-2 -8 -12 -9 -14 -2 c-1 -8 -11 -10 -14 -2 c-2 -7 -12 -8 -14 0 z"
        fill="#ffe0bd" stroke="#6b3e1f" strokeWidth={4} strokeLinejoin="round" />
      <rect x={30} y={84} width={44} height={22} rx={6} fill="#7a3fd0" stroke="#3a1a6a" strokeWidth={4} transform="rotate(-12 52 95)" />
    </g>
  )
}
