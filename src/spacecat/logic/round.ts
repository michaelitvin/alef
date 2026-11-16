// One round as a pure state machine: step(state, event) → state. The engine supplies the events and the flight time.
import { LANES } from './wrongs'

/** a zoom that starts before this share of the arrival time is "early": 2 points */
export const EARLY_ZOOM = 0.95

export type RoundEvent =
  | { type: 'touch'; t: number }
  | { type: 'lane'; lane: number; t: number }
  | { type: 'zoom'; t: number }
  | { type: 'hit'; t: number }
  | { type: 'arrive'; t: number }

export interface RoundResult {
  result: 'right' | 'wrong' | 'timeout'
  end: 'zoom' | 'arrival'
  lane: number
  number: number
  points: 0 | 1 | 2
  lastLaneMs: number | null
  endMs: number
  underMs: number | null
  startedUnder: boolean
}

export interface RoundState {
  labels: number[]
  rightLane: number
  startLane: number
  lane: number
  arrivalMs: number
  input: boolean
  zoomAt: number | null
  lastLaneAt: number | null
  underAt: number | null
  done: RoundResult | null
}

export function startRound(labels: number[], rightLane: number, shipLane: number, arrivalMs: number): RoundState {
  return { labels, rightLane, startLane: shipLane, lane: shipLane, arrivalMs, input: false, zoomAt: null, lastLaneAt: null, underAt: null, done: null }
}

/** The lane nearest to a position x (in lane units); an exact tie goes to the ship's current lane. */
export function nearestLane(x: number, current: number): number {
  const lo = Math.floor(x)
  const frac = x - lo
  let lane: number
  if (Math.abs(frac - 0.5) < 1e-9) lane = current === lo + 1 ? lo + 1 : lo
  else lane = frac < 0.5 ? lo : lo + 1
  return Math.min(LANES - 1, Math.max(0, lane))
}

function finish(s: RoundState, end: 'zoom' | 'arrival', t: number): RoundState {
  const right = s.lane === s.rightLane
  const result = right ? 'right' : s.input ? 'wrong' : 'timeout'
  const early = end === 'zoom' && s.zoomAt !== null && s.zoomAt < EARLY_ZOOM * s.arrivalMs
  return {
    ...s,
    done: {
      result, end, lane: s.lane, number: s.labels[s.lane], points: right ? (early ? 2 : 1) : 0,
      lastLaneMs: s.lastLaneAt, endMs: t, underMs: right ? s.underAt : null, startedUnder: s.startLane === s.rightLane,
    },
  }
}

export function step(s: RoundState, e: RoundEvent): RoundState {
  if (s.done) return s
  switch (e.type) {
    case 'touch':
      return { ...s, input: true }
    case 'lane':
      // during a zoom, and onto the lane the ship is already in, a lane event is a no-op (input comes from 'touch')
      if (s.zoomAt !== null || e.lane === s.lane) return s
      return { ...s, lane: e.lane, input: true, lastLaneAt: e.t, underAt: e.lane === s.rightLane ? e.t : s.underAt }
    case 'zoom':
      return s.zoomAt !== null ? s : { ...s, zoomAt: e.t, input: true }
    case 'hit':
      return s.zoomAt === null ? s : finish(s, 'zoom', e.t)
    case 'arrive':
      return s.zoomAt !== null ? s : finish(s, 'arrival', e.t)
  }
}
