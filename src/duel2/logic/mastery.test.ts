import { describe, expect, it } from 'vitest'
import { rating, screenRecent, skipInCycle, towerMastered, visitScale } from './mastery'
import { pickTarget, type LifetimeTally } from '../../utils/duel/rounds'
import { DUEL_MARKS } from '../../utils/duel/marks'
import { pushRecent } from '../../shared/adaptive'

/** a seeded rng (mulberry32) */
const seeded = (a: number) => () => {
  a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
/**
 * A new player who is right 80 % of the time, on the tower's own target picker (the first duel's adaptive data, kept as
 * recordDuelRound keeps it): the answers until the tower is mastered (`cap` if never).
 */
function answersToOpen(seed: number, cap = 5000): number {
  const rng = seeded(seed)
  const ids = DUEL_MARKS.map((m) => m.id)
  const lifetime: Record<string, Required<LifetimeTally>> = {}
  const recent: Record<string, string> = {}
  for (let n = 0; n < cap; n++) {
    if (towerMastered(recent, ids)) return n
    const m = pickTarget(rng, lifetime, recent)
    const right = rng() < 0.8
    const t = (lifetime[m.id] ??= { seen: 0, correct: 0, wrong: 0, timeout: 0 })
    t.seen++
    if (right) t.correct++
    else t.wrong++
    recent[m.id] = pushRecent(recent[m.id], !right)
  }
  return cap
}

describe('mastery', () => {
  it('the tower is mastered when every mark has 3 recent answers and 75 % of all of them together are right', () => {
    // one weak mark is carried by the others: 6 right of 8
    expect(towerMastered({ kamatz: 'ooooo', chirik: 'xxo' }, ['kamatz', 'chirik'])).toBe(true)
    expect(towerMastered({ kamatz: 'ooo', chirik: 'oxo' }, ['kamatz', 'chirik'])).toBe(true)
    // 5 right of 7: under 75 %
    expect(towerMastered({ kamatz: 'oooo', chirik: 'xxo' }, ['kamatz', 'chirik'])).toBe(false)
    // a mark with fewer than 3 recent answers
    expect(towerMastered({ kamatz: 'oooooooooooo', chirik: 'oo' }, ['kamatz', 'chirik'])).toBe(false)
    expect(towerMastered({ kamatz: 'ooooo' }, ['kamatz', 'chirik'])).toBe(false)
    expect(towerMastered({}, [])).toBe(false)
  })
  it('a simulated 80 %-right new player opens Book 2 after about ten tower visits, not thousands of answers', () => {
    const n = Array.from({ length: 200 }, (_, k) => answersToOpen(k + 1)).sort((a, b) => a - b)
    const median = n[100]
    // measured: median 95 answers (10 per tower visit), 10th percentile 51, 90th 168
    expect(median).toBeGreaterThanOrEqual(30)
    expect(median).toBeLessThanOrEqual(110)
    expect(n[180]).toBeLessThan(250)
    expect(n[199]).toBeLessThan(5000)
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
