import { describe, expect, it } from 'vitest'
import { EARLY_ZOOM, nearestLane, startRound, step, type RoundEvent, type RoundResult, type RoundState } from './round'

// labels '4', '5', '6', '7': the right answer is on lane 1; the ship starts on lane 0 unless said otherwise
const begin = (ship = 0, arrival = 8000) => startRound(['4', '5', '6', '7'], 1, ship, arrival)
const run = (s: RoundState, ...ev: RoundEvent[]) => ev.reduce(step, s)
const res = (s: RoundState): RoundResult => {
  expect(s.done).not.toBeNull()
  return s.done!
}

describe('the round', () => {
  it('zoom on the right planet early gives 2', () => {
    const r = res(run(begin(), { type: 'lane', lane: 1, t: 1000 }, { type: 'zoom', t: 2000 }, { type: 'hit', t: 2400 }))
    expect(r).toMatchObject({ result: 'right', end: 'zoom', points: 2, lane: 1, number: '5', endMs: 2400, underMs: 1000, lastLaneMs: 1000, startedUnder: false })
  })
  it('zoom at 96% gives 1', () => {
    expect(EARLY_ZOOM).toBe(0.95)
    const r = res(run(begin(), { type: 'lane', lane: 1, t: 1000 }, { type: 'zoom', t: 0.96 * 8000 }, { type: 'hit', t: 7900 }))
    expect(r).toMatchObject({ result: 'right', points: 1 })
  })
  it('arrival on the right planet gives 1', () => {
    const r = res(run(begin(), { type: 'lane', lane: 1, t: 3000 }, { type: 'arrive', t: 8000 }))
    expect(r).toMatchObject({ result: 'right', end: 'arrival', points: 1, underMs: 3000 })
  })
  it('steered onto a wrong planet is wrong', () => {
    const r = res(run(begin(), { type: 'lane', lane: 2, t: 3000 }, { type: 'arrive', t: 8000 }))
    expect(r).toMatchObject({ result: 'wrong', points: 0, number: '6', underMs: null })
  })
  it('a zoom on a wrong planet is wrong with no points', () => {
    const r = res(run(begin(), { type: 'lane', lane: 3, t: 100 }, { type: 'zoom', t: 200 }, { type: 'hit', t: 500 }))
    expect(r).toMatchObject({ result: 'wrong', end: 'zoom', points: 0 })
  })
  it('no input and a wrong planet is a time-out', () => {
    const r = res(run(begin(), { type: 'arrive', t: 8000 }))
    expect(r).toMatchObject({ result: 'timeout', points: 0, lastLaneMs: null })
  })
  it('no input and the right planet in his lane is right', () => {
    const r = res(run(begin(1), { type: 'arrive', t: 8000 }))
    expect(r).toMatchObject({ result: 'right', points: 1, startedUnder: true, underMs: null })
  })
  it('a touch without a lane change counts as input', () => {
    const r = res(run(begin(), { type: 'touch', t: 500 }, { type: 'arrive', t: 8000 }))
    expect(r.result).toBe('wrong')
  })
  it('arrival during a zoom waits for the hit', () => {
    let s = run(begin(), { type: 'lane', lane: 1, t: 1000 }, { type: 'zoom', t: 7900 }, { type: 'arrive', t: 8000 })
    expect(s.done).toBeNull()
    s = step(s, { type: 'hit', t: 8200 })
    expect(res(s)).toMatchObject({ result: 'right', end: 'zoom', points: 1 })
  })
  it('lane events during a zoom are ignored', () => {
    const s = run(begin(), { type: 'lane', lane: 1, t: 1000 }, { type: 'zoom', t: 2000 }, { type: 'lane', lane: 3, t: 2100 }, { type: 'zoom', t: 2200 }, { type: 'hit', t: 2500 })
    expect(res(s)).toMatchObject({ result: 'right', lane: 1 })
  })
  it('a hit with no zoom changes nothing', () => {
    expect(step(begin(), { type: 'hit', t: 10 }).done).toBeNull()
  })
  it('events after the end change nothing', () => {
    const done = run(begin(), { type: 'lane', lane: 1, t: 1000 }, { type: 'arrive', t: 8000 })
    expect(run(done, { type: 'lane', lane: 3, t: 8100 }, { type: 'zoom', t: 8200 }, { type: 'hit', t: 8300 }, { type: 'arrive', t: 8400 })).toEqual(done)
  })
  it('a lane event onto the lane the ship is in changes nothing', () => {
    const under = run(begin(), { type: 'lane', lane: 1, t: 1000 })
    expect(step(under, { type: 'lane', lane: 1, t: 2000 })).toBe(under)
    const fresh = begin()
    expect(step(fresh, { type: 'lane', lane: 0, t: 500 })).toBe(fresh)
  })
  it('the last lane change onto the right planet is the under time', () => {
    const r = res(run(begin(), { type: 'lane', lane: 1, t: 1000 }, { type: 'lane', lane: 2, t: 2000 }, { type: 'lane', lane: 1, t: 3000 }, { type: 'arrive', t: 8000 }))
    expect(r).toMatchObject({ underMs: 3000, lastLaneMs: 3000 })
  })
  it('between lanes resolves to the nearest lane, ties to the ship\'s lane', () => {
    expect(nearestLane(1.5, 1)).toBe(1)
    expect(nearestLane(1.5, 2)).toBe(2)
    expect(nearestLane(1.51, 1)).toBe(2)
    expect(nearestLane(1.49, 2)).toBe(1)
    expect(nearestLane(-2, 0)).toBe(0)
    expect(nearestLane(9, 0)).toBe(3)
    // three lanes (a comparison)
    expect(nearestLane(9, 0, 3)).toBe(2)
    expect(nearestLane(1.5, 1, 3)).toBe(1)
    expect(nearestLane(1.51, 1, 3)).toBe(2)
    expect(nearestLane(-2, 2, 3)).toBe(0)
  })
})
