// The hint card of a word that blends (English, design Part 5): the word in Andika, its units lit one after another as
// the voice says it (the run lights them at each plan time, from the voice's real start), a spark under the unit lit
// last, and one line under a two-letter unit (sh, ck, ee: one sound). Drawn over the screen; it never takes a touch.
import type { BlendPart } from '../course/types'
import { GlyphDefs } from './Glyph'
import { measureText } from '../../english/measure'

/** the card: the same place as the Hebrew hint card */
const CARD = { x: 480, y: 110, w: 640, h: 300 }

export function BlendWord({ parts, lit }: { parts: BlendPart[]; lit: number[] }) {
  // the word's measured width at 1 px sets the size: at most 0.8 of the card
  const em = parts.reduce((n, p) => n + measureText(p.text, 1), 0)
  const px = Math.min(150, Math.floor((CARD.w * 0.8) / Math.max(0.5, em)))
  const cx = CARD.x + CARD.w / 2
  const y = CARD.y + CARD.h * 0.6
  let x = cx - (em * px) / 2
  const on = new Set(lit)
  const last = lit[lit.length - 1]
  const placed = parts.map((p) => { const at = x; const w = measureText(p.text, px); x += w; return { ...p, x: at, w } })
  const sparkAt = last === undefined ? null : placed.filter((p) => p.unit === last)
  return (
    <svg className="d2-hint-card" data-blend viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <GlyphDefs />
      <rect x={CARD.x} y={CARD.y} width={CARD.w} height={CARD.h} rx={40} fill="#160a35" stroke="#ffd34d" strokeWidth={5} opacity={0.94} />
      {placed.map((p, i) => (
        <g key={i} data-part={p.unit} data-lit={on.has(p.unit) || undefined}>
          <text x={p.x + p.w / 2} y={y} fontSize={px} textAnchor="middle" direction="ltr"
            style={{
              fontFamily: 'Andika, system-ui, sans-serif', stroke: '#1b0f3c', strokeWidth: Math.max(2, px * 0.05), paintOrder: 'stroke',
              fill: on.has(p.unit) ? '#ffffff' : '#fff6d8', opacity: on.has(p.unit) ? 1 : 0.45,
              filter: on.has(p.unit) ? 'url(#d2-glow-hit)' : undefined,
            }}>
            {p.text}
          </text>
          {p.text.length === 2 && <line data-pair x1={p.x + px * 0.08} x2={p.x + p.w - px * 0.08} y1={y + px * 0.22} y2={y + px * 0.22} stroke="#ffd34d" strokeWidth={6} strokeLinecap="round" />}
        </g>
      ))}
      {sparkAt?.length ? <circle data-spark cx={sparkAt[0].x + sparkAt[0].w / 2} cy={y + px * 0.42} r={12} fill="#ffd34d" filter="url(#d2-glow)" /> : null}
    </svg>
  )
}
