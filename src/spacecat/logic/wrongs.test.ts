import { describe, expect, it } from 'vitest'
import type { Rng } from '../../shared/adaptive'
import { LANES, NEAR, RIGHT_OFF_SHIP, placeLanes, wrongAnswers } from './wrongs'

const lcg = (seed: number): Rng => {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

describe('wrong answers', () => {
  it('constants', () => {
    expect(LANES).toBe(4)
    expect(NEAR).toBe(3)
    expect(RIGHT_OFF_SHIP).toBe(0.9)
  })
  it('three different numbers in range, never the answer', () => {
    for (const max of [5, 10, 20]) {
      for (let answer = 0; answer <= max; answer++) {
        for (let seed = 1; seed <= 20; seed++) {
          const w = wrongAnswers(lcg(seed), answer, max)
          expect(w).toHaveLength(3)
          expect(new Set(w).size).toBe(3)
          for (const n of w) {
            expect(n).not.toBe(answer)
            expect(n).toBeGreaterThanOrEqual(0)
            expect(n).toBeLessThanOrEqual(max)
            expect(Math.abs(n - answer)).toBeLessThanOrEqual(NEAR)
          }
        }
      }
    }
  })
  it('the recorded wrong pick is included', () => {
    for (let seed = 1; seed <= 20; seed++) expect(wrongAnswers(lcg(seed), 7, 20, 12)).toContain(12)
    for (let seed = 1; seed <= 20; seed++) expect(wrongAnswers(lcg(seed), 7, 20, 9)).toContain(9)
  })
  it('a confusion out of range is ignored', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(wrongAnswers(lcg(seed), 7, 10, 15).every((n) => n <= 10)).toBe(true)
      expect(wrongAnswers(lcg(seed), 7, 10, 7)).not.toContain(7)
      expect(wrongAnswers(lcg(seed), 7, 10, -1).every((n) => n >= 0)).toBe(true)
    }
  })
})

describe('lanes', () => {
  it("the answer is off the ship's lane 9 in 10", () => {
    const rng = lcg(11)
    let off = 0
    for (let i = 0; i < 5000; i++) if (placeLanes(rng, 5, [4, 6, 7], i % LANES).rightLane !== i % LANES) off++
    expect(off / 5000).toBeGreaterThan(0.88)
    expect(off / 5000).toBeLessThan(0.92)
  })
  it('labels hold the answer once, at the right lane', () => {
    const rng = lcg(5)
    for (let i = 0; i < 200; i++) {
      const { labels, rightLane } = placeLanes(rng, 5, [4, 6, 7], i % LANES)
      expect(labels).toHaveLength(LANES)
      expect(labels.filter((n) => n === 5)).toHaveLength(1)
      expect(labels[rightLane]).toBe(5)
      expect([...labels].sort()).toEqual([4, 5, 6, 7])
    }
  })
})
