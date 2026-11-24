// A button that acts only after a 2 s hold (rule: the parent screens need a hold). A ring fills while it is
// held; a tap or a short press only shows how far the ring got (the hint), then it empties again. Used by every game's
// parent button (through the parent gate). The home button is a plain tap (HomeButton.tsx).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import './holdButton.css'

export const HOLD_MS = 2000
/** how long the ring shows how far a short press got */
const HOLD_HINT_MS = 700
const RING_C = 2 * Math.PI * 25

/** the ring's look: Spell Quest's gold ring by default, each game may give its own */
export interface HoldRing { track: string; fill: string; width?: number; trackWidth?: number; round?: boolean }
const GOLD: HoldRing = { track: '#ffffff22', fill: '#ffd34d', width: 4, trackWidth: 4 }

export function HoldButton({ label, className, onHold, children, overlay, ring = GOLD, title }: {
  label: string; className: string; onHold: () => void
  /** the icon, drawn in the ring's 56-unit box */
  children?: ReactNode
  /** an icon drawn over the ring as its own element (the clock's sliders) */
  overlay?: ReactNode
  ring?: HoldRing
  title?: string
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
  // a round cap shows past the dash's end: the dash is a little longer, so an empty ring shows nothing
  const dash = RING_C + (ring.round ? 3 : 0)
  return (
    <button type="button" aria-label={label} title={title} className={`hold-btn ${className} hold-${state}`} data-hold={state}
      onPointerDown={(e) => { e.stopPropagation(); press() }} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()} onKeyDown={(e) => e.preventDefault()}>
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden>
        <circle cx="28" cy="28" r="25" fill="none" stroke={ring.track} strokeWidth={ring.trackWidth ?? 4} />
        <circle cx="28" cy="28" r="25" fill="none" stroke={ring.fill} strokeWidth={ring.width ?? 4} strokeLinecap={ring.round ? 'round' : undefined}
          className="hold-ring" data-hold-ring data-state={state}
          strokeDasharray={dash} style={{ ['--hold-dash' as string]: dash, ...(state === 'hint' ? { strokeDashoffset: dash - RING_C * frac } : {}) }}
          transform="rotate(-90 28 28)" />
        {children}
      </svg>
      {overlay}
    </button>
  )
}
