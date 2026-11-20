// Is a right answer fast (the design's *Fast*): the strongest sign that he knows a sum; a slow right one may be counting.
import type { RoundResult } from './round'
import { median, type SpeedState } from './speed'

/** fast: under this share of his own median "under" time (of the item's band) */
export const FAST_OF_MEDIAN = 0.75
/** until the band has this many samples: under this share of the arrival time in force, or an early zoom */
export const FAST_OF_ARRIVAL = 0.4, FAST_MIN_SAMPLES = 5

/** `band` is the speed state of the item's band, `arrivalMs` the arrival time in force */
export function isFast(res: RoundResult, band: SpeedState, arrivalMs: number): boolean {
  if (res.result !== 'right' || res.startedUnder || res.underMs === null) return false
  if (band.underMs.length >= FAST_MIN_SAMPLES) return res.underMs < FAST_OF_MEDIAN * median(band.underMs)
  return res.underMs < FAST_OF_ARRIVAL * arrivalMs || res.points === 2
}
