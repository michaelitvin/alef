// A vowel mark shown alone (cauldron orbs): drawn in SVG on a dotted placeholder box (rule), with the vav drawn beside it for
// cholam male and shuruk, so a lone shuruk dot never looks like a dagesh.
import type { Mark } from '../logic/content'

const DOT = (cx: number, cy: number) => <circle cx={cx} cy={cy} r={7} />
function sign(id: Mark['id']) {
  switch (id) {
    case 'kamatz': return <><rect x={27} y={74} width={46} height={9} rx={3} /><rect x={45.5} y={74} width={9} height={19} rx={3} /></>
    case 'patach': return <rect x={27} y={76} width={46} height={9} rx={3} />
    case 'tsere': return <>{DOT(38, 82)}{DOT(62, 82)}</>
    case 'segol': return <>{DOT(36, 77)}{DOT(64, 77)}{DOT(50, 92)}</>
    case 'chirik': return DOT(50, 82)
    case 'cholam': return DOT(22, 14)
    case 'kubutz': return <>{DOT(32, 76)}{DOT(50, 84)}{DOT(68, 92)}</>
    default: return null
  }
}

export function MarkAlone(p: { mark: Mark; size: number; x: number; y: number }) {
  const s = p.size
  return (
    <svg x={p.x - s / 2} y={p.y - s / 2} width={s} height={s} viewBox="0 0 100 100" overflow="visible">
      <rect x={30} y={22} width={40} height={44} rx={6} fill="none" stroke="#fff6d866" strokeWidth={3} strokeDasharray="6 5" />
      <g fill="#fff6d8" filter="url(#d2-glow)">
        {p.mark.vav ? (
          <g data-vav>
            <path d="M14 26 h10 v40" fill="none" stroke="#fff6d8" strokeWidth={8} strokeLinecap="round" />
            {p.mark.id === 'shuruk' ? DOT(6, 46) : DOT(20, 12)}
          </g>
        ) : sign(p.mark.id)}
      </g>
    </svg>
  )
}
