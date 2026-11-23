import { describe, expect, it } from 'vitest'
import type { ItemStats } from '../predict'
import type { Spacing } from '../spacing'
import { RUNGS, type RungId } from '../rungs'
import { MIX, REVIEW_VARIANT_SHARE, SURE_RATE, TOP_RUNGS, TOP_SHARE, VARIANT_MAX_WITHOUT_MISSING100, belowOf, choosePractice, variantsFor } from './mix'
import type { Ladder, LadderSettings, Part } from './state'
import { ALL_ON, itemOf, lcg, ladderWith, passedThrough } from './testkit'

const ORDER = RUNGS.map((r) => r.id)

function run(l: Ladder, n: number, set: LadderSettings = ALL_ON, stats: Record<string, ItemStats> = {}, seed = 1) {
  const rng = lcg(seed)
  let ladder = l
  const out: { rung: RungId; part: Part; id: string; variant: boolean }[] = []
  let last: { fact?: string; sinceZero: number } = { sinceZero: 0 }
  for (let i = 0; i < n; i++) {
    const c = choosePractice(ladder, { rng, set, stats, last })
    ladder = c.ladder
    out.push({ rung: c.item.rung, part: c.part, id: c.item.id, variant: !!c.item.variant })
    last = { fact: c.item.fact, sinceZero: last.sinceZero + 1 }
  }
  return { rounds: out, ladder }
}
const share = <T>(xs: T[], p: (x: T) => boolean) => xs.filter(p).length / xs.length

describe('the mix', () => {
  it('the constants', () => {
    expect(MIX).toEqual({ frontier: 0.7, below: 0.2, review: 0.1 })
    expect(REVIEW_VARIANT_SHARE).toBe(1 / 3)
    expect([TOP_SHARE, TOP_RUNGS, SURE_RATE, VARIANT_MAX_WITHOUT_MISSING100]).toEqual([0.7, 3, 0.1, 20])
  })
  it('the rung below: the frontier\'s need highest in the order that is on', () => {
    expect(belowOf('1', ALL_ON)).toBeUndefined()
    expect(belowOf('13', ALL_ON)).toBe('12')
    expect(belowOf('T1', ALL_ON)).toBe('S1')
    expect(belowOf('T1', { ...ALL_ON, jumps: false })).toBe('10')
  })
  it('70% frontier, 20% the rung below, 10% review', () => {
    const { rounds } = run(ladderWith(passedThrough(ORDER, '6')), 2000)
    expect(share(rounds, (r) => r.part === 'frontier' && r.rung === '7')).toBeCloseTo(0.7, 1)
    expect(share(rounds, (r) => r.part === 'below' && r.rung === '6')).toBeCloseTo(0.2, 1)
    expect(share(rounds, (r) => r.part === 'review' && Number(r.rung) <= 5)).toBeCloseTo(0.1, 1)
  })
  it('rung 1 has no rung below: all frontier', () => {
    expect(run(ladderWith({}), 50).rounds.every((r) => r.part === 'frontier' && r.rung === '1')).toBe(true)
  })
  it('no review: its share goes to the rung below', () => {
    const { rounds } = run(ladderWith({ 1: 'passed' }), 2000)
    expect(share(rounds, (r) => r.part === 'below')).toBeCloseTo(0.3, 1)
  })
  it('after a strike, 6 rounds from the rung below and review only, then the frontier comes back', () => {
    const { rounds, ladder } = run(ladderWith(passedThrough(ORDER, '6'), { strikeLeft: 6 }), 6)
    expect(rounds.every((r) => r.part !== 'frontier')).toBe(true)
    expect(ladder.strikeLeft).toBe(0)
    expect(run(ladder, 200).rounds.some((r) => r.part === 'frontier')).toBe(true)
  })
  it('nothing free: review only, 70% from the top 3', () => {
    const set = { ...ALL_ON, range: '6' as RungId }
    const { rounds } = run(ladderWith(passedThrough(ORDER, '6')), 2000, set)
    expect(rounds.every((r) => r.part === 'review')).toBe(true)
    expect(share(rounds, (r) => ['4', '5', '6'].includes(r.rung))).toBeCloseTo(0.7, 1)
  })
  it('review and below take the lowest placed rung first', () => {
    const l = ladderWith({ 1: 'passed', 2: 'placed', 3: 'placed', 4: 'passed', 5: 'passed' })
    const review = run(l, 1000).rounds.filter((r) => r.part === 'review')
    expect(review.length).toBeGreaterThan(30)
    expect(review.every((r) => r.rung === '2')).toBe(true)
  })
  it('review takes items with a recorded mistake first', () => {
    const l = ladderWith(passedThrough(ORDER, '6'))
    const sore = itemOf('3', 4)
    const stats = { [sore.id]: { seen: 3, wrong: 2, timeout: 0, recent: 'xox', times: [], picks: {} } }
    const review = run(l, 1000, ALL_ON, stats).rounds.filter((r) => r.part === 'review')
    expect(review.length).toBeGreaterThan(30)
    // never the same fact twice in a row: when the last was it, another review item comes
    expect(share(review, (r) => r.id === sore.id)).toBeGreaterThan(0.8)
  })
  it('ring variants: in review and below only, about 1 in 3, once their ring place is earned', () => {
    const before = run(ladderWith(passedThrough(ORDER, 'C1')), 1500).rounds
    // 6 is passed: rung 7's variants (ring at b) come in the below part of the frontier 8
    expect(before.filter((r) => r.variant).every((r) => r.part !== 'frontier')).toBe(true)
    const below = before.filter((r) => r.part === 'below')
    expect(share(below, (r) => r.variant)).toBeGreaterThan(REVIEW_VARIANT_SHARE - 0.08)
    expect(share(below, (r) => r.variant)).toBeLessThan(REVIEW_VARIANT_SHARE + 0.08)
    // before 6 is earned: no variant at all
    expect(variantsFor(ladderWith(passedThrough(ORDER, '5')), '7', ALL_ON)).toEqual([])
    // × at b only once T4a is earned
    expect(variantsFor(ladderWith(passedThrough(ORDER, 'T3')), 'T2', ALL_ON)).toEqual([])
    expect(variantsFor(ladderWith(passedThrough(ORDER, 'T4a')), 'T2', ALL_ON).length).toBeGreaterThan(0)
  })
  it('with missing100 off, no variant above 20', () => {
    const l = ladderWith(passedThrough(ORDER, 'H1'))
    const on = variantsFor(l, 'H1', ALL_ON)
    expect(on.length).toBeGreaterThan(0)
    expect(variantsFor(l, 'H1', { ...ALL_ON, missing100: false })).toEqual([])
    for (const v of variantsFor(l, '7', { ...ALL_ON, missing100: false })) expect(Math.max(v.a, v.b, v.c)).toBeLessThanOrEqual(20)
  })
  it('the guard gives sure wins, and counts down', () => {
    const l = ladderWith(passedThrough(ORDER, '6'), { guardLeft: 2 })
    const easy = itemOf('2', 3)
    const stats = { [easy.id]: { seen: 40, wrong: 0, timeout: 0, recent: 'oooooooooooo', times: [], picks: {} } }
    const { rounds, ladder } = run(l, 2, ALL_ON, stats)
    expect(rounds.map((r) => r.part)).toEqual(['guard', 'guard'])
    expect(rounds[0].id).toBe(easy.id)
    expect(ladder.guardLeft).toBe(0)
  })
  it('the guard with no sure win: the lowest predicted items of earned rungs', () => {
    const { rounds } = run(ladderWith(passedThrough(ORDER, '6'), { guardLeft: 1 }), 1)
    // rung 1 has the lowest prior
    expect(rounds[0]).toMatchObject({ part: 'guard', rung: '1' })
  })
  it('a held rung is offered nowhere', () => {
    const l = ladderWith({ ...passedThrough(ORDER, '7'), C1: { status: 'held', holds: 1, freeOn: 9 } })
    expect(run(l, 500).rounds.some((r) => r.rung === 'C1')).toBe(false)
  })
  it('a switched-off rung is offered nowhere, not even in review', () => {
    const l = ladderWith(passedThrough(ORDER, 'T1'))
    const rounds = run(l, 800, { ...ALL_ON, compare: false, jumps: false }).rounds
    expect(rounds.some((r) => ['C1', 'S1'].includes(r.rung))).toBe(false)
  })

  describe('a mistake that is due', () => {
    const l = ladderWith({ ...passedThrough(ORDER, '6') })
    const missed = itemOf('1')
    const ctx = (rehearsals: Spacing['rehearsals'], set = ALL_ON) => ({
      rng: lcg(3), set, stats: {}, last: { sinceZero: 0, spacing: { round: 10, recent: [], rehearsals } },
    })
    it('is served as a review round although the part does not offer its fact', () => {
      const c = choosePractice(l, ctx([{ fact: missed.fact, item: missed.id, step: 1, due: 9 }]))
      expect(c.item.id).toBe(missed.id)
      expect(c.part).toBe('review')
    })
    it('is not served when its rung is out of range', () => {
      const far = itemOf('4')
      const c = choosePractice(l, ctx([{ fact: far.fact, item: far.id, step: 1, due: 9 }], { ...ALL_ON, range: '1' }))
      expect(c.item.id).not.toBe(far.id)
    })
    it('a rehearsal without an item id (an older save) is not served this way', () => {
      const c = choosePractice({ ...l, guardLeft: 0 }, ctx([{ fact: 'zzz', step: 1, due: 9 }]))
      expect(c.item.fact).not.toBe('zzz')
    })
    it('the guard never takes a rehearsal', () => {
      const c = choosePractice({ ...l, guardLeft: 2 }, ctx([{ fact: missed.fact, item: missed.id, step: 1, due: 9 }]))
      expect(c.part).toBe('guard')
    })
  })
})
