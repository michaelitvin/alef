// A choice he can drag to where it goes (the pot, the next rung, the door) or tap. A tap answers on finger-up, because
// finger-down starts a drag; a drag answers only when he lets go over the drop zone, and otherwise the choice flies back.
// The demo moves the choice with the hand (rule): `demo` is the fraction of the way to `to`.
import { useState, type ReactNode } from 'react'
import { toStage } from './screens/Stage'

const MOVE_PX = 20

export function DragPick(p: {
  enabled: boolean
  /** the drop zone, in stage coordinates of the finger */
  inZone: (q: { x: number; y: number }) => boolean
  onPick: () => void
  children: ReactNode
  /** demo: how far (0–1) the choice has moved from its place toward `to` (dx, dy in stage units) */
  demo?: { t: number; dx: number; dy: number }
  attrs?: Record<string, string>
}) {
  const [d, setD] = useState<{ id: number; sx: number; sy: number; dx: number; dy: number; moved: boolean } | null>(null)
  const at = (e: React.PointerEvent) => toStage(e.currentTarget as Element, e.clientX, e.clientY)
  const tx = d ? `translate(${d.dx} ${d.dy})` : p.demo ? `translate(${p.demo.dx * p.demo.t} ${p.demo.dy * p.demo.t})` : undefined
  return (
    <g {...p.attrs} transform={tx} style={{ cursor: p.enabled ? 'grab' : 'default' }}
      onPointerDown={(e) => {
        if (!p.enabled) return
        e.preventDefault()
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        const q = at(e)
        setD({ id: e.pointerId, sx: q.x, sy: q.y, dx: 0, dy: 0, moved: false })
      }}
      onPointerMove={(e) => {
        if (!d || d.id !== e.pointerId) return
        const q = at(e)
        const dx = q.x - d.sx
        const dy = q.y - d.sy
        setD({ ...d, dx, dy, moved: d.moved || Math.hypot(dx, dy) > MOVE_PX })
      }}
      onPointerUp={(e) => {
        if (!d || d.id !== e.pointerId) return
        const q = at(e)
        const moved = d.moved || Math.hypot(q.x - d.sx, q.y - d.sy) > MOVE_PX
        setD(null)
        if (!moved || p.inZone(q)) p.onPick()
      }}
      onPointerCancel={() => setD(null)}>
      {p.children}
    </g>
  )
}
