// Shared helpers of the ladder's tests (not shipped: only test files import it).
import type { Rng } from '../../../shared/adaptive'
import { itemsOfRung, type Item } from '../facts'
import type { RungId } from '../rungs'
import { LADDER_START, type Ladder, type LadderSettings, type RungState, type Status } from './state'

export const ALL_ON: LadderSettings = { range: 'auto', compare: true, jumps: true, times: true, divide: true, missing100: true, hundreds: true }

export const lcg = (seed: number): Rng => {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/** a practice ladder with these rungs set */
export function ladderWith(rungs: Partial<Record<RungId, Status | Partial<RungState>>>, extra: Partial<Ladder> = {}): Ladder {
  const out: Ladder['rungs'] = {}
  for (const [id, v] of Object.entries(rungs) as [RungId, Status | Partial<RungState>][]) {
    const base: RungState = { status: 'new', recent: '', fastRun: 0, strikes: 0, holds: 0 }
    out[id] = typeof v === 'string' ? { ...base, status: v, ...(v === 'placed' ? { probation: 0 } : {}) } : { ...base, ...v }
  }
  return { ...LADDER_START, mode: { kind: 'practice' }, day: 1, lastAt: 0, rungs: out, ...extra }
}

/** every rung up to and including `last` in the order passed */
export function passedThrough(order: RungId[], last: RungId): Partial<Record<RungId, Status>> {
  const out: Partial<Record<RungId, Status>> = {}
  for (const r of order) {
    out[r] = 'passed'
    if (r === last) break
  }
  return out
}

export const itemOf = (r: RungId, i = 0): Item => itemsOfRung(r)[i]
