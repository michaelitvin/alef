// A learning glyph (letter, syllable, word) as SVG text in Sigalit, centered on (x, y) by its ink — the letter and its
// marks — not by its line box (rule; a syllable with a mark below sat too high in the mockups). Measured after the font
// loads; until then (or with no canvas) it centers by the line box.
import { useEffect, useMemo, useState } from 'react'
import { inkEm, measureText } from '../../shared/latinMeasure'
import { LATIN_TEXT } from '../../shared/latinText'

export interface InkBox { left: number; right: number; ascent: number; descent: number; /** advance width */ width?: number }
export type Measurer = (text: string, px: number) => InkBox | null
/** Hebrew (Sigalit, right to left, with nikkud) or Latin (Andika, left to right). Not `Script`: that means print or hand (data/strokes.ts). */
export type Alphabet = 'hebrew' | 'latin'

/** the size of a Latin `text` on a plate, box or sign `w` wide: at most `px`, small enough that its measured width (Andika's table) is at most 0.8 of `w` */
export const latinFitPx = (text: string, w: number, px: number) => Math.min(px, Math.floor((w * 0.8) / Math.max(0.5, measureText(text, 1))))

/** the orb sprite's gold ring (s-orb): its inner edge is this share of the orb's size from the centre */
export const ORB_RING_IN = 0.41
/** a Latin text's ink keeps inside this circle (a share of the orb's size): a little room inside the ring */
const ORB_TEXT_R = 0.38
/** the glyph's outline width per px (Glyph: strokeWidth 0.05 px) */
const OUTLINE_EM = 0.05
/**
 * The size of a Latin `text` in an orb `size` wide: at most `px`, small enough that every corner of its ink box (Andika's
 * advance width and ink height, centred on the orb as Glyph centres it, plus half the outline) stays inside the gold ring.
 * A share of the orb's width is not enough: the ring's inside is a circle of 0.82 of the sprite, and a word's top and
 * bottom corners reach out further than its middle.
 */
export function latinOrbPx(text: string, size: number, px: number): number {
  const ink = inkEm(text)
  const half = { w: Math.max(0.25, measureText(text, 1)) / 2 + OUTLINE_EM / 2, h: (ink.top + ink.bottom) / 2 + OUTLINE_EM / 2 }
  return Math.min(px, Math.floor((size * ORB_TEXT_R) / Math.hypot(half.w, half.h)))
}

/** a round box of diameter `d` (where an orb goes): a Latin text's ink keeps inside its ring, less the ring's stroke */
export const latinRingPx = (text: string, d: number, px: number) => latinOrbPx(text, (d / 2 - 4) / ORB_TEXT_R, px)

let ctx: CanvasRenderingContext2D | null | undefined
export const canvasMeasurer = (text: string, px: number, alphabet: Alphabet = 'hebrew'): InkBox | null => {
  if (ctx === undefined) {
    try { ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null } catch { ctx = null }
  }
  if (!ctx) return null
  ctx.font = `${px}px ${alphabet === 'latin' ? 'Andika' : 'Sigalit'}`
  ctx.direction = alphabet === 'latin' ? 'ltr' : 'rtl'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const m = ctx.measureText(text)
  if (!m || m.actualBoundingBoxAscent === undefined) return null
  return { left: m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent, width: m.width }
}

/** Offset of the text anchor (centre, baseline) that puts the ink box's centre on the target point. */
export function inkOffset(box: InkBox | null, px: number): { dx: number; dy: number } {
  if (!box) return { dx: 0, dy: 0.35 * px }
  return { dx: -(box.right - box.left) / 2, dy: -(box.descent - box.ascent) / 2 }
}

const SHIN_DOT = '\u05C1'
const SIN_DOT = '\u05C2'
const DAGESH = '\u05BC'
const MARK = /[\u0591-\u05C7]/
/**
 * Where our own dagesh goes in ב כ פ: the open middle of the letter, as fractions of the letter's ink box (x from its left
 * edge, y up from the baseline in ascents). Measured on Sigalit at 200 px (spec 2026-11-07: the font puts פּ's dagesh in the
 * curl, where it looks like part of the letter).
 */
const DAGESH_AT: Record<string, { x: number; y: number }> = {
  'ב': { x: 0.4, y: 0.5 },
  'כ': { x: 0.43, y: 0.5 },
  'פ': { x: 0.45, y: 0.29 },
}
interface DrawnDot { dx: number; dy: number; r: number; kind: 'shin' | 'dagesh' }

/**
 * Dots the game draws itself, apart from the font: (1) Sigalit fuses the shin dot into the top of ש's right arm, so שׁ looked
 * like another letter (ن; the parent: "inconsistent font"): ש is drawn without its dot and our dot sits just above the right
 * arm (שׁ) or the left arm (שׂ). (2) The dagesh of בּ כּ פּ goes in the open middle of the letter, bigger than the font's
 * (on an orb פּ and פ looked the same). The shuruk's dot and any other dagesh stay in the text.
 * Returns the text without those dots and each dot's place: x from the anchor (text centre), y from the baseline.
 */
export function drawnDots(text: string, px: number, measure: Measurer): { text: string; dots: DrawnDot[] } | null {
  const has = text.includes(SHIN_DOT) || text.includes(SIN_DOT) || [...text].some((c, i) => c === DAGESH && dageshBase(text, i) !== null)
  if (!has) return null
  // the text without the drawn dots, and for each letter that gets one: its index in that text and the dot's kind
  let plain = ''
  const marks: { at: number; base: string; kind: 'right' | 'left' | 'dagesh' }[] = []
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (!MARK.test(c)) {
      let j = i + 1
      let side: 'right' | 'left' | null = null
      let dagesh = false
      while (j < text.length && MARK.test(text[j])) {
        if (c === 'ש' && text[j] === SHIN_DOT) side = 'right'
        if (c === 'ש' && text[j] === SIN_DOT) side = 'left'
        if (text[j] === DAGESH && c in DAGESH_AT) dagesh = true
        j++
      }
      if (side) marks.push({ at: plain.length, base: c, kind: side })
      if (dagesh) marks.push({ at: plain.length, base: c, kind: 'dagesh' })
    }
    const drop = (c === SHIN_DOT || c === SIN_DOT) && dotOnShin(text, i) || (c === DAGESH && dageshBase(text, i) !== null)
    if (!drop) plain += c
  }
  const total = measure(plain, px)
  if (!total?.width) return null
  const dots: DrawnDot[] = []
  for (const m of marks) {
    const letter = measure(m.base, px)
    if (!letter) return null
    const before = measure(plain.slice(0, m.at), px)?.width ?? 0
    const withIt = measure(plain.slice(0, m.at + 1), px)?.width ?? before
    // right to left from the right edge of the line (the anchor is its centre)
    const xR = total.width / 2 - before
    const xL = total.width / 2 - withIt
    const w = xR - xL
    if (m.kind === 'dagesh') {
      // the letter's ink box, from its own advance centre
      const centre = (xL + xR) / 2
      const f = DAGESH_AT[m.base]
      const inkLeft = centre - letter.left
      dots.push({ dx: inkLeft + f.x * (letter.left + letter.right), dy: -f.y * letter.ascent, r: 0.06 * px, kind: 'dagesh' })
    } else dots.push({ dx: m.kind === 'right' ? xL + 0.88 * w : xL + 0.12 * w, dy: -letter.ascent - 0.2 * px, r: 0.065 * px, kind: 'shin' })
  }
  return { text: plain, dots }
}
/** the base letter of a dagesh at `i` when it is one we draw (ב כ פ), else null */
function dageshBase(text: string, i: number): string | null {
  let j = i - 1
  while (j >= 0 && MARK.test(text[j])) j--
  return j >= 0 && text[j] in DAGESH_AT ? text[j] : null
}
function dotOnShin(text: string, i: number): boolean {
  let j = i - 1
  while (j >= 0 && MARK.test(text[j])) j--
  return j >= 0 && text[j] === 'ש'
}

let fontsReady = false
const fontWaiters = new Set<() => void>()
if (typeof document !== 'undefined' && document.fonts?.ready)
  void document.fonts.ready.then(() => { fontsReady = true; fontWaiters.forEach((f) => f()) })

export function Glyph(p: {
  text: string; px: number; x: number; y: number; dim?: boolean; glow?: 'none' | 'soft' | 'hit'; measurer?: Measurer; className?: string
  /** the whole word this syllable belongs to: its ink sets the height, so all its syllables share one baseline */
  lineOf?: string
  alphabet?: Alphabet
}) {
  const latin = p.alphabet === 'latin'
  const measure = useMemo<Measurer>(() => p.measurer ?? ((text, px) => canvasMeasurer(text, px, p.alphabet)), [p.measurer, p.alphabet])
  const [tick, setTick] = useState(fontsReady ? 1 : 0)
  useEffect(() => {
    if (fontsReady) return
    const f = () => setTick((t) => t + 1)
    fontWaiters.add(f)
    return () => { fontWaiters.delete(f) }
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `tick` re-measures once the fonts load
  const shin = useMemo(() => (latin ? null : drawnDots(p.text, p.px, measure)), [latin, measure, p.text, p.px, tick])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `tick` re-measures once the fonts load
  const { dx } = useMemo(() => inkOffset(measure(p.text, p.px), p.px), [measure, p.text, p.px, tick])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `tick` re-measures once the fonts load
  const { dy } = useMemo(() => inkOffset(measure(p.lineOf ?? p.text, p.px), p.px), [measure, p.text, p.lineOf, p.px, tick])
  const glow = p.glow ?? 'soft'
  const paint = {
    stroke: '#1b0f3c', strokeWidth: Math.max(2, p.px * 0.05), paintOrder: 'stroke' as const,
    fill: glow === 'hit' ? '#ffffff' : '#fff6d8', opacity: p.dim ? 0.35 : 1,
    filter: p.dim || glow === 'none' ? undefined : glow === 'hit' ? 'url(#d2-glow-hit)' : 'url(#d2-glow)',
  }
  const t = (
    <text
      data-glyph
      className={latin ? (p.className ? `${p.className} latin` : 'latin') : shin ? undefined : p.className}
      x={p.x + dx}
      y={p.y + dy}
      fontSize={p.px}
      textAnchor="middle"
      direction={latin ? 'ltr' : 'rtl'}
      style={{
        fontFamily: latin ? 'Andika, system-ui, sans-serif' : 'Sigalit, "Noto Sans Hebrew", serif', unicodeBidi: 'isolate',
        // Latin letters each on their own (no ff or fi ligature); Hebrew's text is as before
        ...(latin ? LATIN_TEXT : {}),
        // a dark outline under the fill, so the marks show on the light shine of an orb (Michael: the cholam dot vanished)
        stroke: '#1b0f3c', strokeWidth: Math.max(2, p.px * 0.05), paintOrder: 'stroke', strokeLinejoin: 'round',
        fill: glow === 'hit' ? '#ffffff' : '#fff6d8', opacity: p.dim ? 0.35 : 1,
        filter: p.dim || glow === 'none' ? undefined : glow === 'hit' ? 'url(#d2-glow-hit)' : 'url(#d2-glow)',
      }}
    >
      {shin ? shin.text : p.text}
    </text>
  )
  if (!shin) return t
  return (
    <g data-glyph-group className={p.className}>
      {t}
      {shin.dots.map((d, i) => <circle key={i} {...(d.kind === 'shin' ? { 'data-shin-dot': '' } : { 'data-dagesh': '' })} cx={p.x + dx + d.dx} cy={p.y + dy + d.dy} r={d.r} style={paint} />)}
    </g>
  )
}

/** The SVG filters the glyphs use; render once inside each stage's <svg>. */
export function GlyphDefs() {
  return (
    <defs>
      <filter id="d2-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="5" result="b" /><feFlood floodColor="#ffd34d" floodOpacity="0.8" />
        <feComposite in2="b" operator="in" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="d2-glow-hit" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="9" result="b" /><feFlood floodColor="#ffc83c" />
        <feComposite in2="b" operator="in" /><feMerge><feMergeNode /><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  )
}
