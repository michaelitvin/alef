// A learning glyph (letter, syllable, word) as SVG text in Sigalit, centered on (x, y) by its ink — the letter and its
// marks — not by its line box (rule; a syllable with a mark below sat too high in the mockups). Measured after the font
// loads; until then (or with no canvas) it centers by the line box.
import { useEffect, useMemo, useState } from 'react'

export interface InkBox { left: number; right: number; ascent: number; descent: number }
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
  return { left: m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent }
}

/** Offset of the text anchor (centre, baseline) that puts the ink box's centre on the target point. */
export function inkOffset(box: InkBox | null, px: number): { dx: number; dy: number } {
  if (!box) return { dx: 0, dy: 0.35 * px }
  return { dx: -(box.right - box.left) / 2, dy: -(box.descent - box.ascent) / 2 }
}

let fontsReady = false
const fontWaiters = new Set<() => void>()
if (typeof document !== 'undefined' && document.fonts?.ready)
  void document.fonts.ready.then(() => { fontsReady = true; fontWaiters.forEach((f) => f()) })

export function Glyph(p: {
  text: string; px: number; x: number; y: number; dim?: boolean; glow?: 'none' | 'soft' | 'hit'; measurer?: Measurer; className?: string
}) {
  const measure = p.measurer ?? canvasMeasurer
  const [tick, setTick] = useState(fontsReady ? 1 : 0)
  useEffect(() => {
    if (fontsReady) return
    const f = () => setTick((t) => t + 1)
    fontWaiters.add(f)
    return () => { fontWaiters.delete(f) }
  }, [])
  const { dx, dy } = useMemo(() => inkOffset(measure(p.text, p.px), p.px), [measure, p.text, p.px, tick])
  const glow = p.glow ?? 'soft'
  return (
    <text
      data-glyph
      className={p.className}
      x={p.x + dx}
      y={p.y + dy}
      fontSize={p.px}
      textAnchor="middle"
      direction="rtl"
      style={{
        fontFamily: 'Sigalit, "Noto Sans Hebrew", serif', unicodeBidi: 'isolate',
        fill: glow === 'hit' ? '#ffffff' : '#fff6d8', opacity: p.dim ? 0.35 : 1,
        filter: p.dim || glow === 'none' ? undefined : glow === 'hit' ? 'url(#d2-glow-hit)' : 'url(#d2-glow)',
      }}
    >
      {p.text}
    </text>
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
