import { describe, expect, it } from 'vitest'
import { FAST_MIN_SAMPLES, FAST_OF_ARRIVAL, FAST_OF_MEDIAN, isFast } from './fast'
import type { RoundResult } from './round'
import { SPEED_START, type SpeedState } from './speed'

const res = (p: Partial<RoundResult>): RoundResult => ({
  result: 'right', end: 'arrival', lane: 0, number: '5', points: 1, lastLaneMs: 100, endMs: 3000, underMs: 1000, startedUnder: false, ...p,
})
const band = (underMs: number[]): SpeedState => ({ ...SPEED_START, underMs })

describe('fast', () => {
  it('the constants', () => {
    expect([FAST_OF_MEDIAN, FAST_OF_ARRIVAL, FAST_MIN_SAMPLES]).toEqual([0.75, 0.4, 5])
  })
  it('under 0.75 of his median under time, with 5 samples', () => {
    const b = band([2000, 2000, 2000, 2000, 2000])
    expect(isFast(res({ underMs: 1499 }), b, 8000)).toBe(true)
    expect(isFast(res({ underMs: 1500 }), b, 8000)).toBe(false)
  })
  it('with fewer samples: under 0.4 of the arrival time, or an early zoom', () => {
    const b = band([2000, 2000, 2000, 2000])
    expect(isFast(res({ underMs: 3199 }), b, 8000)).toBe(true)
    expect(isFast(res({ underMs: 3200 }), b, 8000)).toBe(false)
    expect(isFast(res({ underMs: 5000, points: 2, end: 'zoom' }), b, 8000)).toBe(true)
  })
  it('a wrong answer or a time-out is never fast', () => {
    expect(isFast(res({ result: 'wrong', underMs: null, points: 0 }), band([]), 8000)).toBe(false)
    expect(isFast(res({ result: 'timeout', underMs: null, points: 0 }), band([]), 8000)).toBe(false)
  })
  it('right, but started under the right planet: not fast', () => {
    expect(isFast(res({ underMs: 10, startedUnder: true, points: 2 }), band([]), 8000)).toBe(false)
  })
})
