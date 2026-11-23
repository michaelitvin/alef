// The chance of a mistake on a sum, and the choice of the next one (aim: one mistake in five, shared/adaptive.ts).
import { RECENT_KEEP, pickNearTarget, predictedMistakeRate, type Rng } from '../../shared/adaptive'
import { isRareFact, type Item } from './facts'
import { AVOID_LEVELS, avoidSet, dueRehearsal, type Spacing } from './spacing'

/** right, wrong, time-out */
export type Mark = 'o' | 'x' | 't'
export interface ItemStats { seen: number; wrong: number; timeout: number; recent: string; times: number[]; picks: Record<string, number> }

/** the assumed mistake rate of a sum on the first rung, and of a sum on a rung that has just opened */
export const PRIOR_FIRST = 0.25, PRIOR_NEW_RUNG = 0.3
/** a rare fact (+ 0, − 0, × 0, × 1, ÷ 1: facts.ts isRareFact) comes at most once in this many rounds */
export const ZERO_EVERY = 15

export const pushMark = (recent: string | undefined, m: Mark): string => ((recent ?? '') + m).slice(-RECENT_KEEP)

/**
 * A time-out is half a mistake: the mean of the rate with it counted as a mistake and the rate with it counted as
 * right. The shared tally never gets `timeout`.
 */
export function predictItem(s: ItemStats | undefined, prior: number): number {
  const recent = s?.recent ?? ''
  const seen = s?.seen ?? 0
  const wrong = s?.wrong ?? 0
  const timeout = s?.timeout ?? 0
  const asWrong = predictedMistakeRate({ seen, wrong: wrong + timeout }, recent.replace(/t/g, 'x'), prior)
  const asRight = predictedMistakeRate({ seen, wrong }, recent.replace(/t/g, 'o'), prior)
  return (asWrong + asRight) / 2
}

export const priorOf = (it: Item): number => (it.rung === '1' ? PRIOR_FIRST : PRIOR_NEW_RUNG)

const maps = new WeakMap<Record<string, ItemStats>, Map<string, ItemStats>>()
/**
 * The stats as a Map (cached per stats object). A keyed read of a missing id on a plain object is slow in V8, and the
 * pools hold thousands of items that he never saw.
 */
export function statsMap(stats: Record<string, ItemStats>): Map<string, ItemStats> {
  let m = maps.get(stats)
  if (!m) maps.set(stats, (m = new Map(Object.entries(stats))))
  return m
}

/** a pool larger than this is cut to every item with stats plus a random sample of this many of the rest */
export const SAMPLE_MAX = 300
/** the narrowing rolls before the pick: a comparison's = is right in 1 in 5 */
export const EQUAL_SHARE = 0.2
/** C2: half the pairs have the same tens (43 ◯ 47) or swapped digits (38 ◯ 83) */
export const C2_TRICKY_SHARE = 0.5
/** S2: the ring is last in 2 rounds of 3 */
export const S2_LAST_SHARE = 2 / 3

/** Every item with stats, and a sample (drawn with `rng`) of `max` of the others; the pool itself when it is small. */
export function samplePool(rng: Rng, items: Item[], stats: Record<string, ItemStats>, max = SAMPLE_MAX): Item[] {
  if (items.length <= max) return items
  const known = statsMap(stats)
  const out: Item[] = []
  for (let i = 0; i < items.length; i++) if (known.has(items[i].id)) out.push(items[i])
  const rest = items.length - out.length
  if (rest <= max) return items
  // random indices, skipping the items with stats and the ones already drawn (the rest is far larger than max)
  const drawn = new Set<number>()
  while (drawn.size < max) {
    const i = Math.floor(rng() * items.length)
    if (drawn.has(i) || known.has(items[i].id)) continue
    drawn.add(i)
    out.push(items[i])
  }
  return out
}

const tens = (n: number) => Math.floor(n / 10)
/** a C2 pair with the same tens or with its digits swapped */
export const isTricky = (p: { a: number; b: number }): boolean =>
  tens(p.a) === tens(p.b) || (tens(p.a) === p.b % 10 && p.a % 10 === tens(p.b))

/** one roll: keep the items that pass `test` with chance `share`, else the others; a pool the roll empties is used whole */
function roll(rng: Rng, pool: Item[], share: number, test: (it: Item) => boolean): Item[] {
  const want = rng() < share
  const kept = pool.filter((it) => test(it) === want)
  return kept.length ? kept : pool
}

/** The narrowing rolls, each on a pool of one kind only: comparisons (=, then C2's tricky pairs), S2's ring last. */
export function narrow(rng: Rng, pool: Item[]): Item[] {
  if (pool.length === 0) return pool
  let p = pool
  if (p.every((i) => i.kind === 'compare')) {
    p = roll(rng, p, EQUAL_SHARE, (i) => i.kind === 'compare' && i.answer === '=')
    if (p.every((i) => i.rung === 'C2')) p = roll(rng, p, C2_TRICKY_SHARE, (i) => i.kind === 'compare' && isTricky(i))
  } else if (p.every((i) => i.kind === 'jumps' && i.rung === 'S2')) {
    p = roll(rng, p, S2_LAST_SHARE, (i) => i.kind === 'jumps' && i.hole === 3)
  }
  return p
}

const unseen = new Map<number, number>()
/** the prediction of an item (the unseen ones share one value per prior) */
export function predictOf(it: Item, stats: Record<string, ItemStats>): number {
  const s = statsMap(stats).get(it.id)
  const prior = priorOf(it)
  if (s) return predictItem(s, prior)
  let p = unseen.get(prior)
  if (p === undefined) unseen.set(prior, (p = predictItem(undefined, prior)))
  return p
}

/**
 * What the next pick knows of the rounds before it: the last fact (a save from before `spacing` has only this), the
 * rounds since a rare fact, and the spacing (recent facts and the rehearsals of mistakes, spacing.ts). `noRehearsal`:
 * a placement probe never takes a rehearsal.
 */
export interface LastCtx { fact?: string; sinceZero: number; spacing?: Spacing; noRehearsal?: boolean }

/**
 * The next item of a part: a rehearsal of a mistake that is due (if the part offers its fact), else the pool sampled when
 * large, the narrowing rolls, no fact of the last NO_REPEAT rounds (step by step fewer when nothing is left), a rare fact
 * at most once in ZERO_EVERY rounds, then the 1-in-5 picker.
 */
export function pickNext(rng: Rng, candidates: Item[], stats: Record<string, ItemStats>, last: LastCtx): Item {
  const sp: Spacing = last.spacing ?? { round: 0, recent: last.fact ? [last.fact] : [], rehearsals: [] }
  if (!last.noRehearsal) {
    const due = dueRehearsal(sp, (f) => candidates.some((i) => i.fact === f))
    if (due) {
      const same = candidates.filter((i) => i.fact === due.fact)
      return same[pickNearTarget(rng, same.map((i) => predictOf(i, stats)))]
    }
  }
  const narrowed = narrow(rng, samplePool(rng, candidates, stats))
  const noRare = last.sinceZero < ZERO_EVERY - 1
  for (let level = 0; level < AVOID_LEVELS.length; level++) {
    const avoid = avoidSet(sp, level)
    for (const strict of [noRare, false]) {
      const pool = narrowed.filter((i) => !avoid.has(i.fact) && !(strict && isRareFact(i)))
      if (pool.length) return pool[pickNearTarget(rng, pool.map((i) => predictOf(i, stats)))]
    }
  }
  return narrowed[pickNearTarget(rng, narrowed.map((i) => predictOf(i, stats)))]
}
