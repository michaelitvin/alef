import { describe, expect, it } from 'vitest'
import {
  COIN_VALUES, FIRST_PRICE, PILE_CAP, composeCoins, countSteps, hintCoins, merchantDue, payable, piles, priceAt, verdict,
  type NumberRange,
} from './merchant'

/** a fixed-sequence rng: the values in turn, again and again */
const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length] }
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('the merchant (pure rules)', () => {
  it('prices: 6, then ×1.5 rounded, capped at the range', () => {
    expect(FIRST_PRICE).toBe(6)
    expect([0, 1, 2, 3].map((n) => priceAt(n, 100))).toEqual([6, 9, 14, 20])
    expect(priceAt(2, 10)).toBe(10)
    expect(priceAt(20, 1000)).toBe(1000)
  })
  it('he comes only in the adventure, with fewer than 3 hearts and enough coins', () => {
    const base = { adventure: true, hearts: 1, coins: 6, price: 6, sinceVisit: Infinity, bossNext: false }
    expect(merchantDue(base)).toBe(true)
    expect(merchantDue({ ...base, coins: 5 })).toBe(false)
    expect(merchantDue({ ...base, hearts: 3 })).toBe(false)
    expect(merchantDue({ ...base, adventure: false })).toBe(false)
  })
  it('on the last heart at the next checkpoint, even right after a visit', () => {
    expect(merchantDue({ adventure: true, hearts: 1, coins: 50, price: 6, sinceVisit: 0, bossNext: false })).toBe(true)
  })
  it('with 2 hearts every other checkpoint, and always before a boss', () => {
    const two = { adventure: true, hearts: 2, coins: 50, price: 6, bossNext: false }
    expect(merchantDue({ ...two, sinceVisit: 1 })).toBe(false)
    expect(merchantDue({ ...two, sinceVisit: 2 })).toBe(true)
    expect(merchantDue({ ...two, sinceVisit: 1, bossNext: true })).toBe(true)
    expect(merchantDue({ ...two, sinceVisit: 1, bossNext: true, coins: 5 })).toBe(false)
  })
  it('a large balance in a small range: only that range’s coins, sums to the balance, payable, piles drawn at most 6', () => {
    const c = composeCoins(340, 7, 10, 2, seq(0.3))
    expect(c.every((v) => [1, 2, 5, 10].includes(v))).toBe(true)
    expect(sum(c)).toBe(340)
    expect(payable(c, 7)).toBe(true)
    expect(piles(c).every((p) => p.drawn <= PILE_CAP)).toBe(true)
    // mostly the largest value
    expect(c.filter((v) => v === 10).length).toBeGreaterThan(c.length / 2)
  })
  it('the balance equal to the price is payable at every level', () => {
    for (const level of [0, 1, 2]) {
      const c = composeCoins(6, 6, 100, level, seq(0.5))
      expect(sum(c)).toBe(6)
      expect(payable(c, 6)).toBe(true)
    }
  })
  it('level 0: two coins or fewer make the price; level 2: there is a coin bigger than the price', () => {
    expect(hintCoins(composeCoins(30, 7, 100, 0, seq(0.1)), 7).length).toBeLessThanOrEqual(2)
    expect(composeCoins(60, 7, 100, 2, seq(0.1)).some((v) => v > 7)).toBe(true)
  })
  it('level 1 and 2: the price needs at least three coins', () => {
    for (const level of [1, 2]) expect(hintCoins(composeCoins(60, 7, 100, level, seq(0.1)), 7).length).toBeGreaterThanOrEqual(3)
  })
  it('every range, balance and level: the coins are the range’s, sum to the balance and make the price', () => {
    const rng = seeded(7)
    for (const range of [10, 100, 1000] as NumberRange[])
      for (const price of [6, 9, 14, 20, 30, 46, 68, 103]) {
        const p = Math.min(price, range)
        for (const balance of [p, p + 1, p + 3, p * 2 + 1, 97, 340, 1234]) {
          if (balance < p) continue
          for (const level of [0, 1, 2]) {
            const c = composeCoins(balance, p, range, level, rng)
            expect(c.every((v) => COIN_VALUES[range].includes(v)), `${range} ${p} ${balance} ${level}`).toBe(true)
            expect(sum(c)).toBe(balance)
            expect(payable(c, p), `${range} ${p} ${balance} ${level}`).toBe(true)
          }
        }
      }
  })
  it('the hint: a payable choice with the fewest coins; none when the price cannot be made', () => {
    expect(hintCoins([5, 5, 2, 2, 2, 1, 1], 7).sort((a, b) => a - b)).toEqual([2, 5])
    expect(hintCoins([2, 2, 2, 1], 7).sort((a, b) => a - b)).toEqual([1, 2, 2, 2])
    expect(payable([5, 5], 7)).toBe(false)
    expect(hintCoins([5, 5], 7)).toEqual([])
  })
  it('piles: one per value, ascending, drawn up to the cap', () => {
    expect(piles([10, 1, 2, 2, 10, 10, 10, 10, 10, 10, 10, 10])).toEqual([
      { value: 1, count: 1, drawn: 1 }, { value: 2, count: 2, drawn: 2 }, { value: 10, count: 9, drawn: 6 },
    ])
  })
  it('counting and the verdict', () => {
    expect(countSteps([5, 2])).toEqual([5, 7])
    expect([verdict(7, 7), verdict(5, 7), verdict(10, 7)]).toEqual(['exact', 'short', 'over'])
  })
})
