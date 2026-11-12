// Mastery (spec: one duel, Part 3): when the first duel's tower is mastered (stage 0 passes and Book 2 opens), which
// screens get a shorter visit or are skipped in every other cycle (never removed), and the 0–3 station rating.
import type { ScreenId } from './predict'

/**
 * The tower is mastered when every mark has at least `minAnswers` recent answers and, over all marks' recent answers
 * together, at least `rate` are right. A per-mark bar was far too strict: the duel's picker aims each round at one mistake
 * in five, so some mark always sits near 80 %, and a simulated 80 %-right player needed thousands of answers. With this
 * rule he needs about 95 (mastery.test), about ten tower visits of two waves (tune in playtest).
 */
export const TOWER_MASTER = { minAnswers: 3, rate: 0.75 }
/** a visit is about half when the last this many answers (at least this many) have no mistake */
export const SHORT_AFTER = 8
/** a screen is skipped in every other cycle when the last this many answers (at least this many) are all right */
export const SKIP_AFTER = 12

const share = (r: string) => (r.length ? [...r].filter((c) => c === 'o').length / r.length : 0)

export function towerMastered(recent: Record<string, string>, markIds: string[]): boolean {
  if (!markIds.length || !markIds.every((id) => (recent[id] ?? '').length >= TOWER_MASTER.minAnswers)) return false
  return share(markIds.map((id) => recent[id]).join('')) >= TOWER_MASTER.rate
}

/** his recent answers on a screen: the tower's are the first duel's (every mark's, joined); the others Book 2's `sc:` feature */
export function screenRecent(screen: ScreenId, d2recent: Record<string, string>, duelRecent: Record<string, string>): string {
  if (screen === 'tower') return Object.values(duelRecent).join('')
  return d2recent[`sc:${screen}`] ?? ''
}

export function visitScale(recent: string): 0.5 | 1 {
  return recent.length >= SHORT_AFTER && !recent.slice(-SHORT_AFTER).includes('x') ? 0.5 : 1
}

/** the tower is never skipped, nor the only screen of a cycle; a long-mastered screen is skipped in odd cycles */
export function skipInCycle(screen: ScreenId, recent: string, cycleNo: number, cycleLen: number): boolean {
  if (screen === 'tower' || cycleLen <= 1) return false
  if (recent.length < SKIP_AFTER || recent.slice(-SKIP_AFTER).includes('x')) return false
  return cycleNo % 2 === 1
}

/** a station's rating on the path: 0 with fewer than 3 answers, else 3 × the share right, rounded */
export function rating(recent: string): 0 | 1 | 2 | 3 {
  if (recent.length < 3) return 0
  return Math.round(3 * share(recent)) as 0 | 1 | 2 | 3
}
