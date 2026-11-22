// 3 · Spell ladder: the ladder is built from his right answers. Three plates float by the next empty rung; the one he picks
// flies into place and the wizard climbs onto it. He drags a plate onto the next rung, or taps it.
// On a phone on its side the ladder rises into the top bar's empty middle (layout.ts intoBandView), so all of it is larger;
// the plates stay below the bar.
// The English ladder (word chains): the rung he makes shows the word below in boxes; at the early stages the place that
// changes is marked (a gold box, or an empty gold box where a letter comes in: lip → slip), later he finds it.
import { useState } from 'react'
import { useImages, useWizardArt } from '../../course/CourseContext'
import type { Choice } from '../../logic/rounds'
import { belowBand, intoBandView, STAGE_CONTENT_TOP, viewBoxOf, type FullView } from '../../layout'
import { DragPick } from '../DragPick'
import { Glyph, latinFitPx as fitPx } from '../Glyph'
import { HIT, Plate, PLATE_ASPECT, type PickState } from '../Orb'
import { Stage, toStage, type Dir, type Phase } from './Stage'

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
export const BOX_ROW_W = 2 * (LADDER_CX - WIZ_RIGHT - ROW_AIR)
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

/** the demo hand's fingertip on its plate, from the plate's middle: the plate's top left, clear of its letter */
export const HAND_DX = -130
export const HAND_DY = -(PLATE_W * PLATE_ASPECT) / 2 + 8

/**
 * The stage y of the middle of a plate that hovers over the box row: a lifted plate (a tap), and the demo's plate. It is
 * above the row, clear of it, and below the top bar's band.
 */
export function hoverY(view: FullView | null, built: number, rungs: number): number {
  return hoverPlate(view, built, rungs).y
}

/**
 * The hovering plate (its middle, and its scale). It sits above the box row. Where the room above the row is short (the
 * top rungs: the stage's top, or the top bar's band) it shrinks, down to 0.6; where even that does not fit, it is half
 * size beside the row, on the plates' side (`x`). It never covers the row or the rung below.
 */
export function hoverPlate(view: FullView | null, built: number, rungs: number): { x?: number; y: number; s: number } {
  const half = (PLATE_W * PLATE_ASPECT) / 2
  const row = nextRungY(built, rungs)
  const bottom = row - BOX_H / 2 - 12
  const room = bottom - plateTop(view)
  if (room >= 0.6 * 2 * half) { const s = Math.min(1, room / (2 * half)); return { y: bottom - s * half, s } }
  return { x: LADDER_CX + BOX_ROW_W / 2 + 12 + PLATE_W * 0.25, y: row, s: 0.5 }
}

/** where the part goes on the rung he makes (the demo's hand): its box, or the gap where a box comes in */
export function rungPlaceX(c: RungChange): number {
  if (c.marked) { const { xs } = rungBoxXs(rungBoxes(c).length); return xs[c.at] }
  const { xs, w } = rungBoxXs(c.from.length)
  if (c.grow !== 1) return xs[c.at]
  return c.at === 0 ? xs[0] - w / 2 : c.at >= xs.length ? xs[xs.length - 1] + w / 2 : (xs[c.at - 1] + xs[c.at]) / 2
}

/**
 * What glows on the rung he makes: `cue` the voice names the place now (pulses), `soft` he can answer (a soft pulse), `drag`
 * a plate is held (the row glows), `over` it is over the row (more)
 */
export type RungGlow = 'cue' | 'soft' | 'drag' | 'over'
const GLOW_FILL: Record<RungGlow | 'lift', number> = { cue: 0.3, soft: 0.1, drag: 0.2, over: 0.45, lift: 0.22 }

function MakingRung(p: { change: RungChange; y: number; /** a plate is lifted: the boxes glow and a tap on the row places it */ lifted?: boolean; glow?: RungGlow; onPlace?: (place: number) => void }) {
  const boxes = rungBoxes(p.change)
  const { xs, w } = rungBoxXs(boxes.length)
  const left = xs[0] - w / 2 - BOX_GAP
  const width = xs[xs.length - 1] + w / 2 + BOX_GAP - left
  const gold = boxes.findIndex((b) => b.mark)
  // a marked rung (stages 1-3) glows its gold box while he is asked or can answer; the row glows while he holds a plate
  // (more over it); an unmarked rung has no gold box: its row glows instead
  const held = p.glow === 'drag' || p.glow === 'over'
  const boxGlow = gold >= 0 && (p.glow === 'cue' || p.glow === 'soft') ? p.glow : undefined
  const rowGlow = held ? p.glow : p.lifted ? 'lift' : gold < 0 && (p.glow === 'cue' || p.glow === 'soft') ? p.glow : undefined
  return (
    <g data-making-rung data-marked={p.change.marked ? '1' : '0'} {...(p.lifted ? { 'data-lifted': '' } : {})}>
      {rowGlow && <rect data-row-glow={rowGlow} {...(p.lifted ? { 'data-place-glow': '' } : {})} className={rowGlow === 'cue' || rowGlow === 'soft' ? `d2-cue d2-cue-${rowGlow}` : undefined} x={left - 10} y={p.y - BOX_H / 2 - 10} width={width + 20} height={BOX_H + 20} rx={22} fill="#ffd34d" fillOpacity={GLOW_FILL[rowGlow]} stroke="#ffd34d" strokeOpacity={rowGlow === 'over' ? 1 : 0.8} strokeWidth={rowGlow === 'over' ? 10 : 6} pointerEvents="none" />}
      {boxGlow && <rect data-box-glow={boxGlow} className={`d2-cue d2-cue-${boxGlow}`} x={xs[gold] - w / 2 - 12} y={p.y - BOX_H / 2 - 12} width={w + 24} height={BOX_H + 24} rx={24} fill="#ffd34d" fillOpacity={GLOW_FILL[boxGlow]} stroke="#ffd34d" strokeOpacity={0.9} strokeWidth={6} pointerEvents="none" />}
      {boxes.map((b, i) => (
        <g key={i} data-box={b.text ?? '_'} {...(b.mark ? { 'data-marked-box': '' } : {})}>
          <rect x={xs[i] - w / 2} y={p.y - BOX_H / 2} width={w} height={BOX_H} rx={14} fill="#1b0f3c" fillOpacity={0.55}
            stroke={b.mark ? '#ffd34d' : '#fff6d8'} strokeWidth={b.mark ? 7 : 5} strokeDasharray={b.text === null ? '14 10' : undefined} />
          {/* the marked letter is the one that goes: faded */}
          {b.text !== null && <g opacity={b.mark ? 0.45 : 1}><Glyph text={b.text} px={fitPx(b.text, w, 84)} x={xs[i]} y={p.y} alphabet="latin" /></g>}
        </g>
      ))}
      {/* a lifted plate: a tap on the row (a box, or the gap where one comes in) places it there, as a drop does */}
      {p.lifted && (
        <rect data-place-row x={left} y={p.y - BOX_H / 2} width={width} height={BOX_H} fill="transparent" style={{ cursor: 'pointer' }}
          onPointerUp={(e) => p.onPlace?.(dropPlace(p.change, toStage(e.currentTarget, e.clientX, e.clientY).x))} />
      )}
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
  /** an unmarked rung: the plate a tap lifted above the box row (the boxes glow) */
  lifted?: string
  /** English: what the voice names now: the foot rung, or the place the new letter goes (glows) */
  cue?: 'foot' | 'box'
}) {
  // a plate is held: where the finger is (the box row glows, more when it is over it)
  const [held, setHeld] = useState<{ x: number; y: number } | null>(null)
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
  const rungY0 = nextRungY(p.built.length, p.rungs)
  const over = held && Math.abs(held.y - rungY0) < BOX_H && Math.abs(held.x - LADDER_CX) < BOX_ROW_W / 2
  const glow: RungGlow | undefined = held ? (over ? 'over' : 'drag') : p.cue === 'box' ? 'cue' : can && !p.lifted ? 'soft' : undefined
  return (
    <Stage bg="bg-ground" dir={p.dir} {...(view ? { viewBox: viewBoxOf(view), 'data-into-band': '' } : {})}>
      {images['s-ladder']
        ? <image href={images['s-ladder']} x={b.ladder.x} y={b.ladder.y} width={b.ladder.w} height={b.ladder.h} preserveAspectRatio="none" />
        : <g stroke="#e7b860" strokeWidth={14}><line x1={690} y1={80} x2={690} y2={880} /><line x1={910} y1={80} x2={910} y2={880} /></g>}
      {p.built.map((c, k) => (
        <g key={k} data-rung={k}>
          {p.cue === 'foot' && change && k === p.built.length - 1 && (
            <rect data-cue-glow="foot" className="d2-cue d2-cue-cue" x={LADDER_CX - RUNG_W / 2 - 16} y={RUNG_Y(k) - (RUNG_W * PLATE_ASPECT) / 2 - 16} width={RUNG_W + 32} height={RUNG_W * PLATE_ASPECT + 32} rx={26}
              fill="#ffd34d" fillOpacity={0.3} stroke="#ffd34d" strokeOpacity={0.9} strokeWidth={6} pointerEvents="none" />
          )}
          <Plate w={RUNG_W} x={LADDER_CX} y={RUNG_Y(k)} state="idle" still><Glyph text={c.text} px={px(c.text, RUNG_W)} x={LADDER_CX} y={RUNG_Y(k)} alphabet={alphabet} /></Plate>
        </g>
      ))}
      {change && <MakingRung change={change} y={nextRungY(p.built.length, p.rungs)} lifted={!change.marked && p.lifted !== undefined && can} glow={glow} onPlace={(place) => p.lifted && p.onPick(p.lifted, place)} />}
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
        const lifted = !!change && !change.marked && p.lifted === c.id && can
        const hover = hoverPlate(view, p.built.length, p.rungs)
        const liftY = hover.y
        return (
          <DragPick key={c.id} attrs={{ 'data-plate': c.id }} enabled={can || (p.phase === 'mistake' && state === 'reveal')}
            onDrag={(q) => setHeld(q)}
            onPick={(q) => (change && !change.marked && q ? p.onPick(c.id, dropPlace(change, q.x)) : p.onPick(c.id))}
            // anywhere over the ladder counts (a child's drop is not precise)
            inZone={(q) => Math.abs(q.x - LADDER_CX) < RUNG_W * 0.8 && Math.abs(q.y - rungY) < 150}
            demo={p.demo?.id === c.id ? { t: p.demo.t, dx: (change ? rungPlaceX(change) : LADDER_CX) - PLATE_X, dy: (change ? liftY : rungY) - fixY[i] } : undefined}>
            {/* a tapped plate (unmarked rung) is lifted above the box row; a tap on it puts it back */}
            <g data-lifted={lifted ? '' : undefined}
              transform={lifted ? `translate(${(hover.x ?? LADDER_CX) - PLATE_X} ${hover.y - fixY[i]}) translate(${PLATE_X} ${fixY[i]}) scale(${hover.s}) translate(${-PLATE_X} ${-fixY[i]})` : undefined}>
              <Plate w={PLATE_W} x={PLATE_X} y={fixY[i]} state={state} testCorrect={c.id === p.correctId}>
                <Glyph text={c.text} px={px(c.text, PLATE_W)} x={PLATE_X} y={fixY[i]} alphabet={alphabet} />
              </Plate>
            </g>
          </DragPick>
        )
      })}
    </Stage>
  )
}
