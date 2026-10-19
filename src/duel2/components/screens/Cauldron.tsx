// 2 · Cauldron: a letter over a bubbling pot; three vowel orbs above. He drags the vowel he heard into the pot (or taps it);
// the mark joins the letter.
import { useRef, useState } from 'react'
import { IMAGES } from '../../assets/images'
import type { Item, Mark, MarkId, Syllable } from '../../logic/content'
import { Glyph } from '../Glyph'
import { MarkAlone } from '../MarkAlone'
import { Orb, type PickState } from '../Orb'
import { Stage, toStage, type Phase } from './Stage'

export const ORB_X = [450, 800, 1150]
export const ORB_Y = 200
export const ORB_SIZE = 180
export const CAULDRON_GLYPH_PX = 190
const POT = { x: 800, top: 480, w: 330 }

export function Cauldron(p: {
  letter: Item; orbs: Mark[]; onPick: (m: MarkId) => void; phase: Phase; joined?: Syllable; reveal?: { right: MarkId; wrong?: MarkId }; correct?: MarkId
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ id: MarkId; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null)
  const can = p.phase === 'answer'
  const at = (e: React.PointerEvent) => toStage(svgRef.current, e.clientX, e.clientY)
  const potH = POT.w * (600 / 496)
  return (
    <Stage bg="bg-ground" ref={svgRef}>
      {IMAGES['s-cauldron']
        ? <image href={IMAGES['s-cauldron']} x={POT.x - POT.w / 2} y={875 - potH} width={POT.w} height={potH} />
        : <ellipse cx={POT.x} cy={720} rx={170} ry={130} fill="#1a1230" stroke="#5ef0a6" strokeWidth={6} />}
      <Glyph text={p.joined ? p.joined.text : p.letter.glyph} px={CAULDRON_GLYPH_PX} x={800} y={395} glow={p.joined ? 'hit' : 'soft'} />
      {p.orbs.map((m, i) => {
        if (p.joined && m.id === p.joined.mark.id) return null
        const d = drag?.id === m.id ? drag : null
        const x = d ? d.x : ORB_X[i]
        const y = d ? d.y : ORB_Y
        let state: PickState = p.phase === 'feedback' || p.phase === 'celebrate' ? 'off' : 'idle'
        if (p.reveal?.right === m.id) state = 'reveal'
        else if (p.reveal?.wrong === m.id) state = 'wrong'
        return (
          <g key={m.id} data-orb={m.id} style={{ touchAction: 'none', cursor: can ? 'grab' : 'default' }}
            {...(p.correct === m.id ? { 'data-correct-orb': '1' } : {})}
            onPointerDown={(e) => {
              if (!can) return
              e.preventDefault()
              ;(e.target as Element).setPointerCapture?.(e.pointerId)
              const q = at(e)
              setDrag({ id: m.id, x: ORB_X[i], y: ORB_Y, sx: q.x, sy: q.y, moved: false })
            }}
            onPointerMove={(e) => {
              if (!drag || drag.id !== m.id) return
              const q = at(e)
              const moved = drag.moved || Math.hypot(q.x - drag.sx, q.y - drag.sy) > 20
              setDrag({ ...drag, x: ORB_X[i] + q.x - drag.sx, y: ORB_Y + q.y - drag.sy, moved })
            }}
            onPointerUp={(e) => {
              if (!drag || drag.id !== m.id) return
              const q = at(e)
              const moved = drag.moved || Math.hypot(q.x - drag.sx, q.y - drag.sy) > 20
              setDrag(null)
              const inPot = Math.abs(q.x - POT.x) < POT.w * 0.6 && q.y > POT.top
              if (!moved || inPot) p.onPick(m.id)
            }}
            onPointerCancel={() => setDrag(null)}>
            <Orb size={ORB_SIZE} x={x} y={y} state={state} testCorrect={p.correct === m.id} onPick={() => {}}>
              <MarkAlone mark={m} size={ORB_SIZE * 0.62} x={x} y={y} />
            </Orb>
          </g>
        )
      })}
    </Stage>
  )
}
