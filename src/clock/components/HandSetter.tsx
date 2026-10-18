// Set the clock (spec: Hand interface). A finger anywhere on the face points the active hand at it — a drag
// or a stroke drawn out from the centre both work. The long hand snaps to five minutes on release; the short hand moves
// an hour at a time, to the place that belongs with the long hand, and follows the long hand (no impossible states).
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { type HandPose, angleDelta, norm } from '../logic/time'
import { snapMinute } from '../logic/grade'
import type { ClockKind } from '../logic/workday'
import { ClockFace, angleFromPointer } from './ClockFace'
import { CheckIcon, HandLongIcon, HandShortIcon } from './icons'

export interface HandSetterProps {
  mode: 'short' | 'long' | 'both'
  linked: boolean
  initial: HandPose
  numbers: 'all' | 'quarters' | 'none'
  ring: boolean | 'minutes' | 'quarters'
  slice: boolean
  kind: ClockKind
  size: number
  locked: boolean
  /** after a wrong answer: the right pose, the hands glide there */
  reveal: HandPose | null
  onSubmit: (pose: HandPose) => void
  onSnap?: () => void
  /** row: the hand buttons beside the face; column: under it */
  layout?: 'row' | 'column'
  /** cut the case off at this many face sizes (phones) */
  caseClip?: number
}

export function HandSetter({ mode, linked, initial, numbers, ring, slice, kind, size, locked, reveal, onSubmit, onSnap, layout = 'row', caseClip }: HandSetterProps) {
  const [pose, setPose] = useState(initial)
  const [active, setActive] = useState<'hour' | 'minute'>(mode === 'long' ? 'minute' : 'hour')
  const [moved, setMoved] = useState(false)
  const dragging = useRef(false)
  const last = useRef(pose)
  last.current = pose

  // Linked hands: the short hand sits at base + (minutes turned) / 12. base is fixed when the short hand is set.
  // A tap counts the minutes forward from 12 (0..360); only a continuous drag carries on across 12, a full hour
  // turn at a time. So a tap gives the same pose wherever the long hand was, and the face always reads true.
  const base = useRef(initial.hour - norm(initial.minute) / 12)
  const turned = useRef(norm(initial.minute))
  const linkedHour = () => norm(base.current + turned.current / 12)

  const apply = (angle: number, tap: boolean) => {
    const p = last.current
    if (active === 'minute') {
      // a tap just left of 12 snaps to 12: it means no minutes, not a whole hour
      if (linked) turned.current = tap ? (norm(angle) > 345 ? norm(angle) - 360 : norm(angle)) : turned.current + angleDelta(turned.current, angle)
      const next = { hour: linked ? linkedHour() : p.hour, minute: angle }
      last.current = next
      setPose(next)
    } else {
      // the short hand moves an hour at a time, only to where it belongs with the long hand (the parent: moving it freely
      // made impossible states); a click on each step
      const step = norm(Math.round((angle - norm(p.minute) / 12) / 30) * 30)
      if (Math.round(norm(base.current)) !== step) onSnap?.()
      base.current = step
      turned.current = norm(p.minute)
      const next = { ...p, hour: norm(step + norm(p.minute) / 12) }
      last.current = next
      setPose(next)
    }
    setMoved(true)
  }
  const fromEvent = (e: React.PointerEvent) => angleFromPointer(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())

  const down = (e: React.PointerEvent) => {
    if (locked) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragging.current = true
    apply(fromEvent(e), true)
  }
  const move = (e: React.PointerEvent) => {
    if (dragging.current && !locked) apply(fromEvent(e), false)
  }
  const up = () => {
    if (!dragging.current) return
    dragging.current = false
    if (active === 'minute') {
      const p = last.current
      const snapped = snapMinute(p.minute)
      if (linked) turned.current += angleDelta(p.minute, snapped)
      const next = { hour: linked ? linkedHour() : p.hour, minute: snapped }
      last.current = next
      setPose(next)
      onSnap?.()
    } else if (mode === 'both') setActive('minute')
  }

  const shown = reveal ?? pose
  return (
    <div className={`ck-setter ck-setter-${layout}`}>
      <ClockFace pose={shown} numbers={numbers} ring={ring} slice={slice} kind={kind} size={size} caseClip={caseClip} glide={!!reveal}
        glow={reveal ? null : active} pulse={!reveal && !locked}
        overlay={<div data-face-input className="ck-face-input" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', touchAction: 'none' }} />} />
      <div className="ck-hand-buttons">
        {/* the hand to move pulses on the clock itself; buttons only when there is a choice of hand (the playtest: "the
            pulsating dial at the bottom is redundant. Pulsate the actual one that needs to be moved instead") */}
        {mode === 'both' && (
          <>
            <button aria-label="short hand" className={`ck-hand-btn ${active === 'hour' ? 'on' : ''}`} onPointerDown={() => !locked && setActive('hour')}>
              <HandShortIcon />
            </button>
            <button aria-label="long hand" className={`ck-hand-btn ${active === 'minute' ? 'on' : ''}`} onPointerDown={() => !locked && setActive('minute')}>
              <HandLongIcon />
            </button>
          </>
        )}
        <motion.button aria-label="check" className="ck-check" disabled={locked || !moved}
          animate={moved && !locked ? { scale: [1, 1.08, 1] } : { scale: 1 }} transition={{ repeat: moved ? Infinity : 0, duration: 1.4 }}
          onClick={() => onSubmit({ hour: pose.hour, minute: snapMinute(pose.minute) })}>
          <CheckIcon />
        </motion.button>
      </div>
    </div>
  )
}
