import { describe, expect, it } from 'vitest'
import { RECENT_KEEP, predictedMistakeRate, type Rng } from '../../shared/adaptive'
import { itemsOfRung, isZeroFact, type Item } from './facts'
import { PRIOR_FIRST, PRIOR_NEW_RUNG, ZERO_EVERY, pickNext, predictItem, priorOf, pushMark, type ItemStats } from './predict'

const lcg = (seed: number): Rng => {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}
const stats = (seen: number, wrong: number, recent: string, timeout = 0): ItemStats => ({ seen, wrong, timeout, recent, times: [], picks: {} })

describe('prediction', () => {
  it('a time-out is half a mistake', () => {
    const s = stats(4, 0, 'oott', 2)
    // the same formula by hand: t is worth 0.5
    const asWrong = predictedMistakeRate({ seen: 4, wrong: 2 }, 'ooxx', 0.3)
    const asRight = predictedMistakeRate({ seen: 4, wrong: 0 }, 'oooo', 0.3)
    expect(predictItem(s, 0.3)).toBeCloseTo((asWrong + asRight) / 2, 12)
  })
  it('prior is used when unseen', () => {
    expect(predictItem(undefined, 0.3)).toBe(predictedMistakeRate(undefined, '', 0.3))
  })
  it('priors', () => {
    expect(PRIOR_FIRST).toBe(0.25)
    expect(PRIOR_NEW_RUNG).toBe(0.3)
    expect(ZERO_EVERY).toBe(15)
    expect(priorOf(itemsOfRung('1')[0])).toBe(PRIOR_FIRST)
    expect(priorOf(itemsOfRung('2')[0])).toBe(PRIOR_NEW_RUNG)
  })
  it('pushMark keeps 12', () => {
    let r: string | undefined
    for (let i = 0; i < 30; i++) r = pushMark(r, i % 2 ? 'x' : 'o')
    expect(r!.length).toBe(RECENT_KEEP)
    expect(RECENT_KEEP).toBe(12)
    expect(pushMark(undefined, 't')).toBe('t')
  })
  it('never the same fact twice in a row', () => {
    const rng = lcg(1)
    const cands = itemsOfRung('1')
    for (let i = 0; i < 1000; i++) expect(pickNext(rng, cands, {}, { fact: '+2,3', sinceZero: 0 }).fact).not.toBe('+2,3')
  })
  it('aims at one in five', () => {
    const base = itemsOfRung('2').filter((i) => !isZeroFact(i))
    const three = [base[0], base[2], base[4]]
    const st: Record<string, ItemStats> = {}
    // heavy lifetime tallies make the predictions near 0.05, 0.2 and 0.6
    const mk = (rate: number): ItemStats => ({ seen: 1000, wrong: rate * 1000, timeout: 0, recent: '', times: [], picks: {} })
    st[three[0].id] = mk(0.05)
    st[three[1].id] = mk(0.2)
    st[three[2].id] = mk(0.6)
    const rng = lcg(7)
    const count = [0, 0, 0]
    for (let i = 0; i < 1000; i++) count[three.indexOf(pickNext(rng, three, st, { sinceZero: 0 }))]++
    expect(count[1]).toBeGreaterThan(count[0])
    expect(count[1]).toBeGreaterThan(count[2])
  })
  it('zero facts at most 1 in 15', () => {
    const rng = lcg(3)
    const cands = [...itemsOfRung('1'), ...itemsOfRung('2')]
    expect(cands.some(isZeroFact)).toBe(true)
    let last: { fact?: string; sinceZero: number } = { sinceZero: 0 }
    const zeroAt: number[] = []
    for (let n = 0; n < 300; n++) {
      const it: Item = pickNext(rng, cands, {}, last)
      const z = isZeroFact(it)
      if (z) zeroAt.push(n)
      last = { fact: it.fact, sinceZero: z ? 0 : last.sinceZero + 1 }
    }
    for (let i = 1; i < zeroAt.length; i++) expect(zeroAt[i] - zeroAt[i - 1]).toBeGreaterThanOrEqual(ZERO_EVERY)
  })
  it('falls back when dropping leaves nothing', () => {
    const only = itemsOfRung('1').filter(isZeroFact)
    const it = pickNext(lcg(2), only, {}, { sinceZero: 0 })
    expect(only).toContain(it)
  })
})
