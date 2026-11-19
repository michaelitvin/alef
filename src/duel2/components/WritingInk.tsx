// His writing on a board (the drawing screen, and the spell book's written words): the pad that takes his finger (a
// stroke ends when it lifts; a stroke that ends while he may not write fades away), and his strokes as the policy judged
// them (white while live, gold when right, fading red when wrong). Points: the pad gives stage units; the strokes are
// drawn through `map` (the board's letter units → stage).
import { useEffect, useRef, useState } from 'react'
import type { Pt } from '../data/strokes'
import type { DrawStroke } from '../policies/draw'
import { pathLength } from '../logic/recognizer'
import { toStage } from './screens/Stage'
import { useTouchAnswer } from './DragPick'

const poly = (p: Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

/** the width of his ink on a board of `u` stage units per letter unit */
export const inkWidth = (u: number) => Math.max(9, u * 0.085)

/** his strokes: gold ones glow with a halo under them (no blur filter: cheap on the old tablet) */
export function InkStrokes(p: { strokes: DrawStroke[]; map: (q: Pt) => Pt; width: number; className?: string }) {
  const w = p.width
  return (
    <g data-strokes className={p.className}>
      {p.strokes.map((s) => {
        const pts = s.pts.map(p.map)
        const gold = s.state === 'ok' || s.state === 'helped'
        const color = gold ? '#ffd34d' : s.state === 'wrong' ? '#ff8a7a' : '#ffffff'
        const tap = s.pts.length < 2 || pathLength(s.pts) < 0.05
        const cls = s.state === 'wrong' ? 'd2-stroke-fade' : undefined
        return tap
          ? <g key={s.id} className={cls}>
            {gold && <circle className="d2-halo" cx={pts[0][0]} cy={pts[0][1]} r={w * 1.4} fill="#ffd34d" opacity={0.3} />}
            <circle data-stroke={s.state} cx={pts[0][0]} cy={pts[0][1]} r={w * 0.7} fill={color} />
          </g>
          : <g key={s.id} className={cls} opacity={s.state === 'pending' ? 0.75 : 1}>
            {gold && <polyline className="d2-halo" points={poly(pts)} fill="none" stroke="#ffd34d" strokeOpacity={0.3} strokeWidth={w * 2.6} strokeLinecap="round" strokeLinejoin="round" />}
            <polyline data-stroke={s.state} points={poly(pts)} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
          </g>
      })}
    </g>
  )
}

/**
 * The pad over the board: his finger draws a white line; when it lifts, `onStroke` gets the stroke (stage units) if he
 * may write (`can`), else it fades. The pen going down takes a hint away (rule). `onDown`: his finger is down or up.
 */
export function WritingPad(p: {
  x: number; y: number; width: number; height: number; can: boolean; ink: number
  onStroke: (pts: Pt[]) => void; onDown?: (down: boolean) => void
}) {
  const touch = useTouchAnswer()
  const live = useRef<{ id: number; pts: Pt[] } | null>(null)
  const liveEl = useRef<SVGPolylineElement | null>(null)
  /** strokes cut off because the hand or the voice began: they fade instead of vanishing */
  const [discarded, setDiscarded] = useState<{ id: number; pts: Pt[] }[]>([])
  useEffect(() => {
    if (!discarded.length) return
    const timer = window.setTimeout(() => setDiscarded([]), 950)
    return () => window.clearTimeout(timer)
  }, [discarded])
  /** the screen → stage mapping, taken once when the finger goes down (not on every move) */
  const inv = useRef<DOMMatrix | null>(null)
  const at = (e: React.PointerEvent): Pt => {
    const m = inv.current
    if (m) return [m.a * e.clientX + m.c * e.clientY + m.e, m.b * e.clientX + m.d * e.clientY + m.f]
    const q = toStage(e.currentTarget as Element, e.clientX, e.clientY)
    return [q.x, q.y]
  }
  const show = () => { if (liveEl.current) liveEl.current.setAttribute('points', live.current ? poly(live.current.pts) : '') }
  const end = (e: React.PointerEvent) => {
    const s = live.current
    if (!s || s.id !== e.pointerId) return
    live.current = null
    inv.current = null
    p.onDown?.(false)
    show()
    if (p.can) p.onStroke(s.pts)
    else setDiscarded((d) => [...d, { id: s.id, pts: s.pts }])
  }
  return (
    <>
      <rect data-draw-pad x={p.x} y={p.y} width={p.width} height={p.height} fill="transparent"
        style={{ cursor: p.can ? 'crosshair' : 'default' }}
        onPointerDown={(e) => {
          if (!p.can || live.current) return
          e.preventDefault()
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          const svg = (e.currentTarget as Element).closest('svg') as SVGSVGElement | null
          const ctm = svg?.getScreenCTM?.()
          inv.current = ctm && typeof ctm.inverse === 'function' ? ctm.inverse() : null
          p.onDown?.(true)
          // the pen goes down: a hint's hand goes away at once (rule)
          touch?.('pen')
          live.current = { id: e.pointerId, pts: [at(e)] }
          show()
        }}
        onPointerMove={(e) => {
          const s = live.current
          if (!s || s.id !== e.pointerId) return
          const q = at(e)
          const last = s.pts[s.pts.length - 1]
          if (Math.hypot(q[0] - last[0], q[1] - last[1]) < 3) return
          s.pts.push(q)
          show()
        }}
        onPointerUp={end}
        onPointerCancel={() => { live.current = null; inv.current = null; p.onDown?.(false); show() }} />
      {discarded.map((d) => <polyline key={d.id} data-discarded className="d2-stroke-fade" points={poly(d.pts)} fill="none" stroke="#ffffff" strokeWidth={p.ink} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />)}
      <polyline ref={liveEl} data-live points="" fill="none" stroke="#ffffff" strokeWidth={p.ink} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
    </>
  )
}
