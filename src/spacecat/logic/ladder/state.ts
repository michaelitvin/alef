// The ladder's saved state: one entry per rung that is not new, the play-day counter, the mode (practice, a placement,
// the warm-up, a re-check) and the counters of the mix. Pure data and small helpers.
import type { Mark } from '../predict'
import type { RungId } from '../rungs'

export type Status = 'new' | 'passed' | 'placed' | 'held'
export interface RungState {
  status: Status
  /** marks o/x/t on its items since it last became the frontier or was placed; newest last, at most WINDOW */
  recent: string
  /** fast right answers in a row on it */
  fastRun: number
  /** since it last became the frontier */
  strikes: number
  /** times held */
  holds: number
  /** held: the play day on which it is free again */
  freeOn?: number
  /** placed: right answers since it was placed */
  probation?: number
}
export interface LadderSettings {
  range: 'auto' | RungId
  compare: boolean; jumps: boolean; times: boolean; divide: boolean; missing100: boolean; hundreds: boolean
}
export type Part = 'frontier' | 'below' | 'review' | 'warmup' | 'probe' | 'guard'
export type PlacementWhy = 'first' | 'migration' | 'parent'
export interface PlacementMode {
  kind: 'placement'
  why: PlacementWhy
  /** the rung of the next probe */
  at: RungId
  jump: number
  probes: number
  max: number
  /** mistakes in a row */
  inRow: number
  mistakes: number
  confirmed: RungId[]
  /** slow right answers per rung */
  rights: Partial<Record<RungId, number>>
  failed: RungId[]
  /** the probes walk only the plus and minus rungs that have no switch (the strand a version 1 save played) */
  plusOnly?: boolean
}
export interface WarmupMode { kind: 'warmup'; rung: RungId; recent: string; fastRun: number; strikes: number; rounds: number; reviewLeft: number }
export interface RecheckMode { kind: 'recheck'; at: RungId; probes: number }
export type Mode = { kind: 'practice' } | PlacementMode | WarmupMode | RecheckMode

export interface Ladder {
  /** a missing rung is 'new' */
  rungs: Partial<Record<RungId, RungState>>
  /** the play-day counter (0 before the first run) */
  day: number
  /** ms of his last tallied answer */
  lastAt?: number
  /** the play day of the last placement or re-check */
  checkedOn: number
  /** rungs passed the fast way on this play day and on the one before */
  fastPasses: { today: number; lastDay: number }
  /** how his last two rungs were passed (frontier passes), newest last */
  passes: ('fast' | 'slow')[]
  mode: Mode
  /** rounds left of "below and review only" after a strike */
  strikeLeft: number
  /** rounds left of sure wins */
  guardLeft: number
  /** his last two marks anywhere */
  lastMarks: string
  /** a re-check starts when the warm-up ends */
  recheckDue: boolean
}

export type Change = 'placed' | 'passed' | 'strike' | 'held' | 'free' | 'unpassed'
export type By = 'placement' | 'fast' | 'slow' | 'rejump' | 'recheck' | 'warmup' | 'probation' | 'migration'
export type LadderEvent =
  | { e: 'ladder'; rung: RungId; change: Change; by?: By; days?: number }
  | { e: 'placement'; phase: 'start' | 'end'; kind: 'first' | 'migration' | 'recheck' | 'parent'; probes: number; mistakes: number; frontier: RungId | null }
  | { e: 'warmup'; rung: RungId; how: 'fast' | 'slow' | 'forgot'; rounds: number }

/** the frontier's window of marks (and the warm-up's) */
export const WINDOW = 6

/** the first placement: from rung 1, with a jump of 8 positions and at most 16 probes */
export const FIRST_JUMP = 8, FIRST_PROBES = 16

export const placementMode = (why: PlacementWhy, at: RungId, jump: number, max: number): PlacementMode => ({
  kind: 'placement', why, at, jump, probes: 0, max, inRow: 0, mistakes: 0, confirmed: [], rights: {}, failed: [],
})

export const LADDER_START: Ladder = {
  rungs: {}, day: 0, checkedOn: 0, fastPasses: { today: 0, lastDay: 0 }, passes: [],
  mode: placementMode('first', '1', FIRST_JUMP, FIRST_PROBES),
  strikeLeft: 0, guardLeft: 0, lastMarks: '', recheckDue: false,
}

export const NEW_RUNG: RungState = { status: 'new', recent: '', fastRun: 0, strikes: 0, holds: 0 }

export const rungOf = (l: Ladder, r: RungId): RungState => l.rungs[r] ?? NEW_RUNG
export const statusOf = (l: Ladder, r: RungId): Status => rungOf(l, r).status

/** the ladder with one rung changed (a rung that is new again with nothing to remember is dropped) */
export function withRung(l: Ladder, r: RungId, patch: Partial<RungState>): Ladder {
  const next: RungState = { ...rungOf(l, r), ...patch }
  const rungs = { ...l.rungs }
  if (next.status === 'new' && next.recent === '' && next.fastRun === 0 && next.strikes === 0 && next.holds === 0) delete rungs[r]
  else rungs[r] = next
  return { ...l, rungs }
}

/** a time-out is half a mistake */
export const mistakesIn = (marks: string): number => {
  let n = 0
  for (const m of marks) n += m === 'x' ? 1 : m === 't' ? 0.5 : 0
  return n
}
export const pushWindow = (recent: string, m: Mark): string => (recent + m).slice(-WINDOW)
