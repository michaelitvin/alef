// A learning glyph (letter, syllable, word) as SVG text in Sigalit, centered on (x, y) by its ink — the letter and its
// marks — not by its line box (rule; a syllable with a mark below sat too high in the mockups). Measured after the font
// loads; until then (or with no canvas) it centers by the line box.
import { useEffect, useMemo, useState } from 'react'

export interface InkBox { left: number; right: number; ascent: number; descent: number; /** advance width */ width?: number }
export type Measurer = (text: string, px: number) => InkBox | null

let ctx: CanvasRenderingContext2D | null | undefined
export const canvasMeasurer: Measurer = (text, px) => {
  if (ctx === undefined) {
    try { ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null } catch { ctx = null }
  }
  if (!ctx) return null
  ctx.font = `${px}px Sigalit`
  ctx.direction = 'rtl'
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
const MARK = /[\u0591-\u05C7]/

/**
 * Sigalit fuses the shin dot into the top of ש's right arm, so שׁ looked like another letter (ن; the parent: "inconsistent
 * font"). Draw ש without its dot and put our own dot just above the right arm (שׁ) or the left arm (שׂ), clearly apart.
 * Returns the text without the dots and, for each dotted ש, its place: x from the anchor (text centre), y from the baseline.
 */
export function shinDots(text: string, px: number, measure: Measurer): { text: string; dots: { dx: number; dy: number; r: number }[] } | null {
  if (!text.includes(SHIN_DOT) && !text.includes(SIN_DOT)) return null
  const plain = text.replace(/[\u05C1\u05C2]/g, '')
  const total = measure(plain, px)
  const letter = measure('ש', px)
  if (!total?.width || !letter) return null
  const dots: { dx: number; dy: number; r: number }[] = []
  let at = 0 // index in `plain`
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === SHIN_DOT || c === SIN_DOT) continue
    if (c === 'ש') {
      let j = i + 1
      let side: 'right' | 'left' | null = null
      while (j < text.length && MARK.test(text[j])) { if (text[j] === SHIN_DOT) side = 'right'; if (text[j] === SIN_DOT) side = 'left'; j++ }
      if (side) {
        const before = measure(plain.slice(0, at), px)?.width ?? 0
        const withIt = measure(plain.slice(0, at + 1), px)?.width ?? before
        // right to left from the right edge of the line (the anchor is its centre)
        const xR = total.width / 2 - before
        const xL = total.width / 2 - withIt
        const w = xR - xL
        dots.push({ dx: side === 'right' ? xL + 0.88 * w : xL + 0.12 * w, dy: -letter.ascent - 0.2 * px, r: 0.065 * px })
      }
    }
    at++
  }
  return { text: plain, dots }
}

let fontsReady = false
const fontWaiters = new Set<() => void>()
if (typeof document !== 'undefined' && document.fonts?.ready)
  void document.fonts.ready.then(() => { fontsReady = true; fontWaiters.forEach((f) => f()) })

export function Glyph(p: {
  text: string; px: number; x: number; y: number; dim?: boolean; glow?: 'none' | 'soft' | 'hit'; measurer?: Measurer; className?: string
  /** the whole word this syllable belongs to: its ink sets the height, so all its syllables share one baseline */
  lineOf?: string
}) {
  const measure = p.measurer ?? canvasMeasurer
  const [tick, setTick] = useState(fontsReady ? 1 : 0)
  useEffect(() => {
    if (fontsReady) return
    const f = () => setTick((t) => t + 1)
    fontWaiters.add(f)
    return () => { fontWaiters.delete(f) }
  }, [])
  const shin = useMemo(() => shinDots(p.text, p.px, measure), [measure, p.text, p.px, tick])
  const { dx } = useMemo(() => inkOffset(measure(p.text, p.px), p.px), [measure, p.text, p.px, tick])
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
      className={shin ? undefined : p.className}
      x={p.x + dx}
      y={p.y + dy}
      fontSize={p.px}
      textAnchor="middle"
      direction="rtl"
      style={{
        fontFamily: 'Sigalit, "Noto Sans Hebrew", serif', unicodeBidi: 'isolate',
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
      {shin.dots.map((d, i) => <circle key={i} data-shin-dot cx={p.x + dx + d.dx} cy={p.y + dy + d.dy} r={d.r} style={paint} />)}
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
