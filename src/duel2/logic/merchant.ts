// The merchant's rules (spec: one duel, Part 2), with no screen: when he comes, his prices, the coins the child's balance
// is made of (so that the exact price can always be made), the hint's coins, the piles, and the counting. He pays the
// exact price: there is no haggling and no change.
import type { Rng } from '../../shared/adaptive'

/** the parent's number range for shopping: up to 10, 100 or 1000 */
export type NumberRange = 10 | 100 | 1000
/** the coin values of each range, ascending (the game's own coins, never shekels or notes) */
export const COIN_VALUES: Record<NumberRange, number[]> = {
  10: [1, 2, 5, 10],
  100: [1, 2, 5, 10, 20, 50],
  1000: [1, 2, 5, 10, 20, 50, 100, 200, 500],
}
/** the first price of a run: about six right answers' coins without the multiplier */
export const FIRST_PRICE = 6
/** each purchase in a run multiplies the price */
export const PRICE_GROWTH = 1.5
/** a pile is drawn up to this many coins; a taller pile is drawn at the cap ("at least this many") */
export const PILE_CAP = 6

/** The price after `purchasesThisRun` purchases in this run, capped at the range's top. */
export const priceAt = (purchasesThisRun: number, range: NumberRange): number =>
  Math.min(range, Math.round(FIRST_PRICE * PRICE_GROWTH ** purchasesThisRun))

/**
 * Does the merchant come at this checkpoint? Only in the adventure, with fewer than 3 hearts and enough coins. On the
 * last heart: at every checkpoint. With 2 hearts: always before a boss, otherwise every other checkpoint (`sinceVisit`
 * counts the checkpoints since his last visit, a declined visit included; Infinity before the first).
 */
export function merchantDue(c: { adventure: boolean; hearts: number; coins: number; price: number; sinceVisit: number; bossNext: boolean }): boolean {
  if (!c.adventure || c.hearts >= 3 || c.coins < c.price) return false
  return c.hearts === 1 || c.bossNext || c.sinceVisit >= 2
}

/** the fewest coins of `coins` that make exactly `price` (a bounded knapsack over the price), or null */
function minPay(coins: number[], price: number): number[] | null {
  if (price <= 0) return []
  const counts = new Map<number, number>()
  for (const v of coins) counts.set(v, (counts.get(v) ?? 0) + 1)
  const items: number[] = []
  for (const [v, n] of [...counts].sort((a, b) => b[0] - a[0])) for (let k = 0; k < Math.min(n, Math.floor(price / v)); k++) items.push(v)
  const INF = 1 << 30
  const dp = new Int32Array(price + 1).fill(INF)
  dp[0] = 0
  const take = new Uint8Array(items.length * (price + 1))
  items.forEach((v, i) => {
    for (let s = price; s >= v; s--) {
      if (dp[s - v] + 1 < dp[s]) { dp[s] = dp[s - v] + 1; take[i * (price + 1) + s] = 1 }
    }
  })
  if (dp[price] >= INF) return null
  const out: number[] = []
  let s = price
  for (let i = items.length - 1; i >= 0 && s > 0; i--) if (take[i * (price + 1) + s]) { out.push(items[i]); s -= items[i] }
  return out.sort((a, b) => b - a)
}

/** some of `coins` make exactly `price` */
export const payable = (coins: number[], price: number): boolean => minPay(coins, price) !== null
/** the hint: a payable choice with the fewest coins, biggest first ([] when none) */
export const hintCoins = (coins: number[], price: number): number[] => minPay(coins, price) ?? []

/** the fewest coins of the range that make `n` (these coin systems are canonical: the greedy way is the shortest) */
function greedy(n: number, values: number[]): number[] {
  const out: number[] = []
  for (const v of [...values].sort((a, b) => b - a)) while (n >= v) { out.push(v); n -= v }
  return out
}

/** one try at a composition for this level (null: this level cannot be tried this way) */
function candidate(balance: number, price: number, values: number[], level: number, r: () => number): number[] | null {
  const coins: number[] = []
  if (level === 0) coins.push(...greedy(price, values))
  else {
    // the price from coins smaller than it, chosen at random: it takes several coins
    const small = values.filter((v) => v < price)
    if (!small.length) return null
    for (let left = price; left > 0;) {
      const opts = small.filter((v) => v <= left)
      const v = opts[Math.floor(r() * opts.length)]
      coins.push(v)
      left -= v
    }
  }
  let rest = balance - price
  if (level === 2) {
    // the obvious big coin, which is too much
    const big = values.filter((v) => v > price && v <= rest)
    if (!big.length) return null
    const v = big[Math.floor(r() * r() * big.length)]
    coins.push(v)
    rest -= v
  }
  // the rest of his savings: mostly the largest value; from level 1, coins that cannot help to pay the price where possible
  const restValues = level >= 1 ? values.filter((v) => v > price) : values
  const top = [...restValues].sort((a, b) => b - a)
  for (const v of top) while (rest >= v) { coins.push(v); rest -= v }
  // what is left (less than the smallest such coin), in small coins chosen at random, biased to the bigger ones
  while (rest > 0) {
    const opts = values.filter((v) => v <= rest)
    const v = opts[opts.length - 1 - Math.floor(r() * r() * opts.length)]
    coins.push(v)
    rest -= v
  }
  return coins
}

function fits(coins: number[], price: number, values: number[], level: number): boolean {
  const pay = minPay(coins, price)
  if (!pay) return false
  if (level === 0) return pay.length === greedy(price, values).length
  if (pay.length < 3) return false
  return level === 1 || coins.some((v) => v > price)
}

const TRIES = 60

/**
 * The coins his balance is made of for one visit (made before each visit, never during one): coins of the range that sum
 * to `balance` and can make `price` exactly. `level` (adaptive, 0–2): 0 → the fewest coins make the price; 1 → the price
 * needs at least three coins; 2 → as 1, and a single coin bigger than the price is there too. A level that this balance
 * cannot have falls back to the best lower one. Ascending.
 */
export function composeCoins(balance: number, price: number, range: NumberRange, level: number, rng: Rng): number[] {
  const values = COIN_VALUES[range]
  for (let l = Math.max(0, Math.min(2, Math.round(level))); l >= 0; l--) {
    for (let a = 0; a < TRIES; a++) {
      // a fixed rng still gives each try its own choices
      const r = () => (rng() + a * 0.6180339887) % 1
      const c = candidate(balance, price, values, l, r)
      if (c && fits(c, price, values, l)) return c.sort((x, y) => x - y)
      if (l === 0) break
    }
  }
  return [...greedy(price, values), ...greedy(Math.max(0, balance - price), values)].sort((x, y) => x - y)
}

/** one pile per value he has, ascending; a pile is drawn up to PILE_CAP coins */
export function piles(coins: number[]): { value: number; count: number; drawn: number }[] {
  const counts = new Map<number, number>()
  for (const v of coins) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts].sort((a, b) => a[0] - b[0]).map(([value, count]) => ({ value, count, drawn: Math.min(count, PILE_CAP) }))
}

/** the merchant counts the coins in his hand in giving order: the running totals */
export function countSteps(given: number[]): number[] {
  let t = 0
  return given.map((v) => (t += v))
}

export const verdict = (sum: number, price: number): 'exact' | 'short' | 'over' => (sum === price ? 'exact' : sum < price ? 'short' : 'over')
