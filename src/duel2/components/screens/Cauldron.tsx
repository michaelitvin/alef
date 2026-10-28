// 2 · Cauldron: a letter over a bubbling pot; three vowel orbs above. He drags the vowel he heard into the pot (or taps it);
// the mark joins the letter.
import { useRef } from 'react'
import { IMAGES } from '../../assets/images'
import type { Item, Mark, MarkId, Syllable } from '../../logic/content'
import { DragPick } from '../DragPick'
import { Glyph } from '../Glyph'
import { MarkAlone } from '../MarkAlone'
import { Orb, type PickState } from '../Orb'
import { Stage, type Phase } from './Stage'

export const ORB_X = [450, 800, 1150]
export const ORB_Y = 200
export const ORB_SIZE = 180
export const CAULDRON_GLYPH_PX = 190
const POT = { x: 800, top: 480, w: 330 }

export function Cauldron(p: {
  letter: Item; orbs: Mark[]; onPick: (m: MarkId) => void; phase: Phase; joined?: Syllable; reveal?: { right: MarkId; wrong?: MarkId }; correct?: MarkId
  /** the demo drags this orb to the pot as the hand moves (t from 0 to 1) */
  demo?: { id: MarkId; t: number }
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const can = p.phase === 'answer'
  const potH = POT.w * (600 / 496)
  return (
    <Stage bg="bg-ground" ref={svgRef}>
      {IMAGES['s-cauldron']
        ? <image href={IMAGES['s-cauldron']} x={POT.x - POT.w / 2} y={875 - potH} width={POT.w} height={potH} />
        : <ellipse cx={POT.x} cy={720} rx={170} ry={130} fill="#1a1230" stroke="#5ef0a6" strokeWidth={6} />}
      <Glyph text={p.joined ? p.joined.text : p.letter.glyph} px={CAULDRON_GLYPH_PX} x={800} y={395} glow={p.joined ? 'hit' : 'soft'} />
      {p.orbs.map((m, i) => {
        if (p.joined && m.id === p.joined.mark.id) return null
        const dm = p.demo?.id === m.id ? p.demo.t : null
        const x = dm !== null ? ORB_X[i] + (800 - ORB_X[i]) * dm : ORB_X[i]
        const y = dm !== null ? ORB_Y + (650 - ORB_Y) * dm : ORB_Y
        let state: PickState = p.phase === 'feedback' || p.phase === 'celebrate' ? 'off' : 'idle'
        if (p.reveal?.right === m.id) state = 'reveal'
        else if (p.reveal?.wrong === m.id) state = 'wrong'
        return (
          <DragPick key={m.id} attrs={{ 'data-orb': m.id, ...(p.correct === m.id ? { 'data-correct-orb': '1' } : {}) }} enabled={can || (p.phase === 'mistake' && state === 'reveal')}
            onPick={() => p.onPick(m.id)} inZone={(q) => Math.abs(q.x - POT.x) < POT.w * 0.6 && q.y > POT.top}>
            <Orb size={ORB_SIZE} x={x} y={y} state={state} testCorrect={p.correct === m.id}>
              <MarkAlone mark={m} size={ORB_SIZE * 0.62} x={x} y={y} />
            </Orb>
          </DragPick>
        )
      })}
    </Stage>
  )
}
