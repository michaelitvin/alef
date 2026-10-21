// A star and a number: the points of the run (top bar, end screen) or all his stars so far (cover). Digits are the one
// text a child screen shows; they carry data-num so the no-text checks know they are meant.
import { StarIcon } from './icons'

export function StarCount(p: { n: number; size?: 'small' | 'big'; attr: 'data-score' | 'data-run-score' | 'data-total-stars' }) {
  return (
    <span className={`d2-stars d2-stars-${p.size ?? 'small'}`}>
      <span className="d2-star" key={p.n}><StarIcon /></span>
      <span data-num {...{ [p.attr]: '' }}>{p.n}</span>
    </span>
  )
}
