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

/**
 * The fast lane of stage 0 (the parent, 2026-11-13: a child who already knows nikkud is placed fast): every mark has a
 * recent answer, every mark's latest answer is right, and the last `tail` tower answers in time order are all right.
 */
export const FAST_LANE = { tail: 10 }

const share = (r: string) => (r.length ? [...r].filter((c) => c === 'o').length / r.length : 0)

export function towerMastered(recent: Record<string, string>, markIds: string[]): boolean {
  if (!markIds.length || !markIds.every((id) => (recent[id] ?? '').length >= TOWER_MASTER.minAnswers)) return false
  return share(markIds.map((id) => recent[id]).join('')) >= TOWER_MASTER.rate
}

/** the tower's answers in time order, newest last (o = right, x = wrong), keeping the fast lane's tail */
export const pushTowerTail = (tail: string | undefined, right: boolean) => ((tail ?? '') + (right ? 'o' : 'x')).slice(-FAST_LANE.tail)

export function fastLane(recent: Record<string, string>, markIds: string[], tail: string): boolean {
  if (!markIds.length || !markIds.every((id) => (recent[id] ?? '').endsWith('o'))) return false
  return tail.length >= FAST_LANE.tail && !tail.slice(-FAST_LANE.tail).includes('x')
}

/** stage 0 passes by either lane: the slow one (towerMastered) or the fast one (fastLane); null while it has not */
export function stage0Lane(recent: Record<string, string>, markIds: string[], tail: string): 'fast' | 'slow' | null {
  if (fastLane(recent, markIds, tail)) return 'fast'
  return towerMastered(recent, markIds) ? 'slow' : null
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
