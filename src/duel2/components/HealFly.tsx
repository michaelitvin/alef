// A heart flies to the hearts in the top bar, over any screen: the heart that comes back at the end of a pass (and the
// merchant's potion later). One part for every heart that comes back (rule: the game's own parts).
import { useEffect, useState } from 'react'

/** how long the heart flies to the top bar */
export const HEAL_MS = 800
/** the hearts in the top bar (stage units): the bar is above the stage (layout.ts), so the heart flies past its top edge */
const TO = { x: 1500, y: -80 }

/** The heart at `k` (0 = at `from`, 1 = at the top bar). */
export function Heal({ from, k }: { from: { x: number; y: number }; k: number }) {
  const e = 1 - (1 - k) * (1 - k)
  const x = from.x + (TO.x - from.x) * e
  const y = from.y + (TO.y - from.y) * e - Math.sin(Math.PI * e) * 120
  const s = 2.6 - e * 1.2
  return (
    <g data-heal pointerEvents="none" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})`}>
      <path d="M0 9s-7.5-4.6-9.6-9.2C-11.1-3.6-9-7-5.6-7c2 0 3.5 1.1 4.6 2.6l1 1.3 1-1.3C2.1-5.9 3.6-7 5.6-7 9-7 11.1-3.6 9.6-0.2 7.5 4.4 0 9 0 9z"
        fill="#ff5a7a" stroke="#fff6d8" strokeWidth={1.2} style={{ filter: 'drop-shadow(0 0 6px #ff5a7a)' }} />
    </g>
  )
}

/** The heart rises from the middle of the stage and flies to the top bar, once (mount it with a new key for each heart). */
export function HealFly({ from = { x: 800, y: 470 } }: { from?: { x: number; y: number } }) {
  const [k, setK] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const step = () => {
      const kk = Math.min(1, (performance.now() - t0) / HEAL_MS)
      setK(kk)
      if (kk < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])
  if (k >= 1) return null
  return (
    <svg className="d2-stage d2-overlay" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" overflow="visible" style={{ pointerEvents: 'none' }} data-heal-fly>
      <Heal from={from} k={k} />
    </svg>
  )
}
