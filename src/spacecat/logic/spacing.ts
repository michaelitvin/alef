// The spacing of a repeat: no fact comes back within a few rounds, and a mistake comes back later at growing, uneven gaps.
import type { Mark } from './predict'
import type { Rng } from '../../shared/adaptive'

/** the facts asked last that the save keeps (the newest last) */
export const RECENT_FACTS = 6
/** a fact asked in the last NO_REPEAT rounds is not picked (unless nothing else is left) */
export const NO_REPEAT = 4
/**
 * After a mistake (or a time-out) the fact comes back after a random number of other rounds in the first range, then,
 * if that answer is right, after a random number in the second range. The gaps grow and are not even, so the child does
 * not meet the same sum 3 times in a row. A mistake at any step starts again at step 1.
 */
export const GAP_FIRST: readonly [number, number] = [3, 5]
export const GAP_SECOND: readonly [number, number] = [7, 11]
/** a rehearsal that stays due this many rounds (its fact was not offered) is dropped */
export const OVERDUE_DROP = 30
/** at most this many rehearsals wait at once (the oldest is dropped) */
export const MAX_REHEARSALS = 3

export interface Rehearsal {
  fact: string
  /** the item that was missed (a save from before it has none: the rehearsal then waits for its fact to be offered) */
  item?: string
  /** 1: the first return after a mistake, 2: the second */
  step: 1 | 2
  /** the round number (`Spacing.round`) from which the fact is due */
  due: number
}

export interface Spacing {
  /** rounds recorded so far (demo rounds count; cut rounds do not) */
  round: number
  recent: string[]
  /** oldest first */
  rehearsals: Rehearsal[]
}

export const SPACING_START: Spacing = { round: 0, recent: [], rehearsals: [] }

const gapIn = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + Math.floor(rng() * (hi - lo + 1))

/**
 * The spacing after a round on `fact`. `mark` is undefined for a demo round (it counts as asked, it teaches nothing).
 * A right answer on a rehearsal that is due moves it on; a right answer before it was due changes nothing.
 */
export function afterRound(sp: Spacing, fact: string, mark: Mark | undefined, rng: Rng, item?: string): Spacing {
  const round = sp.round + 1
  const recent = [...sp.recent, fact].slice(-RECENT_FACTS)
  let rehearsals = sp.rehearsals.filter((r) => round - r.due <= OVERDUE_DROP)
  const mine = rehearsals.find((r) => r.fact === fact)
  if (mark === 'x' || mark === 't') {
    rehearsals = [...rehearsals.filter((r) => r.fact !== fact), { fact, ...(item ? { item } : {}), step: 1 as const, due: round + gapIn(rng, GAP_FIRST) }].slice(-MAX_REHEARSALS)
  } else if (mark === 'o' && mine && sp.round >= mine.due) {
    rehearsals = rehearsals.filter((r) => r !== mine)
    if (mine.step === 1) rehearsals.push({ fact, ...(mine.item ? { item: mine.item } : {}), step: 2 as const, due: round + gapIn(rng, GAP_SECOND) })
  }
  return { round, recent, rehearsals }
}

/** the oldest rehearsal that is due now and whose fact `offered` accepts */
export function dueRehearsal(sp: Spacing, offered: (fact: string) => boolean): Rehearsal | undefined {
  return sp.rehearsals.find((r) => sp.round >= r.due && offered(r.fact))
}

/**
 * The facts that the next pick avoids, from the strictest level (the last NO_REPEAT facts) to the loosest (none). The
 * rehearsals that wait are avoided at every level but the last: a mistake does not come back early when the pool is small. `level` 0 is the strictest; the pick tries the next one when nothing is left.
 */
export const AVOID_LEVELS = [NO_REPEAT, 2, 1, 0] as const
export function avoidSet(sp: Spacing, level: number): Set<string> {
  const n = AVOID_LEVELS[level] ?? 0
  const out = new Set(n > 0 ? sp.recent.slice(-n) : [])
  if (level < AVOID_LEVELS.length - 1) for (const r of sp.rehearsals) if (sp.round < r.due) out.add(r.fact)
  return out
}
