// Where the drawing screen puts things (stage units, 1600×900), shared by the controller (it judges in the slot's
// normalized units) and the screen (it draws). The word sits on writing lines, right to left: the framed slot for its
// first letter, then (when the first vowel sits on a vav) the bare vav, then the rest of the word, all at one size.
// Parts are placed by their measured widths (rule), and the size shrinks until the longest word fits.
import type { LetterDef, Pt, Script } from '../data/strokes'
import { pathLength } from './recognizer'

export const DRAW_FONT: Record<Script, string> = { print: 'Sigalit', hand: "'Ktav Yad'" }
/** the board (dark slate) and the picture beside it; kept clear of the top bar at phone size */
export const BOARD = { left: 40, right: 1250, top: 175, bottom: 885 }
export const PIC = { x: 1425, y: 470, size: 290 }
const U_MAX = 290
const PAD = 0.18
/** the gap between the slot and the rest of the word (letter units) */
const GAP = 0.28

export type TextMeasure = (text: string, font: string, px: number) => { width: number; ascent: number; descent: number } | null
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
const FALLBACK = { print: { ratio: 0.6 }, hand: { ratio: 0.36 } }

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

export const toNorm = (L: DrawLayout, [x, y]: Pt): Pt => [(x - L.x0) / L.u, (y - L.top) / L.u]
export const toStagePt = (L: DrawLayout, [x, y]: Pt): Pt => [L.x0 + x * L.u, L.top + y * L.u]

/** The hand's pace: each stroke takes time by its length; a tap is a short press. Shared by the screen and the controller. */
export const STROKE_GAP_MS = 260
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
