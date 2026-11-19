// Where the drawing screen puts things (stage units, 1600×900), shared by the controller (it judges in the slot's
// normalized units) and the screen (it draws). The word sits on writing lines, right to left: the framed slot for its
// first letter, then (when the first vowel sits on a vav) the bare vav, then the rest of the word, all at one size.
// Parts are placed by their measured widths (rule), and the size shrinks until the longest word fits.
import type { LetterDef, Pt, Script } from '../data/strokes'
import { pathLength } from './recognizer'

/** the scripts' fonts: handwriting words are written in the upright school font Dana Yad (the parent chose its forms) */
export const DRAW_FONT: Record<Script, string> = { print: 'Sigalit', hand: "'Dana Yad'" }
/** the board (dark slate) and the picture beside it; kept clear of the top bar at phone size */
export const BOARD = { left: 40, right: 1250, top: 175, bottom: 885 }
export const PIC = { x: 1425, y: 470, size: 290 }
/** the spell book's written words: the board on its two open pages (inside SpellBook's BOOK, with its margins) */
export const SPELL_BOARD = { left: 150, right: 1450, top: 95, bottom: 630 }
const U_MAX = 290
const PAD = 0.18
/** the gap between the slot and the rest of the word (letter units) */
const GAP = 0.28

type TextMeasure = (text: string, font: string, px: number) => { width: number; ascent: number; descent: number } | null
let ctx: CanvasRenderingContext2D | null | undefined
export const canvasTextMeasure: TextMeasure = (text, font, px) => {
  if (ctx === undefined) {
    try { ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null } catch { ctx = null }
  }
  if (!ctx || !text) return null
  ctx.font = `${px}px ${font}`
  ctx.direction = 'rtl'
  const m = ctx.measureText(text)
  if (!m || m.actualBoundingBoxAscent === undefined || !m.width) return null
  return { width: m.width, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent }
}
/** the height of ב (top line to baseline) per pixel of font size, when nothing can be measured (tests) */
const FALLBACK = { print: { ratio: 0.6 }, hand: { ratio: 0.39 } }

export interface DrawLayout {
  script: Script
  /** stage units per letter unit (top line to baseline) */
  u: number
  /** the slot letter's origin (its box's left edge) and the top line */
  x0: number
  top: number
  lines: { top: number; mid: number; base: number; below: number; left: number; right: number }
  slot: { left: number; right: number; top: number; bottom: number }
  /** the rest of the word: its text, centre x, font size and family */
  rest: { text: string; cx: number; px: number; font: string }
  /** the bare vav the first vowel sits on: its centre (stage) and its box in letter units */
  vav?: { cx: number; box: { left: number; right: number; top: number; bottom: number } }
  /** the Latin board (four lines: the top line, the dashed middle line, the baseline, the descender line) */
  alphabet?: 'latin'
  /** Latin: the letters' boxes, left to right (`slot` is the first); `dx`: its letter's origin from `x0`, in letter units */
  boxes?: { left: number; right: number; top: number; bottom: number; dx: number }[]
  /** Latin: the word's text before the boxes (x is the last letter of its word), at `rest`'s size and font */
  before?: { text: string; cx: number }
}

export function drawLayout(p: { letter: string; vav: boolean; rest: string; script: Script; def: LetterDef; marksAbove: boolean; marksUnder: boolean }, measure: TextMeasure = canvasTextMeasure): DrawLayout {
  const font = DRAW_FONT[p.script]
  const probe = measure('ב', font, 100)
  const ratio = probe ? probe.ascent / 100 : FALLBACK[p.script].ratio
  // all sizes in letter units (1 = top line to baseline), measured at a reference size
  const pxPerU = 1 / ratio
  const unit = (t: string) => {
    const m = measure(t, font, 100)
    const n = [...t].filter((ch) => /[א-ת]/.test(ch)).length
    return m ? { w: m.width / 100 * pxPerU, up: m.ascent / 100 * pxPerU, down: m.descent / 100 * pxPerU } : { w: n * 0.75, up: 1, down: 0 }
  }
  const rest = p.rest ? unit(p.rest) : { w: 0, up: 1, down: 0 }
  const vav = p.vav ? unit('ו') : null
  const pts = p.def.variants.flatMap((v) => v.flatMap((s) => s.pts))
  const defTop = Math.min(...pts.map((q) => q[1]))
  const defBottom = Math.max(...pts.map((q) => q[1]))
  const slotW = Math.max(p.def.w, 0.9) + 2 * PAD
  // the room the lines block needs: the letter's ascender/descender, the rest's, the marks, the line below
  const below = p.script === 'hand' ? 1.25 : 0.5
  const needTop = Math.min(-0.3, defTop - PAD, 1 - rest.up - 0.1, 1 - (vav?.up ?? 1) - 0.1) - (p.marksAbove ? 0.4 : 0)
  const needBottom = Math.max(1 + below + 0.1, defBottom + PAD, 1 + rest.down + 0.1) + (p.marksUnder ? 0.45 : 0)
  const totalW = slotW + (p.rest || vav ? GAP : 0) + (vav ? vav.w + 0.06 : 0) + rest.w
  const bw = BOARD.right - BOARD.left - 60
  const bh = BOARD.bottom - BOARD.top - 30
  const u = Math.min(U_MAX, bh / (needBottom - needTop), bw / totalW)
  const top = (BOARD.top + BOARD.bottom) / 2 - ((needTop + needBottom) / 2) * u
  const cx = (BOARD.left + BOARD.right) / 2
  const right = cx + (totalW * u) / 2
  const slot = { left: right - slotW * u, right, top: top + (needTop + 0.08) * u, bottom: top + (needBottom - 0.08) * u }
  const x0 = slot.left + ((slotW - p.def.w) / 2) * u
  let edge = slot.left - GAP * u
  let vavOut: DrawLayout['vav']
  if (vav) {
    const vcx = edge - (vav.w * u) / 2
    vavOut = { cx: vcx, box: { left: (edge - vav.w * u - x0) / u, right: (edge - x0) / u, top: 0, bottom: 1 } }
    edge -= (vav.w + 0.06) * u
  }
  return {
    script: p.script, u, x0, top,
    lines: { top, mid: top + 0.5 * u, base: top + u, below: top + (1 + below) * u, left: BOARD.left + 20, right: BOARD.right - 20 },
    slot,
    rest: { text: p.rest, cx: edge - (rest.w * u) / 2, px: u * pxPerU, font },
    ...(vavOut ? { vav: vavOut } : {}),
  }
}

/** a Latin letter's box is at least this wide (letter units, its padding aside): i and l are thin */
const LATIN_MIN_W = 0.5
/** the gap between two boxes of a word (letter units) */
const BOX_GAP = 0.14

/**
 * The Latin board (left to right): the word's text before the boxes (`before`), the boxes of the letters he writes (one,
 * qu's two, or a whole word's), then the rest of the word (`rest`). Four lines at the course's heights; for a capital the top line is at the capitals' top (they stop short
 * of the ascender: on school paper they touch the top line). `em`: a text's width in em; one letter unit is `unitEm` em.
 * The spell book's written words use the same board on its pages (`board`: SPELL_BOARD).
 */
export function latinLayout(p: {
  defs: LetterDef[]; rest: string; before?: string; capital: boolean; font: string; unitEm: number; em: (text: string) => number
  lines: { top: number; mid: number; base: number; desc: number; cap: number }
  /** where the board is (default: the drawing screen's BOARD) */
  board?: { left: number; right: number; top: number; bottom: number }
}): DrawLayout {
  const B = p.board ?? BOARD
  const pts = p.defs.flatMap((d) => d.variants.flatMap((v) => v.flatMap((st) => st.pts)))
  const defTop = Math.min(...pts.map((q) => q[1]))
  const defBottom = Math.max(...pts.map((q) => q[1]))
  const widths = p.defs.map((d) => Math.max(d.w, LATIN_MIN_W) + 2 * PAD)
  const restW = p.rest ? p.em(p.rest) / p.unitEm : 0
  const beforeW = p.before ? p.em(p.before) / p.unitEm : 0
  const needTop = Math.min(p.lines.top - 0.15, defTop - PAD)
  const needBottom = Math.max(p.lines.desc + 0.1, defBottom + PAD)
  const totalW = widths.reduce((a, w) => a + w, 0) + BOX_GAP * (widths.length - 1) + (p.rest ? GAP + restW : 0) + (p.before ? beforeW + GAP : 0)
  const bw = B.right - B.left - 60
  const bh = B.bottom - B.top - 30
  const u = Math.min(U_MAX, bh / (needBottom - needTop), bw / totalW)
  const top = (B.top + B.bottom) / 2 - ((needTop + needBottom) / 2) * u
  const cx = (B.left + B.right) / 2
  let edge = cx - (totalW * u) / 2
  const beforeCx = edge + (beforeW * u) / 2
  if (p.before) edge += (beforeW + GAP) * u
  const sTop = top + (needTop + 0.08) * u
  const sBottom = top + (needBottom - 0.08) * u
  const origins: number[] = []
  const rects = widths.map((w, i) => {
    const r = { left: edge, right: edge + w * u, top: sTop, bottom: sBottom }
    origins.push(edge + ((w - p.defs[i].w) / 2) * u)
    edge += (w + BOX_GAP) * u
    return r
  })
  const x0 = origins[0]
  const boxes = rects.map((r, i) => ({ ...r, dx: (origins[i] - x0) / u }))
  const restLeft = rects[rects.length - 1].right + GAP * u
  const y = (v: number) => top + v * u
  return {
    script: 'print', u, x0, top, alphabet: 'latin',
    lines: { top: y(p.capital ? p.lines.cap : p.lines.top), mid: y(p.lines.mid), base: y(p.lines.base), below: y(p.lines.desc), left: B.left + 20, right: B.right - 20 },
    slot: rects[0], boxes,
    rest: { text: p.rest, cx: restLeft + (restW * u) / 2, px: u / p.unitEm, font: p.font },
    ...(p.before ? { before: { text: p.before, cx: beforeCx } } : {}),
  }
}

export const toNorm = (L: DrawLayout, [x, y]: Pt): Pt => [(x - L.x0) / L.u, (y - L.top) / L.u]
export const toStagePt = (L: DrawLayout, [x, y]: Pt): Pt => [L.x0 + x * L.u, L.top + y * L.u]

/** The hand's pace: each stroke takes time by its length; a tap is a short press. Shared by the screen and the controller. */
const STROKE_GAP_MS = 260
export const DEMO_FADE_MS = 500
export function strokeTiming(strokes: Pt[][]): { start: number[]; dur: number[]; total: number } {
  const start: number[] = []
  const dur: number[] = []
  let t = 300
  for (const s of strokes) {
    const d = s.length < 2 || pathLength(s) < 0.02 ? 450 : 380 + 650 * pathLength(s)
    start.push(t)
    dur.push(d)
    t += d + STROKE_GAP_MS
  }
  return { start, dur, total: t + DEMO_FADE_MS }
}
