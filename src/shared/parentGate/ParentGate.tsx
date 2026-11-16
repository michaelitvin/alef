// The parent gate (rule: Interaction): every way into a parent screen needs a 2 s hold (the held button with its filling
// ring) and then the parent's year of birth on a number pad. Any adult year opens (acceptYear); nothing is stored. A wrong
// year, or a tap beside the pad, goes back to where the child was, with no message.
//
//   <ParentGate label="parent settings (hold)" className="d2-parent-btn" onOpen={openArea}><SlidersGlyph /></ParentGate>
import { useState, type ReactNode } from 'react'
import { HoldButton, type HoldRing } from '../HoldButton'
import { YearPad } from './YearPad'
import { acceptYear } from './acceptYear'

export interface ParentGateProps {
  /** the held button's label and class (each game places and colours its own) */
  label: string
  className: string
  /** the right year: open the parent screen */
  onOpen: () => void
  /** a wrong year or a tap beside the pad (the pad has closed already; a route goes back here) */
  onCancel?: () => void
  /** the button's icon in the ring's 56-unit box */
  children?: ReactNode
  /** an icon over the ring as its own element */
  overlay?: ReactNode
  ring?: HoldRing
  title?: string
}

export function ParentGate({ label, className, onOpen, onCancel, children, overlay, ring, title }: ParentGateProps) {
  const [asking, setAsking] = useState(false)
  return (
    <>
      <HoldButton label={label} className={className} onHold={() => setAsking(true)} overlay={overlay} ring={ring} title={title}>{children}</HoldButton>
      {asking && (
        <YearPad
          onYear={(y) => { setAsking(false); if (acceptYear(y)) onOpen(); else onCancel?.() }}
          onCancel={() => { setAsking(false); onCancel?.() }} />
      )}
    </>
  )
}
