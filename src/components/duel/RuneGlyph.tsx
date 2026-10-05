// Nikkud rune glyph: the mark alone on a dotted placeholder (circle or box). Marks are drawn with exact geometry;
// the vav of holam male / shuruk is a drawn shape (fonts vary — a bare bar + dot reads as "i").
import type { DuelMark } from '../../types/duel'

const INK = '#fff6d8'
const GUIDE = 'rgba(255, 236, 190, 0.55)'

function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3.4} fill={INK} />
}

/** The mark alone on a dotted placeholder (circle or box); vav marks add a vav. */
export function RuneGlyph({ mark, box = false, size = 56 }: { mark: DuelMark; box?: boolean; size?: number }) {
  const hasVav = Boolean(mark.vav)
  const cx = hasVav ? 40 : 30 // placeholder shifts right when a vav sits to its left
  const c = 25
  const b = c + 18
  const k = mark.id
  return (
    <svg viewBox={hasVav ? '0 0 64 64' : '0 0 60 64'} width={size} height={size} aria-label={mark.name}>
      <g filter="url(#rune-glow)">
        {box ? (
          <rect x={cx - 13} y={c - 13} width={26} height={26} rx={5} fill="none" stroke={GUIDE} strokeWidth={2} strokeDasharray="4 4" />
        ) : (
          <circle cx={cx} cy={c} r={13} fill="none" stroke={GUIDE} strokeWidth={2} strokeDasharray="4 4" />
        )}
        {(k === 'patach' || k === 'kamatz') && <line x1={cx - 11} x2={cx + 11} y1={b} y2={b} stroke={INK} strokeWidth={3.4} strokeLinecap="round" />}
        {k === 'kamatz' && <line x1={cx} x2={cx} y1={b} y2={b + 10} stroke={INK} strokeWidth={3.4} strokeLinecap="round" />}
        {k === 'tzeire' && (<><Dot x={cx - 6} y={b} /><Dot x={cx + 6} y={b} /></>)}
        {k === 'segol' && (<><Dot x={cx - 7} y={b} /><Dot x={cx + 7} y={b} /><Dot x={cx} y={b + 9} /></>)}
        {k === 'chirik' && <Dot x={cx} y={b} />}
        {k === 'cholam' && <Dot x={cx - 17} y={c - 15} />}
        {k === 'kubutz' && (<><Dot x={cx - 8} y={b - 3} /><Dot x={cx} y={b + 3} /><Dot x={cx + 8} y={b + 9} /></>)}
        {k === 'shva' && (<><Dot x={cx} y={b - 3} /><Dot x={cx} y={b + 7} /></>)}
        {mark.vav && (
          // Drawn vav with a clear leftward head (like ו) — font vavs vary (some are a bare bar) and a bar + dot reads as "i".
          <>
            <polygon
              points={`5,${c - 14} 18,${c - 14} 18,${c + 15} 12.5,${c + 15} 12.5,${c - 8.5} 5,${c - 8.5}`}
              fill={INK} stroke={INK} strokeWidth={1.5} strokeLinejoin="round"
            />
            {mark.vav === 'holam' ? <Dot x={5} y={c - 21} /> : <Dot x={7} y={c + 4} />}
          </>
        )}
      </g>
    </svg>
  )
}

/** Shared SVG filter so every rune glows; render once per page. */
export function RuneGlowDefs() {
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <filter id="rune-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  )
}
