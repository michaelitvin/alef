// The merchant's coins and price tag, built from the game's own coin (CoinIcon: the copper coin with its rim, shine and
// crescent): the value is stamped in the middle in the crescent's cream colour, with a small crescent above it, and a
// bigger value is a bigger coin (spec: one duel, Part 2). Digits carry data-num for the no-text checks.
import { COIN_CRESCENT, CoinBody, CoinIcon, CoinShine } from './icons'

/** the coin's size in stage units, by its value */
export function coinSize(value: number): number {
  if (value >= 100) return 92
  return ({ 1: 52, 2: 58, 5: 66, 10: 76, 20: 82, 50: 88 } as Record<number, number>)[value] ?? 66
}

/**
 * One coin with its value, centred at (x, y). `state`: 'gone' (faded), 'lit' (the merchant counts it), 'hint' (the hint's
 * green glow).
 */
export function ValueCoin({ value, size, state, x = 0, y = 0, attrs }: {
  value: number; size?: number; state?: 'gone' | 'lit' | 'hint'; x?: number; y?: number; attrs?: Record<string, string>
}) {
  const s = size ?? coinSize(value)
  const digits = String(value).length
  const fs = digits === 1 ? 10 : digits === 2 ? 8.6 : 6.8
  return (
    <svg data-value-coin={value} data-state={state} className={state ? `d2-vcoin-${state}` : undefined} {...attrs}
      x={x - s / 2} y={y - s / 2} width={s} height={s} viewBox="0 0 24 24" overflow="visible">
      <CoinBody />
      <g transform="translate(12 5.2) scale(.32) translate(-12 -11.4)"><path fill="#fff0d2" d={COIN_CRESCENT} /></g>
      <text data-num x="12" y={digits === 1 ? 16 : 15.6} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={fs}
        fill="#fff0d2" stroke="#8a4a12" strokeWidth={1.1} paintOrder="stroke">{value}</text>
      <CoinShine />
    </svg>
  )
}

/** The game's coin icon with its full crescent, at (x, y) of size s (the tag and the top bar use the same coin). */
function PlainCoin({ x, y, s }: { x: number; y: number; s: number }) {
  return <svg x={x} y={y} width={s} height={s} overflow="visible"><CoinIcon /></svg>
}

export const TAG_W = 200
export const TAG_H = 113

/**
 * The price tag: parchment, tied with a string to the bottle's neck at its right end; the game's coin and the price as a
 * numeral. (x, y): its top-left corner. `flash`: the payment was not right; `lit`: he sees the price beside the count.
 */
export function PriceTag({ price, x = 0, y = 0, flash, lit, glow }: { price: number; x?: number; y?: number; flash?: boolean; lit?: boolean; glow?: boolean }) {
  const digits = String(price).length
  const cls = ['d2-tag', flash ? 'd2-tag-flash' : '', lit ? 'd2-tag-lit' : '', glow ? 'd2-glow' : ''].filter(Boolean).join(' ')
  return (
    <svg data-tag className={cls} x={x} y={y} width={TAG_W} height={TAG_H} viewBox="0 0 60 34" overflow="visible">
      <path d="M58 4 C50 2 46 10 40 12" stroke="#7a5a2a" strokeWidth={1.4} fill="none" />
      <path d="M4 5 H34 L42 17 L34 29 H4 Q1 29 1 26 V8 Q1 5 4 5Z" fill="#f6e6bf" stroke="#8a6a2a" strokeWidth={1.6} />
      <circle cx="35" cy="17" r="2.2" fill="#f4efe6" stroke="#8a6a2a" strokeWidth={1} />
      <PlainCoin x={3} y={9} s={14} />
      <text data-num data-price x={digits <= 2 ? 25.5 : 26} y={22.5} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={800}
        fontSize={digits <= 2 ? 15 : digits === 3 ? 11.5 : 9} fill="#5a2a06">{price}</text>
    </svg>
  )
}
