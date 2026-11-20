// 3 · Spell ladder: the ladder is built from his right answers. Three plates float by the next empty rung; the one he picks
// flies into place and the wizard climbs onto it. He drags a plate onto the next rung, or taps it.
// On a phone on its side the ladder rises into the top bar's empty middle (layout.ts intoBandView), so all of it is larger;
// the plates stay below the bar.
// The English ladder (word chains): the rung he makes shows the word below in boxes; at the early stages the place that
// changes is marked (a gold box, or an empty gold box where a letter comes in: lip → slip), later he finds it.
import { useImages, useWizardArt } from '../../course/CourseContext'
import type { Choice } from '../../logic/rounds'
import { belowBand, intoBandView, STAGE_CONTENT_TOP, viewBoxOf, type FullView } from '../../layout'
import { DragPick } from '../DragPick'
import { Glyph, latinFitPx as fitPx } from '../Glyph'
import { HIT, Plate, PLATE_ASPECT, type PickState } from '../Orb'
import { Stage, type Dir, type Phase } from './Stage'

export const RUNG_W = 300
const LADDER_GLYPH_PX = 96
const RUNG_Y = (k: number) => 790 - k * 150
const PLATE_X = 1260
export const PLATE_W = 300
/** the plates' centres, one above the other */
const PLATE_STEP = 170
/** a plate's hit area's half height (its box on the screen) */
const PLATE_HALF = (PLATE_W * PLATE_ASPECT * HIT) / 2
/** the wizard's height, and where he stands before the first rung: his feet on the stage (it ends at 900) */
const LADDER_WIZ_H = 230
const WIZ_START_Y = 855
/** the wizard's centre x, left of the ladder; his box's right edge (his staff) */
const LADDER_WIZ_X = 560
const WIZ_RIGHT = LADDER_WIZ_X + LADDER_WIZ_H * 0.4
export const LADDER_CX = 800
export const LADDER_PLATE_X = PLATE_X
/** the room between the rung he makes and the wizard's staff */
const ROW_AIR = 20
/**
 * The boxes of the rung he makes (English): a row over the rung, centred on the ladder, that stays clear of the wizard
 * (his staff is at WIZ_RIGHT) and of the built rung below (rungs are 150 apart, a plate 147 high: 28 to spare)
 */
const BOX_ROW_W = 2 * (LADDER_CX - WIZ_RIGHT - ROW_AIR)
const BOX_MAX_W = 96
const BOX_H = 96
const BOX_GAP = 8

/** the box row's centres over the rung, left to right (the stage is ltr on the English path) */
export function rungBoxXs(n: number): { xs: number[]; w: number } {
  const w = Math.min(BOX_MAX_W, (BOX_ROW_W - BOX_GAP * (n - 1)) / n)
  const left = LADDER_CX - (n * w + (n - 1) * BOX_GAP) / 2 + w / 2
  return { xs: Array.from({ length: n }, (_, i) => left + i * (w + BOX_GAP)), w }
}

/** the rung he makes (English): the word below's boxes; `marked`: box `at` is gold, or with `grow` 1 an empty gold box comes in there */
interface RungChange { from: Choice[]; at: number; grow?: 1 | -1; marked: boolean }

/** the boxes of the rung he makes: each its text (null: the empty box that comes in) and whether it is marked */
function rungBoxes(c: RungChange): { text: string | null; mark: boolean }[] {
  const boxes = c.from.map((x, i) => ({ text: x.text as string | null, mark: c.marked && c.grow !== 1 && i === c.at }))
  if (c.marked && c.grow === 1) boxes.splice(c.at, 0, { text: null, mark: true })
  return boxes
}

/**
 * Where a drop at stage x puts the part on an unmarked rung (he finds the place): the box under it when a box changes,
 * the gap between boxes (0: before the first) when one comes in
 */
function dropPlace(c: RungChange, x: number): number {
  const { xs } = rungBoxXs(c.from.length)
  if (c.grow === 1) return xs.filter((bx) => bx < x).length
  let best = 0
  xs.forEach((bx, i) => { if (Math.abs(bx - x) < Math.abs(xs[best] - x)) best = i })
  return best
}

/** where the part goes on the rung he makes (the demo's hand): its box, or the gap where a box comes in */
export function rungPlaceX(c: RungChange): number {
  if (c.marked) { const { xs } = rungBoxXs(rungBoxes(c).length); return xs[c.at] }
  const { xs, w } = rungBoxXs(c.from.length)
  if (c.grow !== 1) return xs[c.at]
  return c.at === 0 ? xs[0] - w / 2 : c.at >= xs.length ? xs[xs.length - 1] + w / 2 : (xs[c.at - 1] + xs[c.at]) / 2
}

function MakingRung(p: { change: RungChange; y: number }) {
  const boxes = rungBoxes(p.change)
  const { xs, w } = rungBoxXs(boxes.length)
  return (
    <g data-making-rung data-marked={p.change.marked ? '1' : '0'}>
      {boxes.map((b, i) => (
        <g key={i} data-box={b.text ?? '_'} {...(b.mark ? { 'data-marked-box': '' } : {})}>
          <rect x={xs[i] - w / 2} y={p.y - BOX_H / 2} width={w} height={BOX_H} rx={14} fill="#1b0f3c" fillOpacity={0.55}
            stroke={b.mark ? '#ffd34d' : '#fff6d8'} strokeWidth={b.mark ? 7 : 5} strokeDasharray={b.text === null ? '14 10' : undefined} />
          {/* the marked letter is the one that goes: faded */}
          {b.text !== null && <g opacity={b.mark ? 0.45 : 1}><Glyph text={b.text} px={fitPx(b.text, w, 84)} x={xs[i]} y={p.y} alphabet="latin" /></g>}
        </g>
      ))}
    </g>
  )
}

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
    wizard: { x: LADDER_WIZ_X - LADDER_WIZ_H * 0.4, y: standY - LADDER_WIZ_H + 40, w: LADDER_WIZ_H * 0.8, h: LADDER_WIZ_H } as Box,
  }
}

export function Ladder(p: {
  built: Choice[]; plates: Choice[]; rungs: number
  /** `box`: on an unmarked English rung, the place he dropped the plate on (dropPlace; unset: a tap) */
  onPick: (id: string, box?: number) => void; phase: Phase; reveal?: { right: string; wrong?: string }; correctId?: string
  /** the demo drags this plate to the next rung as the hand moves (t from 0 to 1) */
  demo?: { id: string; t: number }
  /** the screen's size: on a phone on its side the ladder rises into the band (ladderView) */
  size?: { w: number; h: number }
  /** the course's direction (default: Hebrew's) */
  dir?: Dir
  /** English: the rung he makes, from the word below (none on the first rung and in Hebrew) */
  change?: RungChange
}) {
  const images = useImages()
  const alphabet = p.dir === 'ltr' ? 'latin' : 'hebrew'
  // a Latin word fits its plate (Hebrew's letters keep their size)
  const px = (text: string, w: number) => (alphabet === 'latin' ? fitPx(text, w, LADDER_GLYPH_PX) : LADDER_GLYPH_PX)
  const wiz = useWizardArt()
  const view = ladderView(p.size)
  const b = ladderBoxes(p.built.length, p.rungs, view)
  const fixY = b.plateYs
  const can = p.phase === 'answer'
  const change = p.change && p.plates.length > 0 && p.built.length < p.rungs ? p.change : undefined
  return (
    <Stage bg="bg-ground" dir={p.dir} {...(view ? { viewBox: viewBoxOf(view), 'data-into-band': '' } : {})}>
      {images['s-ladder']
        ? <image href={images['s-ladder']} x={b.ladder.x} y={b.ladder.y} width={b.ladder.w} height={b.ladder.h} preserveAspectRatio="none" />
        : <g stroke="#e7b860" strokeWidth={14}><line x1={690} y1={80} x2={690} y2={880} /><line x1={910} y1={80} x2={910} y2={880} /></g>}
      {p.built.map((c, k) => (
        <g key={k} data-rung={k}>
          <Plate w={RUNG_W} x={LADDER_CX} y={RUNG_Y(k)} state="idle" still><Glyph text={c.text} px={px(c.text, RUNG_W)} x={LADDER_CX} y={RUNG_Y(k)} alphabet={alphabet} /></Plate>
        </g>
      ))}
      {change && <MakingRung change={change} y={nextRungY(p.built.length, p.rungs)} />}
      {wiz('s-wizard-idle') && (
        // a new ladder: he is back at the start at once (sliding down from the top he would pass under the bar's buttons)
        <image data-wizard href={wiz('s-wizard-idle')} x={b.wizard.x} y={b.wizard.y} width={b.wizard.w} height={b.wizard.h} className="d2-climb"
          style={p.built.length === 0 ? { transition: 'none' } : undefined} />
      )}
      {p.plates.map((c, i) => {
        let state: PickState = p.phase === 'feedback' || p.phase === 'celebrate' ? 'off' : 'idle'
        if (p.reveal?.right === c.id) state = 'reveal'
        else if (p.reveal?.wrong === c.id) state = 'wrong'
        const rungY = nextRungY(p.built.length, p.rungs)
        return (
          <DragPick key={c.id} attrs={{ 'data-plate': c.id }} enabled={can || (p.phase === 'mistake' && state === 'reveal')}
            onPick={(q) => (change && !change.marked && q ? p.onPick(c.id, dropPlace(change, q.x)) : p.onPick(c.id))}
            // anywhere over the ladder counts (a child's drop is not precise)
            inZone={(q) => Math.abs(q.x - LADDER_CX) < RUNG_W * 0.8 && Math.abs(q.y - rungY) < 150}
            demo={p.demo?.id === c.id ? { t: p.demo.t, dx: (change ? rungPlaceX(change) : LADDER_CX) - PLATE_X, dy: rungY - fixY[i] } : undefined}>
            <Plate w={PLATE_W} x={PLATE_X} y={fixY[i]} state={state} testCorrect={c.id === p.correctId}>
              <Glyph text={c.text} px={px(c.text, PLATE_W)} x={PLATE_X} y={fixY[i]} alphabet={alphabet} />
            </Plate>
          </DragPick>
        )
      })}
    </Stage>
  )
}
