import { describe, expect, it } from 'vitest'
import { rating, screenRecent, skipInCycle, towerMastered, visitScale } from './mastery'

describe('mastery', () => {
  it('the tower is mastered when every mark is at least 80 % right over at least 5 recent answers', () => {
    expect(towerMastered({ kamatz: 'ooooo', chirik: 'oooox' }, ['kamatz', 'chirik'])).toBe(true)
    expect(towerMastered({ kamatz: 'ooooo', chirik: 'ooxox' }, ['kamatz', 'chirik'])).toBe(false)
    expect(towerMastered({ kamatz: 'oooo' }, ['kamatz'])).toBe(false)
    expect(towerMastered({ kamatz: 'ooooo' }, ['kamatz', 'chirik'])).toBe(false)
  })
  it('a screen’s recent answers: the tower’s are the first duel’s, the others Book 2’s screen feature', () => {
    expect(screenRecent('tower', { 'sc:ghosts': 'xx' }, { kamatz: 'oo', chirik: 'x' })).toBe('oox')
    expect(screenRecent('ghosts', { 'sc:ghosts': 'xo' }, { kamatz: 'oo' })).toBe('xo')
    expect(screenRecent('ladder', {}, {})).toBe('')
  })
  it('shorter visits and every-other-cycle skips, never removal', () => {
    expect(visitScale('oooooooo')).toBe(0.5)
    expect(visitScale('ooooxooo')).toBe(1)
    expect(visitScale('ooooooo')).toBe(1)
    expect(visitScale('xoooooooo')).toBe(0.5)
    expect(skipInCycle('ghosts', 'o'.repeat(12), 1, 5)).toBe(true)
    expect(skipInCycle('ghosts', 'o'.repeat(12), 2, 5)).toBe(false)
    expect(skipInCycle('ghosts', 'o'.repeat(11), 1, 5)).toBe(false)
    expect(skipInCycle('ghosts', 'o'.repeat(11) + 'x', 1, 5)).toBe(false)
    expect(skipInCycle('tower', 'o'.repeat(12), 1, 5)).toBe(false)
    expect(skipInCycle('ghosts', 'o'.repeat(12), 1, 1)).toBe(false)
  })
  it('ratings', () => { expect([rating('oo'), rating('ooo'), rating('oxo'), rating('xxxo')]).toEqual([0, 3, 2, 1]) })
})
