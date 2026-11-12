import { describe, expect, it } from 'vitest'
import { CYCLE, HEARTS, VISIT, coinsFor, cycleOf, heartsAtRunStart, laneAt, multiplierOf, passEndHeart, newRound, nextScreen, onAnswer, runStart, travelMs, waveX, BASE_TRAVEL_MS, orbEvents, waveTick, wavePos, CATCH_AT, PASS_AT, flightPace, PACE_MIN, PACE_MAX } from './run'

describe('run', () => {
  it('cycle per stage: the tower first', () => {
    expect(cycleOf(1)).toEqual(['tower', 'broom', 'ghosts'])
    expect(cycleOf(4)).toEqual(['tower', ...CYCLE])
  })
  it('next screen wraps and marks a new cycle', () => {
    expect(nextScreen(4, 'ladder')).toEqual({ screen: 'ghosts', newCycle: false })
    expect(nextScreen(4, 'doors')).toEqual({ screen: 'tower', newCycle: true })
    expect(nextScreen(4, 'tower')).toEqual({ screen: 'broom', newCycle: false })
    expect(nextScreen(1, 'ghosts')).toEqual({ screen: 'tower', newCycle: true })
  })
  it('drawing comes after the doors: print, then handwriting, from stage 1, only when on', () => {
    expect(cycleOf(4, true)).toEqual(['tower', 'broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'draw', 'draw-hand'])
    expect(cycleOf(1, true)).toEqual(['tower', 'broom', 'ghosts', 'draw', 'draw-hand'])
    expect(cycleOf(4, false)).toEqual(['tower', ...CYCLE])
    expect(nextScreen(4, 'doors', true)).toEqual({ screen: 'draw', newCycle: false })
    expect(nextScreen(4, 'draw', true)).toEqual({ screen: 'draw-hand', newCycle: false })
    expect(nextScreen(4, 'draw-hand', true)).toEqual({ screen: 'tower', newCycle: true })
    expect(VISIT['draw-hand']).toBe(3)
  })
  it('stage 0: only the tower; then the tower comes first', () => {
    expect(cycleOf(1, true, false)).toEqual(['tower'])
    expect(cycleOf(1, true, true)).toEqual(['tower', 'broom', 'ghosts', 'draw', 'draw-hand'])
    expect(nextScreen(1, 'tower', false, false)).toEqual({ screen: 'tower', newCycle: true })
    expect(runStart(3, 'ladder', true, false)).toBe('tower')
    expect(VISIT.tower).toBe(2)
  })
  it('an old save that ended on the drawing screen starts the next run at a valid screen', () => {
    expect(runStart(4, 'draw', true)).toBe('draw-hand')
    expect(runStart(4, 'draw', false)).toBe('tower')
  })
  it('next run starts after the screen where the last ended', () => {
    expect(runStart(4, 'ladder')).toBe('ghosts')
    expect(runStart(4, 'doors')).toBe('tower')
    expect(runStart(4, 'tower')).toBe('broom')
    expect(runStart(1, 'cauldron')).toBe('tower')
    expect(runStart(4, null)).toBe('tower')
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

  describe('waveTick: a wave costs at most one heart', () => {
    const isT = [false, true, false]
    it('the catch of the target spends the wave: a wrong orb of it that comes after is harmless', () => {
      const a = waveTick([0.5, CATCH_AT - 0.01, 0.5], { resolved: [false, false, false] }, 1, isT)
      expect(a.event).toEqual({ kind: 'catch', orb: 1 })
      expect(a.spent).toBe(true)
      // he moves into lane 2 as its wrong orb reaches him: no hit
      const b = waveTick([0.5, -0.2, CATCH_AT - 0.01], { resolved: a.resolved, spent: a.spent }, 2, isT)
      expect(b.event).toBe(null)
      expect(b.resolved[2]).toBe(true)
    })
    it('a hit spends the wave: its target flying past is not a second mistake', () => {
      const a = waveTick([CATCH_AT - 0.01, 0.5, 0.5], { resolved: [false, false, false] }, 0, isT)
      expect(a.event).toEqual({ kind: 'hit', orb: 0 })
      expect(a.spent).toBe(true)
      const b = waveTick([-0.5, PASS_AT - 0.01, 0.5], { resolved: a.resolved, spent: true }, 0, isT)
      expect(b.event).toBe(null)
      expect(b.resolved[1]).toBe(true)
    })
    it('a target flying past is a miss and spends the wave', () => {
      const a = waveTick([0.5, PASS_AT - 0.01, 0.5], { resolved: [false, false, false] }, 0, isT)
      expect(a.event).toEqual({ kind: 'miss' })
      expect(a.spent).toBe(true)
    })
    it('no event: the wave stays open', () => {
      const a = waveTick([0.5, 0.5, 0.5], { resolved: [false, false, false] }, 0, isT)
      expect(a).toEqual({ resolved: [false, false, false], spent: false, event: null })
    })
  })

})
