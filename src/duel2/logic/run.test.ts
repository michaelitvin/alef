import { describe, expect, it } from 'vitest'
import { CYCLE, cycleOf, heartsOnScreenStart, laneAt, newRound, nextScreen, onAnswer, runStart, travelMs, waveX, BASE_TRAVEL_MS } from './run'

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
  it('next run starts after the screen where the last ended', () => {
    expect(runStart(4, 'ladder')).toBe('ghosts')
    expect(runStart(4, 'doors')).toBe('broom')
    expect(runStart(1, 'cauldron')).toBe('broom')
    expect(runStart(4, null)).toBe('broom')
  })
  it('hearts refill per screen and a near miss is forgiven once per round', () => {
    let h = heartsOnScreenStart()
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
    let h = heartsOnScreenStart()
    let over = false
    for (let i = 0; i < 3; i++) ({ hearts: h, over } = onAnswer(h, 'wrong'))
    expect(over).toBe(true)
  })
  it('travel speeds up per cycle with a floor', () => {
    expect(travelMs(1, 0)).toBe(5200)
    expect(travelMs(1, 50)).toBeCloseTo(BASE_TRAVEL_MS * 0.6)
    expect(travelMs(1, 1)).toBeCloseTo(5200 * 0.93)
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
})
