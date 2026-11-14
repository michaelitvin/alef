// A button that acts only after a 2 s hold (rule: a way out on a child screen needs a hold). A gold ring fills while it is
// held; a tap or a short press only shows how far the ring got (the hint), then it empties again. Used by the cover's
// parent button and by the home button of the run and of its summary.
import { useEffect, useRef, useState, type ReactNode } from 'react'

export const HOLD_MS = 2000
/** how long the ring shows how far a short press got */
export const HOLD_HINT_MS = 700
const RING_C = 2 * Math.PI * 25

export function HoldButton({ label, className, onHold, children }: {
  label: string; className: string; onHold: () => void
  /** the icon, drawn in the ring's 56-unit box */
  children: ReactNode
}) {
  const timer = useRef<number | undefined>(undefined)
  const started = useRef(0)
  const hold = useRef(onHold)
  hold.current = onHold
  const [state, setState] = useState<'idle' | 'holding' | 'hint'>('idle')
  const [frac, setFrac] = useState(0)
  const press = () => {
    window.clearTimeout(timer.current)
    started.current = Date.now()
    setState('holding')
    timer.current = window.setTimeout(() => { setState('idle'); hold.current() }, HOLD_MS)
  }
  const release = () => {
    if (state !== 'holding') return
    window.clearTimeout(timer.current)
    setFrac(Math.min(1, (Date.now() - started.current) / HOLD_MS))
    setState('hint')
    timer.current = window.setTimeout(() => setState('idle'), HOLD_HINT_MS)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <button type="button" aria-label={label} className={`d2-hold ${className} d2-hold-${state}`} data-hold={state}
      onPointerDown={(e) => { e.stopPropagation(); press() }} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}>
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden>
        <circle cx="28" cy="28" r="25" fill="none" stroke="#ffffff22" strokeWidth="4" />
        <circle cx="28" cy="28" r="25" fill="none" stroke="#ffd34d" strokeWidth="4" className="d2-hold-ring" data-state={state}
          strokeDasharray={RING_C} style={state === 'hint' ? { strokeDashoffset: RING_C * (1 - frac) } : undefined} transform="rotate(-90 28 28)" />
        {children}
      </svg>
    </button>
  )
}

/** the parent button's sliders */
export const SlidersGlyph = () => <path d="M18 22h20M18 34h20M24 18v8M32 30v8" stroke="#d8c8ff" strokeWidth="3" strokeLinecap="round" />

/** the way home: a little house (cream walls, a gold roof, a dark door), in the ring's box */
export const HouseGlyph = () => (
  <g data-icon="home">
    <path d="M17 27v11.5a1.5 1.5 0 0 0 1.5 1.5h19a1.5 1.5 0 0 0 1.5-1.5V27" fill="#fff6d8" />
    <path d="M13.5 28.5L28 16.5l14.5 12" fill="none" stroke="#ffd34d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24.5 40v-7a3.5 3.5 0 0 1 7 0v7z" fill="#3a1d78" />
  </g>
)
