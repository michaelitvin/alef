// His coins: one for every 10 stars, kept between plays (they grow only now and then). The coin pops when the number
// changes. Digits carry data-num for the no-text checks.
import { CoinIcon } from './icons'

export function CoinCount(p: { n: number; size?: 'small' | 'big' }) {
  return (
    <span className={`d2-stars d2-coins d2-stars-${p.size ?? 'small'}`}>
      <span className="d2-star d2-coin" key={p.n}><CoinIcon /></span>
      <span data-num data-coins="">{p.n}</span>
    </span>
  )
}
