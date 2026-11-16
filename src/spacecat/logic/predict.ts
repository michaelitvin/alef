// The chance of a mistake on a sum, and the choice of the next one (aim: one mistake in five, shared/adaptive.ts).
import { RECENT_KEEP, pickNearTarget, predictedMistakeRate, type Rng } from '../../shared/adaptive'
import { isZeroFact, type Item } from './facts'

/** right, wrong, time-out */
export type Mark = 'o' | 'x' | 't'
export interface ItemStats { seen: number; wrong: number; timeout: number; recent: string; times: number[]; picks: Record<string, number> }

/** the assumed mistake rate of a sum on the first rung, and of a sum on a rung that has just opened */
export const PRIOR_FIRST = 0.25, PRIOR_NEW_RUNG = 0.3
/** a zero fact (+ 0, − 0) comes at most once in this many rounds */
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

export const priorOf = (it: Item): number => (it.rung === 1 ? PRIOR_FIRST : PRIOR_NEW_RUNG)

export function pickNext(
  rng: Rng, candidates: Item[], stats: Record<string, ItemStats>, last: { fact?: string; sinceZero: number },
): Item {
  const noZero = last.sinceZero < ZERO_EVERY - 1
  let pool = candidates.filter((i) => i.fact !== last.fact && !(noZero && isZeroFact(i)))
  if (pool.length === 0) pool = candidates.filter((i) => i.fact !== last.fact)
  if (pool.length === 0) pool = candidates
  return pool[pickNearTarget(rng, pool.map((i) => predictItem(stats[i.id], priorOf(i))))]
}
