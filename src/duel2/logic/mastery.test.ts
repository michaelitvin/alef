import { describe, expect, it } from 'vitest'
import { FAST_LANE, fastLane, pushTowerTail, rating, screenRecent, skipInCycle, stage0Lane, towerMastered, visitScale, SHORT_AFTER } from './mastery'
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

/**
 * Stage 0 as the run plays it: tower visits of 2 waves of 5 monsters (a miss does not kill: the monster comes again),
 * every third visit a boss of 8 hits. `rule` 'old' (before 2026-11-13): the picker aims at 1 mistake in 5 from the
 * start, the check runs at a visit's end and only by towerMastered, and a visit halves to 1 wave after 8 clean answers.
 * 'new': the placement picker (cover), the check after every wave by either lane, no halving at stage 0. The hearts are
 * left out (a run that ends starts again at the tower). Returns the answers until Book 2 opens and the lane.
 */
function stage0Sim(p: number, seed: number, rule: 'old' | 'new', cap = 5000): { n: number; lane: 'fast' | 'slow' | null } {
  const rng = seeded(seed)
  const ids = DUEL_MARKS.map((m) => m.id)
  const lifetime: Record<string, Required<LifetimeTally>> = {}
  const recent: Record<string, string> = {}
  let tail = ''
  let n = 0
  const check = () => (rule === 'new' ? stage0Lane(recent, ids, tail) : towerMastered(recent, ids) ? 'slow' : null)
  for (let visit = 0; n < cap; visit++) {
    const boss = visit % 3 === 2
    const joined = Object.values(recent).join('')
    const waves = boss ? 1 : rule === 'old' && joined.length >= SHORT_AFTER && !joined.includes('x') ? 1 : 2
    for (let w = 0; w < waves; w++) {
      for (let kills = 0; kills < (boss ? 8 : 5) && n < cap;) {
        const m = pickTarget(rng, lifetime, recent, { cover: rule === 'new' })
        const right = rng() < p
        const t = (lifetime[m.id] ??= { seen: 0, correct: 0, wrong: 0, timeout: 0 })
        t.seen++
        if (right) { t.correct++; kills++ } else t.wrong++
        recent[m.id] = pushRecent(recent[m.id], !right)
        tail = pushTowerTail(tail, right)
        n++
      }
      const lane = rule === 'new' || w === waves - 1 ? check() : null
      if (lane) return { n, lane }
    }
  }
  return { n: cap, lane: null }
}
const runs = (p: number, rule: 'old' | 'new', k = 200) => Array.from({ length: k }, (_, i) => stage0Sim(p, i + 1, rule))
const sorted = (xs: { n: number }[]) => xs.map((x) => x.n).sort((a, b) => a - b)

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
  it('the fast lane: every mark answered, each mark’s latest answer right, and the last 10 tower answers right', () => {
    const ids = ['kamatz', 'chirik']
    const O10 = 'o'.repeat(FAST_LANE.tail)
    expect(fastLane({ kamatz: 'o', chirik: 'xo' }, ids, O10)).toBe(true)
    // a mark with no answer yet
    expect(fastLane({ kamatz: 'o' }, ids, O10)).toBe(false)
    // a mark whose latest answer is wrong
    expect(fastLane({ kamatz: 'o', chirik: 'ox' }, ids, O10)).toBe(false)
    // a mistake among the last 10, or fewer than 10 answers
    expect(fastLane({ kamatz: 'o', chirik: 'o' }, ids, 'oooxoooooo')).toBe(false)
    expect(fastLane({ kamatz: 'o', chirik: 'o' }, ids, 'ooooooooo')).toBe(false)
    expect(fastLane({}, [], O10)).toBe(false)
    // the tail keeps the last 10 answers in time order
    let t = ''
    for (const r of [false, ...Array(10).fill(true)]) t = pushTowerTail(t, r)
    expect(t).toBe(O10)
    expect(pushTowerTail(O10, false)).toBe('ooooooooox')
    // either lane passes stage 0; the fast one is named first
    expect(stage0Lane({ kamatz: 'o', chirik: 'o' }, ids, O10)).toBe('fast')
    expect(stage0Lane({ kamatz: 'ooox', chirik: 'ooo' }, ids, 'ooox')).toBe('slow')
    expect(stage0Lane({ kamatz: 'o', chirik: 'o' }, ids, 'oo')).toBe(null)
  })
  // Measured (200 simulated players each, answers until Book 2 opens; p10 / median / p90; how many by the fast lane):
  //   right   old rule           new rule           fast lane
  //   100 %   33 / 41 / 46       10 / 10 / 10       200 of 200
  //    95 %   40 / 50 / 81       10 / 10 / 60       188
  //    90 %   42 / 63 / 121      10 / 46 / 97       142
  //    80 %   57 / 100 / 182     31 / 92 / 170       36
  it('a perfect player opens Book 2 after the placement check: 10 answers (2 waves)', () => {
    const r = runs(1, 'new')
    expect(r.every((x) => x.n === 10 && x.lane === 'fast')).toBe(true)
    // the old rule needed about 40
    expect(sorted(runs(1, 'old'))[100]).toBeGreaterThanOrEqual(35)
  })
  it('a 95 %-right player: the median falls from about 50 answers to the placement check’s 10', () => {
    const now = sorted(runs(0.95, 'new'))
    const old = sorted(runs(0.95, 'old'))
    expect(now[100]).toBeLessThanOrEqual(15)
    expect(now[100]).toBeLessThan(old[100] / 2)
    expect(now[180]).toBeLessThanOrEqual(old[180])
  })
  it('a 90 %-right player opens sooner too', () => {
    expect(sorted(runs(0.9, 'new'))[100]).toBeLessThan(sorted(runs(0.9, 'old'))[100])
  })
  it('an 80 %-right player rarely takes the fast lane, and still needs about as long as before', () => {
    const r = runs(0.8, 'new')
    expect(r.filter((x) => x.lane === 'fast').length / r.length).toBeLessThan(0.25)
    const now = sorted(r)
    const old = sorted(runs(0.8, 'old'))
    expect(now[100]).toBeGreaterThanOrEqual(60)
    expect(now[100]).toBeLessThanOrEqual(old[100])
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
