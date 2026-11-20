import { describe, expect, it } from 'vitest'
import {
  AIM_FACTOR, ARRIVAL_MAX, ARRIVAL_MIN, ARRIVAL_START, BAND_STEP_MS, HOLD_ROUNDS, MAX_STEP, MIN_SAMPLES, SAMPLES, SPEED_START, TIMEOUT_SLOWER,
  afterRound, arrivalInForce, speedOfBand, type SpeedState,
} from './speed'

type R = Parameters<typeof afterRound>[1]
const right = (underMs: number, extra: Partial<R> = {}): R => ({ result: 'right', underMs, startedUnder: false, rungOpened: false, ...extra })
const feed = (s: SpeedState, n: number, r: R) => {
  let st = s
  for (let i = 0; i < n; i++) st = afterRound(st, r)
  return st
}

describe('speed', () => {
  it('the constants', () => {
    expect([ARRIVAL_START, ARRIVAL_MIN, ARRIVAL_MAX, AIM_FACTOR, MAX_STEP, TIMEOUT_SLOWER, HOLD_ROUNDS, MIN_SAMPLES, SAMPLES])
      .toEqual([8000, 4000, 10000, 1.6, 0.05, 0.1, 6, 5, 12])
  })
  it('starts at 8 s', () => {
    expect(SPEED_START).toEqual({ arrivalMs: 8000, underMs: [], hold: 0 })
  })
  it('fewer than 5 samples keep the time', () => {
    expect(feed(SPEED_START, 4, right(1000)).arrivalMs).toBe(8000)
  })
  it('moves at most 5% per round', () => {
    let s = feed(SPEED_START, 4, right(1000))
    for (let i = 0; i < 10; i++) {
      const next = afterRound(s, right(1000))
      expect(next.arrivalMs).toBeGreaterThanOrEqual(s.arrivalMs * 0.95 - 1e-9)
      expect(next.arrivalMs).toBeLessThanOrEqual(s.arrivalMs)
      s = next
    }
    expect(s.arrivalMs).toBeLessThan(8000 * 0.95)
  })
  it('moves toward the aim and stops there', () => {
    // median 3000 → aim 4800
    let s = feed(SPEED_START, 4, right(3000))
    for (let i = 0; i < 40; i++) s = afterRound(s, right(3000))
    expect(s.arrivalMs).toBeCloseTo(4800, 5)
  })
  it('gets longer toward the aim too, at most 5% a round', () => {
    // median 7000 → aim 11200, clamped at 10000
    let s = feed({ ...SPEED_START, arrivalMs: 5000 }, 5, right(7000))
    expect(s.arrivalMs).toBeCloseTo(5000 * 1.05 ** 1, 5)
    for (let i = 0; i < 40; i++) s = afterRound(s, right(7000))
    expect(s.arrivalMs).toBe(10000)
  })
  it('a time-out is 10% slower at once', () => {
    const s = afterRound(SPEED_START, { result: 'timeout', underMs: null, startedUnder: false, rungOpened: false })
    expect(s.arrivalMs).toBeCloseTo(8800, 5)
  })
  it('stays inside 4 to 10 s', () => {
    let s = SPEED_START
    for (let i = 0; i < 30; i++) s = afterRound(s, { result: 'timeout', underMs: null, startedUnder: false, rungOpened: false })
    expect(s.arrivalMs).toBe(ARRIVAL_MAX)
    s = SPEED_START
    for (let i = 0; i < 100; i++) s = afterRound(s, right(100))
    expect(s.arrivalMs).toBe(ARRIVAL_MIN)
  })
  it('keeps only the last 12 samples', () => {
    expect(feed(SPEED_START, 30, right(2000)).underMs).toHaveLength(12)
  })
  it('a round that started under the right planet is no sample', () => {
    let s = feed(SPEED_START, 4, right(1000))
    s = afterRound(s, right(1000, { startedUnder: true }))
    expect(s.underMs).toHaveLength(4)
    expect(s.arrivalMs).toBe(8000)
    s = afterRound(s, { result: 'wrong', underMs: null, startedUnder: false, rungOpened: false })
    expect(s.underMs).toHaveLength(4)
  })
  it('after a new rung, 7 rounds without getting shorter', () => {
    let s = feed(SPEED_START, 6, right(1000))
    const before = s.arrivalMs
    expect(before).toBeLessThan(8000)
    s = afterRound(s, right(1000, { rungOpened: true }))
    expect(s.arrivalMs).toBe(before)
    for (let i = 0; i < 6; i++) {
      s = afterRound(s, right(1000))
      expect(s.arrivalMs).toBe(before)
    }
    s = afterRound(s, right(1000))
    expect(s.arrivalMs).toBeLessThan(before)
  })
  it('a hold does not stop it getting longer', () => {
    const s = afterRound({ ...SPEED_START, hold: 3 }, { result: 'timeout', underMs: null, startedUnder: false, rungOpened: false })
    expect(s.arrivalMs).toBeGreaterThan(8000)
  })
  it('a fixed time wins and automatic resumes from its own value', () => {
    const s = { ...SPEED_START, arrivalMs: 6500 }
    expect(arrivalInForce(s, 5000)).toBe(5000)
    expect(arrivalInForce(s, 4000)).toBe(4000)
    expect(arrivalInForce(s, 'auto')).toBe(6500)
    expect(s.arrivalMs).toBe(6500)
  })
})

const at = (arrivalMs: number): SpeedState => ({ arrivalMs, underMs: [1], hold: 2 })

describe('one arrival time per band', () => {
  it('the step', () => expect(BAND_STEP_MS).toBe(2000))
  it('a band he has: its own state', () => {
    const big = at(7000)
    expect(speedOfBand({ small: at(5000), big }, 'big')).toBe(big)
  })
  it('a new band starts at the band below + 2 s, with no samples', () => {
    expect(speedOfBand({ small: at(5000) }, 'big')).toEqual({ arrivalMs: 7000, underMs: [], hold: 0 })
    expect(speedOfBand({ small: at(5000) }, 'hundreds')).toEqual({ arrivalMs: 9000, underMs: [], hold: 0 })
    expect(speedOfBand({ small: at(5000), big: at(6000) }, 'hundreds').arrivalMs).toBe(8000)
  })
  it('at most the longest arrival time', () => {
    expect(speedOfBand({ small: at(9500) }, 'big').arrivalMs).toBe(ARRIVAL_MAX)
  })
  it('no small band yet: the start', () => {
    expect(speedOfBand({}, 'small')).toEqual(SPEED_START)
  })
})
