// The unseen speed adaptation: how long the planets need to reach the ship. The child never sees it change.
export const ARRIVAL_START = 8000, ARRIVAL_MIN = 4000, ARRIVAL_MAX = 10000
/** the aim is this many times the median time he needs to get under the right planet */
export const AIM_FACTOR = 1.6
/** the time moves toward the aim by at most this share of itself in a round */
export const MAX_STEP = 0.05
/** a time-out makes the time this much longer at once */
export const TIMEOUT_SLOWER = 0.10
/** after a rung opens, the time does not get shorter for this many more rounds (and not in that round) */
export const HOLD_ROUNDS = 6
/** fewest samples before the time moves, and most kept */
export const MIN_SAMPLES = 5, SAMPLES = 12

export type FixedArrival = 8000 | 5000 | 4000
export interface SpeedState { arrivalMs: number; underMs: number[]; hold: number }
export const SPEED_START: SpeedState = { arrivalMs: ARRIVAL_START, underMs: [], hold: 0 }

const clamp = (ms: number) => Math.min(ARRIVAL_MAX, Math.max(ARRIVAL_MIN, ms))
const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y)
  const m = a.length >> 1
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}

export function afterRound(
  s: SpeedState,
  r: { result: 'right' | 'wrong' | 'timeout'; underMs: number | null; startedUnder: boolean; rungOpened: boolean },
): SpeedState {
  const sample = r.result === 'right' && !r.startedUnder && r.underMs !== null
  const underMs = sample ? [...s.underMs, r.underMs!].slice(-SAMPLES) : s.underMs
  const hold = r.rungOpened ? HOLD_ROUNDS + 1 : s.hold
  let arrivalMs = s.arrivalMs
  if (r.result === 'timeout') {
    arrivalMs = arrivalMs * (1 + TIMEOUT_SLOWER)
  } else if (underMs.length >= MIN_SAMPLES) {
    const aim = AIM_FACTOR * median(underMs)
    if (aim > arrivalMs) arrivalMs = Math.min(aim, arrivalMs * (1 + MAX_STEP))
    else if (hold === 0) arrivalMs = Math.max(aim, arrivalMs * (1 - MAX_STEP))
  }
  return { arrivalMs: clamp(arrivalMs), underMs, hold: Math.max(0, hold - 1) }
}

/** The time in force: the parent's fixed time if set, else the automatic one (which keeps its own value meanwhile). */
export const arrivalInForce = (s: SpeedState, fixed: 'auto' | FixedArrival): number => (fixed === 'auto' ? s.arrivalMs : fixed)
