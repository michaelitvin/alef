import { describe, expect, it } from 'vitest'
import { CYCLE, HEARTS, VISIT, coinsFor, cycleOf, heartsAtRunStart, laneAt, multiplierOf, passEndHeart, newRound, nextScreen, onAnswer, runStart, travelMs, waveX, BASE_TRAVEL_MS, orbEvents, wavePos, CATCH_AT, PASS_AT, flightPace, PACE_MIN, PACE_MAX } from './run'

describe('run', () => {
  it('cycle per stage', () => {
    expect(cycleOf(1)).toEqual(['broom', 'ghosts'])
    expect(cycleOf(4)).toEqual(CYCLE)
  })
  it('next screen wraps and marks a new cycle', () => {
    expect(nextScreen(4, 'ladder')).toEqual({ screen: 'ghosts', newCycle: false })
    expect(nextScreen(4, 'doors')).toEqual({ screen: 'broom', newCycle: true })
    expect(nextScreen(1, 'ghosts')).toEqual({ screen: 'broom', newCycle: true })
  })
  it('drawing comes after the doors: print, then handwriting, from stage 1, only when on', () => {
    expect(cycleOf(4, true)).toEqual(['broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'draw', 'draw-hand'])
    expect(cycleOf(1, true)).toEqual(['broom', 'ghosts', 'draw', 'draw-hand'])
    expect(cycleOf(4, false)).toEqual(CYCLE)
    expect(nextScreen(4, 'doors', true)).toEqual({ screen: 'draw', newCycle: false })
    expect(nextScreen(4, 'draw', true)).toEqual({ screen: 'draw-hand', newCycle: false })
    expect(nextScreen(4, 'draw-hand', true)).toEqual({ screen: 'broom', newCycle: true })
    expect(VISIT['draw-hand']).toBe(3)
  })
  it('an old save that ended on the drawing screen starts the next run at a valid screen', () => {
    expect(runStart(4, 'draw', true)).toBe('draw-hand')
    expect(runStart(4, 'draw', false)).toBe('broom')
  })
  it('next run starts after the screen where the last ended', () => {
    expect(runStart(4, 'ladder')).toBe('ghosts')
    expect(runStart(4, 'doors')).toBe('broom')
    expect(runStart(1, 'cauldron')).toBe('broom')
    expect(runStart(4, null)).toBe('broom')
  })
  it('hearts last the whole run; a near miss is forgiven once per round', () => {
    let h = heartsAtRunStart()
    expect(h.left).toBe(HEARTS)
    let r = onAnswer(h, 'near')
    expect(r.forgiven).toBe(true)
    expect(r.hearts.left).toBe(3)
    r = onAnswer(r.hearts, 'near')
    expect(r.forgiven).toBe(false)
    expect(r.hearts.left).toBe(2)
    h = newRound(r.hearts)
    expect(onAnswer(h, 'near').forgiven).toBe(true)
  })
  it('three wrong answers end the run', () => {
    let h = heartsAtRunStart()
    let over = false
    for (let i = 0; i < 3; i++) ({ hearts: h, over } = onAnswer(h, 'wrong'))
    expect(over).toBe(true)
  })
  it('the flight follows him: no speed-up per lap, base 5800 ms (spec: a gentler flight)', () => {
    expect(BASE_TRAVEL_MS).toBe(5800)
    expect(travelMs(1)).toBe(5800)
    expect(travelMs(1.2)).toBeCloseTo(5800 * 1.2)
  })
  it('the end of a pass gives one heart back, never more than HEARTS', () => {
    expect(passEndHeart({ left: 1, nearMissUsed: false })).toEqual({ hearts: { left: 2, nearMissUsed: false }, gained: true })
    expect(passEndHeart({ left: HEARTS, nearMissUsed: false }).gained).toBe(false)
    expect(passEndHeart({ left: HEARTS, nearMissUsed: false }).hearts.left).toBe(HEARTS)
  })
  it('the streak multiplies the coins: x1 for 0-4, x2 for 5-9, x3 from 10', () => {
    expect([1, 4, 5, 9, 10, 30].map(multiplierOf)).toEqual([1, 1, 2, 2, 3, 3])
    expect(coinsFor(7)).toBe(2)
  })
  it('a mistake slows the flight a little (x1.04), a catch speeds it up 1%, inside the pace limits', () => {
    expect(flightPace(1, 'catch')).toBeCloseTo(0.99)
    expect(flightPace(1, 'miss')).toBeCloseTo(1.04)
    expect(flightPace(PACE_MIN, 'catch')).toBe(PACE_MIN)
    expect(flightPace(PACE_MAX, 'miss')).toBe(PACE_MAX)
  })
  it('wave position runs from the right edge to the wizard', () => {
    expect(waveX(1000, 1000, 5000)).toBe(1)
    expect(waveX(1000, 3500, 5000)).toBeCloseTo(0.5)
    expect(waveX(1000, 9000, 5000)).toBe(0)
  })
  it('drag released between lanes snaps to the nearest lane', () => {
    expect(laneAt(0.49)).toBe(1)
    expect(laneAt(0.1)).toBe(0)
    expect(laneAt(0.95)).toBe(2)
  })
  it('an orb keeps flying past the wizard (its position goes below 0)', () => {
    expect(wavePos(1000, 1000, 5000)).toBe(1)
    expect(wavePos(1000, 6500, 5000)).toBeCloseTo(-0.1)
  })
  it('the target can still be caught while it overlaps the wizard (Michael: it failed too early)', () => {
    const k = [0.3, -0.03, 0.5]
    // he is in lane 0, the target in lane 1 is at the wizard: not missed yet
    expect(orbEvents(k, [false, false, false], 0, [false, true, false])).toEqual({ resolved: [false, false, false], hit: null, missedTarget: false })
    // he moves into lane 1 in time: caught
    expect(orbEvents(k, [false, false, false], 1, [false, true, false]).hit).toBe(1)
  })
  it('the target is missed only when it has passed the wizard', () => {
    const r = orbEvents([0.3, PASS_AT - 0.01, 0.5], [false, false, false], 0, [false, true, false])
    expect(r.missedTarget).toBe(true)
    expect(r.resolved).toEqual([false, true, false])
  })
  it('a wrong orb hits him when it reaches him in his lane; one that passes in another lane is gone', () => {
    expect(orbEvents([CATCH_AT - 0.01, 0.5, 0.5], [false, false, false], 0, [false, true, false]).hit).toBe(0)
    const r = orbEvents([PASS_AT - 0.01, 0.5, 0.5], [false, false, false], 1, [false, true, false])
    expect(r).toEqual({ resolved: [true, false, false], hit: null, missedTarget: false })
  })

  it('moving into a lane where a wrong orb is already passing is not a hit (it only hits when it reaches him in his lane)', () => {
    // the wrong orb in lane 2 crossed his front while he was in lane 0: it is gone, not waiting for him
    const r = orbEvents([0.5, 0.5, CATCH_AT - 0.01], [false, false, false], 0, [true, false, false])
    expect(r).toEqual({ resolved: [false, false, true], hit: null, missedTarget: false })
  })

  it('a two-orb wave: each orb in its own lane (lanes), the target caught in its lane only', () => {
    // orb 0 in lane 2, orb 1 (the target) in lane 0
    const k = [0.02, 0.02]
    expect(orbEvents(k, [false, false], 0, [false, true], [2, 0]).hit).toBe(1)
    expect(orbEvents(k, [false, false], 2, [false, true], [2, 0]).hit).toBe(0)
    expect(orbEvents(k, [false, false], 1, [false, true], [2, 0]).hit).toBe(null)
  })

})
