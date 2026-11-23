// A run: three hearts at most (a level's end gives one back), seven right answers finish a level, points, and the ships that levels unlock.
import type { RoundResult } from './round'

export const HEARTS = 3, RIGHT_PER_LEVEL = 7
/** the level that unlocks ship 2 and ship 3 */
export const SHIP_LEVELS: Record<2 | 3, number> = { 2: 4, 3: 7 }

export interface Run { hearts: number; level: number; rightInLevel: number; points: number }
export const RUN_START: Run = { hearts: HEARTS, level: 1, rightInLevel: 0, points: 0 }

export function applyResult(r: Run, res: Pick<RoundResult, 'result' | 'points'>): { run: Run; levelDone: boolean; over: boolean } {
  if (res.result === 'right') {
    const run = { ...r, rightInLevel: r.rightInLevel + 1, points: r.points + res.points }
    return { run, levelDone: run.rightInLevel >= RIGHT_PER_LEVEL, over: false }
  }
  const run = { ...r, hearts: Math.max(0, r.hearts - 1) }
  return { run, levelDone: false, over: run.hearts === 0 }
}

/** the next level: one heart back (at most HEARTS), the level's count starts over, points stay */
export const nextLevel = (r: Run): Run => ({ ...r, level: r.level + 1, hearts: Math.min(HEARTS, r.hearts + 1), rightInLevel: 0 })

/** the ships he has by reaching this level (ship 1 is always there) */
export function shipsReached(level: number): (1 | 2 | 3)[] {
  const out: (1 | 2 | 3)[] = [1]
  if (level >= SHIP_LEVELS[2]) out.push(2)
  if (level >= SHIP_LEVELS[3]) out.push(3)
  return out
}
