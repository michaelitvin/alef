// 3 · Spell ladder: the ladder is built from his right answers. Three plates float by the next empty rung; the one he picks
// flies into place and the wizard climbs onto it.
import { IMAGES } from '../../assets/images'
import type { Choice } from '../../logic/rounds'
import { Glyph } from '../Glyph'
import { Plate, type PickState } from '../Orb'
import { Stage, type Phase } from './Stage'

export const RUNG_W = 300
export const LADDER_GLYPH_PX = 96
const RUNG_Y = (k: number) => 790 - k * 150
const PLATE_X = 1260
const PLATE_W = 300

/** The three plates float by the next empty rung. */
export function plateYs(built: number, rungs: number): number[] {
  // centred on the next rung, shifted (not squashed) to stay on the stage
  const c = Math.min(800 - 170, Math.max(160 + 170, RUNG_Y(Math.min(built, rungs - 1))))
  return [c - 170, c, c + 170]
}
export const LADDER_PLATE_X = PLATE_X

export function Ladder(p: { built: Choice[]; plates: Choice[]; rungs: number; onPick: (id: string) => void; phase: Phase; reveal?: { right: string; wrong?: string }; correctId?: string }) {
  const lh = 790 - RUNG_Y(p.rungs - 1) + 170
  const lw = lh * (216 / 600)
  const fixY = plateYs(p.built.length, p.rungs)
  const standY = p.built.length ? RUNG_Y(p.built.length - 1) : 880
  const wizH = 230
  const can = p.phase === 'answer'
  return (
    <Stage bg="bg-ground">
      {IMAGES['s-ladder']
        ? <image href={IMAGES['s-ladder']} x={800 - lw / 2} y={RUNG_Y(p.rungs - 1) - 110} width={lw} height={lh} preserveAspectRatio="none" />
        : <g stroke="#e7b860" strokeWidth={14}><line x1={690} y1={80} x2={690} y2={880} /><line x1={910} y1={80} x2={910} y2={880} /></g>}
      {p.built.map((c, k) => (
        <g key={k} data-rung={k}>
          <Plate w={RUNG_W} x={800} y={RUNG_Y(k)} state="idle"><Glyph text={c.text} px={LADDER_GLYPH_PX} x={800} y={RUNG_Y(k)} /></Plate>
        </g>
      ))}
      {IMAGES['s-wizard-idle'] && (
        <image data-wizard href={IMAGES['s-wizard-idle']} x={560 - wizH * 0.4} y={standY - wizH + 40} width={wizH * 0.8} height={wizH} className="d2-climb" />
      )}
      {p.plates.map((c, i) => {
        let state: PickState = can ? 'idle' : 'off'
        if (p.reveal?.right === c.id) state = 'reveal'
        else if (p.reveal?.wrong === c.id) state = 'wrong'
        return (
          <g key={c.id} data-plate={c.id}>
            <Plate w={PLATE_W} x={PLATE_X} y={fixY[i]} state={state} onPick={() => p.onPick(c.id)} testCorrect={c.id === p.correctId}>
              <Glyph text={c.text} px={LADDER_GLYPH_PX} x={PLATE_X} y={fixY[i]} />
            </Plate>
          </g>
        )
      })}
    </Stage>
  )
}
