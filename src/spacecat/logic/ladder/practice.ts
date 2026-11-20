// The practice rules, on every tallied answer that is not a probe (the design's *Practice at the frontier*): the
// frontier's pass and strike, the hold, the re-jump, the probation of a placed rung and the guard's trigger.
import type { Item } from '../facts'
import type { Mark } from '../predict'
import { RUNGS, rungDef, type Band, type RungId } from '../rungs'
import { frontier, isDone } from './frontier'
import { mistakesIn, pushWindow, rungOf, statusOf, withRung, type Ladder, type LadderEvent, type LadderSettings } from './state'

/** up by one: this many right answers in a row on the frontier, all fast */
export const FAST_PASS = 3
/** or this many right of his last so many on the frontier, with the last 3 right (a time-out is half a mistake) */
export const SLOW_PASS: readonly [number, number] = [5, 6]
/** a strike: this many mistakes in his last so many answers (a time-out is half), with at least that many answers */
export const STRIKE: readonly [number, number] = [2, 3]
/** after a strike, this many rounds come from the rung below and review only */
export const STRIKE_ROUNDS = 6
/** this many strikes since it became the frontier hold a rung */
export const HOLD_STRIKES = 2
/** a hold lasts this many play days: the first time, the second, the third and after */
export const HOLD_DAYS: readonly number[] = [2, 4, 7]
/** a placed rung becomes passed after this many right answers on it */
export const PROBATION_RIGHT = 4
/** after this many mistakes in a row anywhere, the next GUARD_ROUNDS rounds are sure wins */
export const GUARD_AFTER = 2, GUARD_ROUNDS = 2

export interface Outcome { ladder: Ladder; events: LadderEvent[]; holdSpeed?: Band }

/** the last `n` marks hold at least `k` mistakes (a time-out is half), and there are at least `n` marks */
export const struck = (recent: string, [k, n]: readonly [number, number] = STRIKE): boolean =>
  recent.length >= n && mistakesIn(recent.slice(-n)) >= k
/** 3 fast right in a row, or 5 right of the last 6 with the last 3 right */
export function passWay(recent: string, fastRun: number): 'fast' | 'slow' | undefined {
  if (fastRun >= FAST_PASS) return 'fast'
  const [right, of] = SLOW_PASS
  if (recent.length >= of && mistakesIn(recent.slice(-of)) <= of - right && recent.endsWith('ooo')) return 'slow'
  return undefined
}

/** the next rung after r in the order, of the same strand */
function nextInStrand(r: RungId): RungId | undefined {
  const d = rungDef(r)
  return RUNGS.find((x) => x.order > d.order && x.strand === d.strand)?.id
}

/** his last two marks and the guard */
export function markGuard(l: Ladder, mark: Mark): Ladder {
  const lastMarks = (l.lastMarks + mark).slice(-GUARD_AFTER)
  const guard = lastMarks.length === GUARD_AFTER && !lastMarks.includes('o')
  return { ...l, lastMarks, guardLeft: guard ? GUARD_ROUNDS : l.guardLeft }
}

/**
 * A rung that has just become the frontier starts with an empty window and no strikes. Call with the frontier before
 * the change.
 */
export function settleFrontier(l: Ladder, before: RungId | null, set: LadderSettings): Ladder {
  const after = frontier(l, set)
  if (after === null || after === before) return l
  return withRung(l, after, { recent: '', fastRun: 0, strikes: 0 })
}

/** r is passed: the way, the re-jump, the new frontier's band */
function pass(l: Ladder, r: RungId, way: 'fast' | 'slow', set: LadderSettings, events: LadderEvent[]): Ladder {
  const twoFast = l.passes.length >= 2 && l.passes.slice(-2).every((p) => p === 'fast')
  let out = withRung(l, r, { status: 'passed', recent: '', fastRun: 0, strikes: 0, probation: undefined })
  events.push({ e: 'ladder', rung: r, change: 'passed', by: way })
  out = {
    ...out,
    passes: [...l.passes, way].slice(-2),
    fastPasses: way === 'fast' ? { ...l.fastPasses, today: l.fastPasses.today + 1 } : l.fastPasses,
    strikeLeft: 0,
  }
  if (way === 'fast' && twoFast) {
    const next = nextInStrand(r)
    if (next && statusOf(out, next) === 'new' && rungDef(next).needs.every((n) => isDone(out, n, set))) {
      out = withRung(out, next, { status: 'placed', probation: 0, recent: '', fastRun: 0, strikes: 0 })
      events.push({ e: 'ladder', rung: next, change: 'placed', by: 'rejump' })
    }
  }
  return out
}

/** The practice rules for one tallied answer on `item` (its rung: a variant counts for its fact's rung). */
export function applyPractice(l: Ladder, a: { item: Item; mark: Mark; fast: boolean; set: LadderSettings }): Outcome {
  const { item, mark, set } = a
  const r = item.rung
  const st = rungOf(l, r)
  const before = frontier(l, set)
  const events: LadderEvent[] = []
  let out = l
  let holdSpeed: Band | undefined
  if (st.status === 'placed') {
    const recent = pushWindow(st.recent, mark)
    const probation = (st.probation ?? 0) + (mark === 'o' ? 1 : 0)
    if (mark === 'o' && probation >= PROBATION_RIGHT) {
      out = withRung(out, r, { status: 'passed', recent: '', probation: undefined })
      events.push({ e: 'ladder', rung: r, change: 'passed', by: 'probation' })
    } else if (struck(recent, [STRIKE[0], Math.min(STRIKE[1], recent.length)])) {
      out = withRung(out, r, { status: 'new', recent: '', fastRun: 0, strikes: 0, probation: undefined })
      events.push({ e: 'ladder', rung: r, change: 'unpassed', by: 'probation' })
    } else {
      out = withRung(out, r, { recent, probation })
    }
  } else if (st.status === 'new' && r === before) {
    const recent = pushWindow(st.recent, mark)
    const fastRun = mark === 'o' && a.fast ? st.fastRun + 1 : 0
    const way = mark === 'o' ? passWay(recent, fastRun) : undefined
    if (way) {
      out = pass(out, r, way, set, events)
      const next = frontier(out, set)
      holdSpeed = rungDef(next ?? r).band
    } else if (struck(recent)) {
      const strikes = st.strikes + 1
      events.push({ e: 'ladder', rung: r, change: 'strike' })
      out = { ...withRung(out, r, { recent: '', fastRun: 0, strikes }), strikeLeft: STRIKE_ROUNDS }
      if (strikes >= HOLD_STRIKES) {
        const holds = st.holds + 1
        const days = HOLD_DAYS[Math.min(holds, HOLD_DAYS.length) - 1]
        out = withRung(out, r, { status: 'held', holds, freeOn: l.day + days, strikes: 0 })
        events.push({ e: 'ladder', rung: r, change: 'held', days })
      }
    } else {
      out = withRung(out, r, { recent, fastRun })
    }
  }
  return { ladder: settleFrontier(out, before, set), events, ...(holdSpeed ? { holdSpeed } : {}) }
}
