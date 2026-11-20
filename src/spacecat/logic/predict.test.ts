import { describe, expect, it } from 'vitest'
import { RECENT_KEEP, predictedMistakeRate, type Rng } from '../../shared/adaptive'
import { itemsOfRung, isRareFact, isZeroFact, type CompareItem, type Item, type JumpsItem } from './facts'
import {
  C2_TRICKY_SHARE, EQUAL_SHARE, PRIOR_FIRST, PRIOR_NEW_RUNG, S2_LAST_SHARE, SAMPLE_MAX, ZERO_EVERY, isTricky, pickNext, predictItem, priorOf,
  pushMark, samplePool, type ItemStats,
} from './predict'

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

describe('picking from large pools', () => {
  it('the constants', () => {
    expect(SAMPLE_MAX).toBe(300)
    expect([EQUAL_SHARE, C2_TRICKY_SHARE, S2_LAST_SHARE]).toEqual([0.2, 0.5, 2 / 3])
  })
  it('a pool larger than SAMPLE_MAX keeps every item with stats and a sample of the rest', () => {
    const pool = itemsOfRung('16')
    expect(pool.length).toBeGreaterThan(SAMPLE_MAX)
    const st: Record<string, ItemStats> = {}
    for (const i of [5, 900, 2000]) st[pool[i].id] = stats(1, 0, 'o')
    const cut = samplePool(lcg(4), pool, st)
    expect(cut.length).toBe(SAMPLE_MAX + 3)
    for (const i of [5, 900, 2000]) expect(cut).toContain(pool[i])
    expect(new Set(cut).size).toBe(cut.length)
    for (const it of cut) expect(pool).toContain(it)
    const small = itemsOfRung('1')
    expect(samplePool(lcg(4), small, {})).toBe(small)
  })
  it('a comparison has = right in 1 in 5', () => {
    const rng = lcg(5)
    const pool = itemsOfRung('C1')
    let eq = 0
    const n = 4000
    for (let i = 0; i < n; i++) if ((pickNext(rng, pool, {}, { sinceZero: 0 }) as CompareItem).answer === '=') eq++
    expect(eq / n).toBeGreaterThan(0.17)
    expect(eq / n).toBeLessThan(0.23)
  })
  it('C2: half the pairs have the same tens or swapped digits', () => {
    expect(isTricky({ a: 43, b: 47 })).toBe(true)
    expect(isTricky({ a: 38, b: 83 })).toBe(true)
    expect(isTricky({ a: 38, b: 61 })).toBe(false)
    const rng = lcg(6)
    const pool = itemsOfRung('C2')
    let tricky = 0, other = 0
    for (let i = 0; i < 4000; i++) {
      const it = pickNext(rng, pool, {}, { sinceZero: 0 }) as CompareItem
      if (it.answer === '=') continue
      if (isTricky(it)) tricky++
      else other++
    }
    expect(tricky / (tricky + other)).toBeGreaterThan(0.45)
    expect(tricky / (tricky + other)).toBeLessThan(0.55)
  })
  it('S2: the ring last in 2 rounds of 3', () => {
    const rng = lcg(8)
    const pool = itemsOfRung('S2')
    let last = 0
    const n = 3000
    for (let i = 0; i < n; i++) if ((pickNext(rng, pool, {}, { sinceZero: 0 }) as JumpsItem).hole === 3) last++
    expect(last / n).toBeGreaterThan(0.62)
    expect(last / n).toBeLessThan(0.71)
  })
  it('a pool that a roll empties is used whole', () => {
    const noEqual = itemsOfRung('C1').filter((i) => (i as CompareItem).answer !== '=').slice(0, 5)
    const rng = lcg(9)
    for (let i = 0; i < 50; i++) expect(noEqual).toContain(pickNext(rng, noEqual, {}, { sinceZero: 0 }))
  })
  it('times 1 and times 0 are rare too (the same counter)', () => {
    const rng = lcg(10)
    const cands = itemsOfRung('T2')
    expect(cands.some((i) => isRareFact(i) && !isZeroFact(i))).toBe(true)
    let last: { fact?: string; sinceZero: number } = { sinceZero: 0 }
    const at: number[] = []
    for (let n = 0; n < 300; n++) {
      const it = pickNext(rng, cands, {}, last)
      if (isRareFact(it)) at.push(n)
      last = { fact: it.fact, sinceZero: isRareFact(it) ? 0 : last.sinceZero + 1 }
    }
    expect(at.length).toBeGreaterThan(0)
    for (let i = 1; i < at.length; i++) expect(at[i] - at[i - 1]).toBeGreaterThanOrEqual(ZERO_EVERY)
  })
})
