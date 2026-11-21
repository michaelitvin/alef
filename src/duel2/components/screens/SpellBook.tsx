// 8 · The spell book (spec: 2026-11-16 English path, Part 7; both courses): an open book, the word's picture on the page
// where the reading starts (English: the left one), its boxes on the other page, one box per sound unit (a two-letter
// unit is one tile; the Hebrew closing letter is printed faint after the boxes, not a box). He drags the tile of each
// unit into its box, in reading order; the last one casts the spell and the picture comes alive. The policy works in box
// order (policies/spell.ts); this screen places box 0 where the reading starts.
// A written word (English, stage 4 on): no tiles and no picture; the four lines across both pages, a box for each letter,
// left to right, and the faint tail e after them. He writes each letter in its box from its start dot; his strokes turn
// gold as they are right, and the glowing hand shows a letter (the demo, the hint, after a mistake).
import { useState } from 'react'
import type { SpellView } from '../../controller'
import { useCourse, useImages } from '../../course/CourseContext'
import type { Pt } from '../../data/strokes'
import { SPELL_BOARD, toNorm, toStagePt } from '../../logic/drawLayout'
import { spellLetters } from '../../policies/spellWrite'
import { StrokeAnim } from '../StrokeAnim'
import { InkStrokes, WritingPad, inkWidth } from '../WritingInk'
import { DemoHand } from '../DemoHand'
import { DragPick } from '../DragPick'
import { Glyph, latinFitPx, latinOrbPx } from '../Glyph'
import { Orb, type PickState } from '../Orb'
import { Stage, type Dir, type Phase } from './Stage'

/**
 * Where the book's parts go, in stage units. With the book's picture (the English path's `s-book`, drawn a little wider
 * than it is) the pages are the cream paper of the picture, as fractions of the book; without it (Book 2) they are the two
 * drawn pages, and the old values stay as they were. A written word (English only) has its slate in `SPELL_BOARD`.
 */
export interface BookGeometry {
  /** the open book, its spine in the middle of the stage */
  book: { x: number; y: number; w: number; h: number }
  /** each page's middle, from the book's left edge, as a fraction of its width: the left page, the right page */
  mid: { left: number; right: number }
  /** a page's width as a fraction of the book's, and its margin on each side: the boxes' row is at most a page less its margins */
  pageW: number
  pagePad: number
  boxY: number
}
const PICTURE_BOOK = { x: 40, y: 30, w: 1520, h: 760 }
/** the cream paper of the picture as fractions of the book: the top and the bottom */
const PAPER = { top: 0.07, bottom: 0.65 }
const PICTURE: BookGeometry = {
  book: PICTURE_BOOK, mid: { left: 0.3, right: 0.7 }, pageW: 0.38, pagePad: 20,
  boxY: PICTURE_BOOK.y + PICTURE_BOOK.h * ((PAPER.top + PAPER.bottom) / 2)
}
const DRAWN: BookGeometry = {
  book: { x: 100, y: 50, w: 1400, h: 620 }, mid: { left: 0.25, right: 0.75 }, pageW: 0.5, pagePad: 45, boxY: 360,
}
export const bookGeometry = (hasPicture: boolean): BookGeometry => (hasPicture ? PICTURE : DRAWN)
/** the drawn pages' book and their box row (Book 2) */
export const BOOK = DRAWN.book
export const BOX_Y = DRAWN.boxY
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
const pageMid = (g: BookGeometry, dir: Dir, start: boolean) => g.book.x + g.book.w * ((dir === 'ltr') === start ? g.mid.left : g.mid.right)

/**
 * The boxes' centres in box order (left to right on ltr, right to left on rtl), their width, and where the faint
 * closing letter goes (after the last box, in reading order). `hasPicture`: the book of the picture (the English path).
 */
export function spellBoxes(n: number, dir: Dir, tail: boolean, hasPicture = false): { xs: number[]; w: number; tailX?: number } {
  const g = bookGeometry(hasPicture)
  const room = g.book.w * g.pageW - 2 * g.pagePad - (tail ? TAIL_W : 0)
  const w = Math.min(BOX_MAX_W, (room - BOX_GAP * (n - 1)) / n)
  const row = n * w + (n - 1) * BOX_GAP + (tail ? TAIL_W : 0)
  const step = dir === 'ltr' ? 1 : -1
  const start = pageMid(g, dir, false) - (step * row) / 2
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
function Book({ img }: { img?: string }) {
  const BOOK = bookGeometry(!!img).book
  const SPINE = BOOK.x + BOOK.w / 2
  if (img) return <image data-book href={img} x={BOOK.x} y={BOOK.y} width={BOOK.w} height={BOOK.h} preserveAspectRatio="none" />
  return (
    <g data-book="drawn">
      <rect x={BOOK.x - 14} y={BOOK.y - 10} width={BOOK.w + 28} height={BOOK.h + 24} rx={26} fill="#5a2d82" stroke="#2a1145" strokeWidth={8} />
      <rect x={BOOK.x} y={BOOK.y} width={BOOK.w / 2} height={BOOK.h} rx={18} fill="#f6ead0" stroke="#c9b48a" strokeWidth={4} />
      <rect x={SPINE} y={BOOK.y} width={BOOK.w / 2} height={BOOK.h} rx={18} fill="#f6ead0" stroke="#c9b48a" strokeWidth={4} />
      <line x1={SPINE} y1={BOOK.y + 6} x2={SPINE} y2={BOOK.y + BOOK.h - 6} stroke="#a8905f" strokeWidth={6} />
    </g>
  )
}

/** a written word: the four lines on the book's pages, a box per letter, his strokes, the hand */
function WrittenWord(p: { book: BookGeometry['book']; view: SpellView; can: boolean; onStroke: (pts: Pt[]) => void }) {
  const writing = useCourse().writing
  const v = p.view
  const W = v.write!
  const L = W.layout
  const [down, setDown] = useState(false)
  const ink = inkWidth(L.u)
  const map = (q: Pt) => toStagePt(L, q)
  const boxOf = spellLetters(v.round).map((l) => l.box)
  const now = W.mode === 'letter' && W.at < W.letters.length ? W.at : -1
  const begun = W.strokes.some((x) => x.box === now && !x.mark)
  const boxes = L.boxes ?? [{ ...L.slot, dx: 0 }]
  return (
    <g data-spell-write>
      {/* the drawing screen's slate, on the book's pages: the four lines of school paper (the middle one dashed, the
          descender line faint), a box per letter */}
      <rect data-draw-board x={SPELL_BOARD.left} y={SPELL_BOARD.top} width={SPELL_BOARD.right - SPELL_BOARD.left} height={SPELL_BOARD.bottom - SPELL_BOARD.top} rx={30}
        fill="#160a35" fillOpacity={0.86} stroke="#ffd34d" strokeOpacity={0.55} strokeWidth={5} />
      <g data-lines data-four="" stroke="#fff6d8" strokeLinecap="round">
        <line x1={L.lines.left} x2={L.lines.right} y1={L.lines.top} y2={L.lines.top} strokeWidth={4} strokeOpacity={0.6} />
        <line x1={L.lines.left} x2={L.lines.right} y1={L.lines.mid} y2={L.lines.mid} strokeWidth={3} strokeOpacity={0.45} strokeDasharray="14 16" />
        <line x1={L.lines.left} x2={L.lines.right} y1={L.lines.base} y2={L.lines.base} strokeWidth={5} strokeOpacity={0.6} />
        <line x1={L.lines.left} x2={L.lines.right} y1={L.lines.below} y2={L.lines.below} strokeWidth={3} strokeOpacity={0.22} strokeDasharray="6 12" />
      </g>
      {boxes.map((b, i) => {
        const filled = v.filled[boxOf[i]] !== null
        return <rect key={i} data-write-box={i} data-filled={filled || undefined} x={b.left} y={b.top} width={b.right - b.left} height={b.bottom - b.top} rx={24}
          className={i === now && p.can && !down && !begun ? 'd2-slot-pulse' : undefined}
          fill="#ffd34d" fillOpacity={filled ? 0.12 : 0.06} stroke="#ffd34d" strokeWidth={5} strokeDasharray="22 14"
          strokeOpacity={i === now ? 0.85 : 0.25} />
      })}
      {L.rest.text && (
        <text data-tail x={L.rest.cx} y={L.lines.base} fontSize={L.rest.px} textAnchor="middle" opacity={0.35}
          style={{ fontFamily: `${L.rest.font}, sans-serif`, fill: '#fff6d8' }}>{L.rest.text}</text>
      )}
      {/* the start dot of the letter he writes now, in its box, until he begins it */}
      {writing && now >= 0 && !begun && (() => {
        const [x, y] = writing.strokesOf(W.letters[now]).variants[0][0].pts[0]
        const [cx, cy] = map([x + (boxes[now]?.dx ?? 0), y])
        return <circle data-start-dot cx={cx} cy={cy} r={Math.max(9, L.u * 0.06)} fill="#7dff9a" stroke="#1b0f3c" strokeWidth={3} style={{ pointerEvents: 'none' }} />
      })()}
      <InkStrokes strokes={W.strokes} map={map} width={ink} className={v.alive ? 'd2-drawn' : undefined} />
      {W.demo && <StrokeAnim key={W.demo.id} strokes={W.demo.strokes} map={map} width={ink} handScale={Math.max(0.8, L.u / 260)} />}
      <WritingPad x={p.book.x} y={p.book.y} width={p.book.w} height={p.book.h} can={p.can} ink={ink} onDown={setDown}
        onStroke={(pts) => p.onStroke(pts.map((q) => toNorm(L, q)))} />
    </g>
  )
}

export function SpellBook(p: {
  view: SpellView; phase: Phase; dir: Dir
  /** after a mistake: he does the right move himself (only the glowing tile moves; written: only right strokes count) */
  fixing?: boolean
  /** he dropped the tile of `unit` into box `box` (box order); a tap drops it into the next empty box */
  onDrop: (unit: string, box: number) => void
  /** a written word: his finger lifted (letter units from the first box's origin) */
  onStroke?: (pts: Pt[]) => void
  /** test builds: the tile the next box wants */
  correct?: string
}) {
  const v = p.view
  const img = useImages()['s-book']
  if (v.write) {
    return (
      <Stage bg="bg-ground" dir={p.dir}>
        <Book img={img} />
        <WrittenWord book={bookGeometry(!!img).book} view={v} can={p.phase === 'answer' || (p.phase === 'mistake' && !!p.fixing)} onStroke={(pts) => p.onStroke?.(pts)} />
      </Stage>
    )
  }
  return <TileBook {...p} />
}

type SpellBookProps = Parameters<typeof SpellBook>[0]

/** the tiles' book: the picture, a box per unit, the tiles under the book */
function TileBook(p: SpellBookProps) {
  const img = useImages()['s-book']
  const g = bookGeometry(!!img)
  const BOX_Y = g.boxY
  const v = p.view
  const rd = v.round
  const latin = p.dir === 'ltr'
  const { xs, w, tailX } = spellBoxes(rd.boxes.length, p.dir, !!rd.tail, !!img)
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
  const picX = pageMid(g, p.dir, true)
  return (
    <Stage bg="bg-ground" dir={p.dir}>
      <Book img={img} />
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
