// 8 · The spell book (spec: 2026-11-16 English path, Part 7; both courses): an open book, the word's picture on the page
// where the reading starts (English: the left one), its boxes on the other page, one box per sound unit (a two-letter
// unit is one tile; the Hebrew closing letter is printed faint after the boxes, not a box). He drags the tile of each
// unit into its box, in reading order; the last one casts the spell and the picture comes alive. The policy works in box
// order (policies/spell.ts); this screen places box 0 where the reading starts.
import { useState } from 'react'
import { IMAGES } from '../../assets/images'
import type { SpellView } from '../../controller'
import { DemoHand } from '../DemoHand'
import { DragPick } from '../DragPick'
import { Glyph, latinFitPx, latinOrbPx } from '../Glyph'
import { Orb, type PickState } from '../Orb'
import { Stage, type Dir, type Phase } from './Stage'

/** the open book, its spine in the middle of the stage */
export const BOOK = { x: 100, y: 50, w: 1400, h: 620 }
const SPINE = BOOK.x + BOOK.w / 2
/** a page's margin on each side: the boxes' row is at most a page less its margins */
const PAGE_PAD = 45
export const BOX_Y = 360
export const BOX_H = 150
const BOX_MAX_W = 150
const BOX_GAP = 14
/** the room the faint closing letter takes after the boxes */
const TAIL_W = 80
export const PICTURE_SIZE = 360
export const TILE_Y = 790
export const TILE_SIZE = 140
const TILE_GAP = 26
/** a tile dropped this close to a box goes into it */
const DROP_AIR = 24

/** the middle of the page where the reading starts (the picture's page) and of the other one (the boxes' page) */
const pageMid = (dir: Dir, start: boolean) => ((dir === 'ltr') === start ? BOOK.x + BOOK.w / 4 : SPINE + BOOK.w / 4)

/**
 * The boxes' centres in box order (left to right on ltr, right to left on rtl), their width, and where the faint
 * closing letter goes (after the last box, in reading order).
 */
export function spellBoxes(n: number, dir: Dir, tail: boolean): { xs: number[]; w: number; tailX?: number } {
  const room = BOOK.w / 2 - 2 * PAGE_PAD - (tail ? TAIL_W : 0)
  const w = Math.min(BOX_MAX_W, (room - BOX_GAP * (n - 1)) / n)
  const row = n * w + (n - 1) * BOX_GAP + (tail ? TAIL_W : 0)
  const step = dir === 'ltr' ? 1 : -1
  const start = pageMid(dir, false) - (step * row) / 2
  const xs = Array.from({ length: n }, (_, i) => start + step * (w / 2 + i * (w + BOX_GAP)))
  return { xs, w, ...(tail ? { tailX: start + step * (row - TAIL_W / 2) } : {}) }
}

/** the tiles' centres, in the order given, under the book (from where the reading starts) */
export function spellTileXs(n: number, dir: Dir): number[] {
  const row = n * TILE_SIZE + (n - 1) * TILE_GAP
  const step = dir === 'ltr' ? 1 : -1
  const start = 800 - (step * row) / 2
  return Array.from({ length: n }, (_, i) => start + step * (TILE_SIZE / 2 + i * (TILE_SIZE + TILE_GAP)))
}

/** the open book: its picture when it has one, else two drawn pages and a spine */
function Book() {
  if (IMAGES['s-book']) return <image data-book href={IMAGES['s-book']} x={BOOK.x} y={BOOK.y} width={BOOK.w} height={BOOK.h} preserveAspectRatio="none" />
  return (
    <g data-book="drawn">
      <rect x={BOOK.x - 14} y={BOOK.y - 10} width={BOOK.w + 28} height={BOOK.h + 24} rx={26} fill="#5a2d82" stroke="#2a1145" strokeWidth={8} />
      <rect x={BOOK.x} y={BOOK.y} width={BOOK.w / 2} height={BOOK.h} rx={18} fill="#f6ead0" stroke="#c9b48a" strokeWidth={4} />
      <rect x={SPINE} y={BOOK.y} width={BOOK.w / 2} height={BOOK.h} rx={18} fill="#f6ead0" stroke="#c9b48a" strokeWidth={4} />
      <line x1={SPINE} y1={BOOK.y + 6} x2={SPINE} y2={BOOK.y + BOOK.h - 6} stroke="#a8905f" strokeWidth={6} />
    </g>
  )
}

export function SpellBook(p: {
  view: SpellView; phase: Phase; dir: Dir
  /** after a mistake: he does the right move himself (only the glowing tile moves) */
  fixing?: boolean
  /** he dropped the tile of `unit` into box `box` (box order); a tap drops it into the next empty box */
  onDrop: (unit: string, box: number) => void
  /** test builds: the tile the next box wants */
  correct?: string
}) {
  const v = p.view
  const rd = v.round
  const latin = p.dir === 'ltr'
  const { xs, w, tailX } = spellBoxes(rd.boxes.length, p.dir, !!rd.tail)
  const tileXs = spellTileXs(rd.tiles.length, p.dir)
  const next = v.filled.findIndex((x) => x === null)
  const [demoT, setDemoT] = useState(0)
  const px = (text: string, room: number, max: number) => (latin ? latinFitPx(text, room, max) : Math.min(max, Math.round(room * 0.72)))
  const glyph = (text: string, x: number, y: number, room: number, max: number, glow: 'soft' | 'hit' = 'soft', size = px(text, room, max)) => (
    <Glyph text={text} px={size} x={x} y={y} glow={glow} alphabet={latin ? 'latin' : 'hebrew'} />
  )
  const boxAt = (q: { x: number; y: number }) => {
    if (Math.abs(q.y - BOX_Y) > BOX_H / 2 + DROP_AIR) return -1
    return xs.findIndex((x) => Math.abs(q.x - x) <= w / 2 + DROP_AIR)
  }
  /** a tile is gone once every box of its unit is filled (a repeated unit keeps its tile) */
  const used = (unit: string) => rd.boxes.some((b) => b.unit === unit) && rd.boxes.every((b, i) => b.unit !== unit || v.filled[i] !== null)
  // the demo: the first box's tile moves with the hand to the first box
  const demoTile = v.demo ? rd.tiles.findIndex((x) => x.unit === rd.boxes[0].unit) : -1
  const picX = pageMid(p.dir, true)
  return (
    <Stage bg="bg-ground" dir={p.dir}>
      <Book />
      {rd.picture && (
        <g data-spell-picture data-alive={v.alive || undefined} className={v.alive ? 'd2-spell-alive' : undefined}>
          <image href={rd.picture} x={picX - PICTURE_SIZE / 2} y={BOX_Y - PICTURE_SIZE / 2} width={PICTURE_SIZE} height={PICTURE_SIZE} />
        </g>
      )}
      {rd.boxes.map((b, i) => {
        const filled = v.filled[i]
        const wrong = v.wrong?.box === i ? v.wrong.tile : null
        const shown = filled !== null ? b.text : wrong !== null ? rd.tiles.find((x) => x.unit === wrong)?.text ?? wrong : null
        return (
          <g key={i} data-box={i} data-filled={filled ?? undefined} data-wrong={wrong ?? undefined}>
            <rect x={xs[i] - w / 2} y={BOX_Y - BOX_H / 2} width={w} height={BOX_H} rx={16} fill="#1b0f3c" fillOpacity={filled !== null ? 0.75 : 0.45}
              stroke={wrong !== null ? '#ff4d6a' : i === next ? '#ffd34d' : '#3a2a6a'} strokeWidth={6} strokeDasharray={filled === null && wrong === null ? '16 10' : undefined} />
            {shown !== null && glyph(shown, xs[i], BOX_Y, w, 110, v.alive ? 'hit' : 'soft')}
          </g>
        )
      })}
      {rd.tail && tailX !== undefined && (
        <g data-tail opacity={0.35}>{glyph(rd.tail, tailX, BOX_Y, TAIL_W, 100)}</g>
      )}
      {rd.tiles.map((c, i) => {
        if (used(c.unit) || v.wrong?.tile === c.unit) return null
        const glow = v.glow === c.unit
        const state: PickState = glow ? 'reveal' : p.phase === 'answer' || p.phase === 'mistake' ? 'idle' : 'off'
        const enabled = p.phase === 'answer' || (p.phase === 'mistake' && !!p.fixing && glow)
        const demo = i === demoTile ? { t: demoT, dx: xs[0] - tileXs[i], dy: BOX_Y - TILE_Y } : undefined
        return (
          <DragPick key={`${c.unit}-${i}`} attrs={{ 'data-tile': c.unit, ...(p.correct === c.unit ? { 'data-correct-orb': '1' } : {}) }} enabled={enabled} demo={demo}
            inZone={(q) => boxAt(q) >= 0} onPick={(q) => { const box = q ? boxAt(q) : next; if (box >= 0) p.onDrop(c.unit, box) }}>
            <Orb size={TILE_SIZE} x={tileXs[i]} y={TILE_Y} state={state} testCorrect={p.correct === c.unit}>
              {glyph(c.text, tileXs[i], TILE_Y, TILE_SIZE, 96, 'soft', latin ? latinOrbPx(c.text, TILE_SIZE, 96) : undefined)}
            </Orb>
          </DragPick>
        )
      })}
      {demoTile >= 0 && <DemoHand from={{ x: tileXs[demoTile], y: TILE_Y }} to={{ x: xs[0], y: BOX_Y }} durationMs={1800} onMove={setDemoT} onDone={() => {}} loop />}
    </Stage>
  )
}
