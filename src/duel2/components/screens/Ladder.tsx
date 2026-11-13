// 3 · Spell ladder: the ladder is built from his right answers. Three plates float by the next empty rung; the one he picks
// flies into place and the wizard climbs onto it. He drags a plate onto the next rung, or taps it.
// On a phone on its side the ladder rises into the top bar's empty middle (layout.ts intoBandView), so all of it is larger;
// the plates stay below the bar.
import { IMAGES, useWizardArt } from '../../assets/images'
import type { Choice } from '../../logic/rounds'
import { belowBand, intoBandView, STAGE_CONTENT_TOP, viewBoxOf, type FullView } from '../../layout'
import { DragPick } from '../DragPick'
import { Glyph } from '../Glyph'
import { HIT, Plate, PLATE_ASPECT, type PickState } from '../Orb'
import { Stage, type Phase } from './Stage'

export const RUNG_W = 300
export const LADDER_GLYPH_PX = 96
const RUNG_Y = (k: number) => 790 - k * 150
const PLATE_X = 1260
const PLATE_W = 300
/** the plates' centres, one above the other */
const PLATE_STEP = 170
/** a plate's hit area's half height (its box on the screen) */
const PLATE_HALF = (PLATE_W * PLATE_ASPECT * HIT) / 2
/** the wizard's height, and where he stands before the first rung: his feet on the stage (it ends at 900) */
export const LADDER_WIZ_H = 230
export const WIZ_START_Y = 855
export const LADDER_CX = 800
export const LADDER_PLATE_X = PLATE_X

/** a box in stage units */
export interface Box { x: number; y: number; w: number; h: number }

/**
 * The three plates float by the next empty rung: centred on it, shifted (not squashed) to stay on the stage, and with
 * `minTop` (stage y) their boxes start below it (the top bar's band in a full view: at the top rungs they move down).
 */
export function plateYs(built: number, rungs: number, minTop = 0): number[] {
  const lo = Math.max(160 + PLATE_STEP, minTop + PLATE_STEP + PLATE_HALF)
  const c = Math.min(800 - PLATE_STEP, Math.max(lo, RUNG_Y(Math.min(built, rungs - 1))))
  return [c - PLATE_STEP, c, c + PLATE_STEP]
}

/** the next empty rung's y (the drop target) */
export const nextRungY = (built: number, rungs: number) => RUNG_Y(Math.min(built, rungs - 1))

/** The ladder's view on a w×h screen: into the band where it fits (layout.ts intoBandView), else none (the stage as before). */
export function ladderView(size?: { w: number; h: number }): FullView | null {
  if (!size) return null
  return intoBandView(size.w, size.h, LADDER_CX, RUNG_W, STAGE_CONTENT_TOP.ladder)
}

/** where the plates' boxes may start in a view (stage y): below the band */
export const plateTop = (view: FullView | null) => (view ? belowBand(view) : 0)

/** The screen's boxes (stage units): the ladder, its built rungs, the plates (their hit areas) and the wizard. */
export function ladderBoxes(built: number, rungs: number, view: FullView | null = null) {
  const lh = 790 - RUNG_Y(rungs - 1) + 170
  const lw = lh * (216 / 600)
  const ph = PLATE_W * PLATE_ASPECT
  const standY = built ? RUNG_Y(Math.min(built, rungs) - 1) : WIZ_START_Y
  const ys = plateYs(built, rungs, plateTop(view))
  return {
    ladder: { x: LADDER_CX - lw / 2, y: RUNG_Y(rungs - 1) - 110, w: lw, h: lh } as Box,
    rungs: Array.from({ length: Math.min(built, rungs) }, (_, k): Box => ({ x: LADDER_CX - RUNG_W / 2, y: RUNG_Y(k) - (RUNG_W * PLATE_ASPECT) / 2, w: RUNG_W, h: RUNG_W * PLATE_ASPECT })),
    plates: built < rungs ? ys.map((y): Box => ({ x: PLATE_X - (PLATE_W * HIT) / 2, y: y - (ph * HIT) / 2, w: PLATE_W * HIT, h: ph * HIT })) : [],
    plateYs: ys,
    wizard: { x: 560 - LADDER_WIZ_H * 0.4, y: standY - LADDER_WIZ_H + 40, w: LADDER_WIZ_H * 0.8, h: LADDER_WIZ_H } as Box,
  }
}

export function Ladder(p: { built: Choice[]; plates: Choice[]; rungs: number; onPick: (id: string) => void; phase: Phase; reveal?: { right: string; wrong?: string }; correctId?: string
  /** the demo drags this plate to the next rung as the hand moves (t from 0 to 1) */
  demo?: { id: string; t: number }
  /** the screen's size: on a phone on its side the ladder rises into the band (ladderView) */
  size?: { w: number; h: number }
}) {
  const wiz = useWizardArt()
  const view = ladderView(p.size)
  const b = ladderBoxes(p.built.length, p.rungs, view)
  const fixY = b.plateYs
  const can = p.phase === 'answer'
  return (
    <Stage bg="bg-ground" {...(view ? { viewBox: viewBoxOf(view), 'data-into-band': '' } : {})}>
      {IMAGES['s-ladder']
        ? <image href={IMAGES['s-ladder']} x={b.ladder.x} y={b.ladder.y} width={b.ladder.w} height={b.ladder.h} preserveAspectRatio="none" />
        : <g stroke="#e7b860" strokeWidth={14}><line x1={690} y1={80} x2={690} y2={880} /><line x1={910} y1={80} x2={910} y2={880} /></g>}
      {p.built.map((c, k) => (
        <g key={k} data-rung={k}>
          <Plate w={RUNG_W} x={LADDER_CX} y={RUNG_Y(k)} state="idle" still><Glyph text={c.text} px={LADDER_GLYPH_PX} x={LADDER_CX} y={RUNG_Y(k)} /></Plate>
        </g>
      ))}
      {wiz('s-wizard-idle') && (
        <image data-wizard href={wiz('s-wizard-idle')} x={b.wizard.x} y={b.wizard.y} width={b.wizard.w} height={b.wizard.h} className="d2-climb" />
      )}
      {p.plates.map((c, i) => {
        let state: PickState = p.phase === 'feedback' || p.phase === 'celebrate' ? 'off' : 'idle'
        if (p.reveal?.right === c.id) state = 'reveal'
        else if (p.reveal?.wrong === c.id) state = 'wrong'
        const rungY = nextRungY(p.built.length, p.rungs)
        return (
          <DragPick key={c.id} attrs={{ 'data-plate': c.id }} enabled={can || (p.phase === 'mistake' && state === 'reveal')} onPick={() => p.onPick(c.id)}
            // anywhere over the ladder counts (a child's drop is not precise)
            inZone={(q) => Math.abs(q.x - LADDER_CX) < RUNG_W * 0.8 && Math.abs(q.y - rungY) < 150}
            demo={p.demo?.id === c.id ? { t: p.demo.t, dx: LADDER_CX - PLATE_X, dy: rungY - fixY[i] } : undefined}>
            <Plate w={PLATE_W} x={PLATE_X} y={fixY[i]} state={state} testCorrect={c.id === p.correctId}>
              <Glyph text={c.text} px={LADDER_GLYPH_PX} x={PLATE_X} y={fixY[i]} />
            </Plate>
          </DragPick>
        )
      })}
    </Stage>
  )
}
