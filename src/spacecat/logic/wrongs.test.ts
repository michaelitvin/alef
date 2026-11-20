import { describe, expect, it } from 'vitest'
import type { Rng } from '../../shared/adaptive'
import { itemById, itemsOfRung, maxOfRung, variantsOf, type JumpsItem, type SumItem } from './facts'
import { COMPARE_LANES, LANES, NEAR, RIGHT_OFF_SHIP, SIGNS, TWO_DIGIT_FROM_ORDER, WHOLE_TENS_NEAR, WHOLE_TENS_PLACE, placeLanes, wrongAnswers } from './wrongs'
import { RUNGS, rungDef } from './rungs'

const lcg = (seed: number): Rng => {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}
const item = (id: string) => itemById(id) as SumItem | JumpsItem

describe('wrong answers', () => {
  it('constants', () => {
    expect([LANES, COMPARE_LANES, NEAR, RIGHT_OFF_SHIP]).toEqual([4, 3, 3, 0.9])
    expect([...SIGNS]).toEqual(['<', '=', '>'])
    expect([TWO_DIGIT_FROM_ORDER, WHOLE_TENS_NEAR, WHOLE_TENS_PLACE]).toEqual([7, 10, 20])
  })
  it('three different legal wrongs for every item of every rung', { timeout: 120000 }, () => {
    const rng = lcg(5)
    for (const { id: r } of RUNGS) {
      if (r === 'C1' || r === 'C2') continue
      const items = [...itemsOfRung(r), ...variantsOf(r, { b: true, a: true })] as (SumItem | JumpsItem)[]
      for (let n = 0; n < 200; n++) {
        const it = items[Math.floor(rng() * items.length)]
        const w = wrongAnswers(rng, it)
        const max = maxOfRung(it.rung)
        expect(w, `${it.id} of ${r}`).toHaveLength(3)
        expect(new Set(w).size).toBe(3)
        for (const x of w) {
          expect(Number.isInteger(x)).toBe(true)
          expect(x).toBeGreaterThanOrEqual(0)
          expect(x).toBeLessThanOrEqual(max)
          expect(x).not.toBe(it.answer)
        }
      }
    }
  })
  it('every item of the first rungs has three legal wrongs', () => {
    for (const r of ['1', '2', '3', '4', '5', '6', 'T1', 'T4a'] as const) {
      for (const it of itemsOfRung(r) as SumItem[]) {
        for (let seed = 1; seed <= 3; seed++) expect(wrongAnswers(lcg(seed), it)).toHaveLength(3)
      }
    }
  })
  it("the rung's misconception comes first", () => {
    const check = (id: string, first: number) => {
      for (let seed = 1; seed <= 10; seed++) expect(wrongAnswers(lcg(seed), item(id))[0]).toBe(first)
    }
    check('7+3=10/b', 7)   // 17 is above rung 4's highest number: the shown number comes instead
    check('13-6=7/c', 13)
    check('5,10,15,_', 21)
    check('3x4=12/b', 36)
    check('45+9=54/c', 44)
  })
  it('the misconception 9 comes as a wrong of 3 × ◯ = 12 when 36 is out of range or taken', () => {
    const all = new Set<number>()
    for (let seed = 1; seed <= 30; seed++) for (const n of wrongAnswers(lcg(seed), item('3x4=12/b'))) all.add(n)
    expect(all.has(36)).toBe(true)
  })
  it('the recorded pick comes first when legal; else the misconception', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(wrongAnswers(lcg(seed), item('3+4=7/c'), 9)[0]).toBe(9)
      expect(wrongAnswers(lcg(seed), item('3+4=7/c'), 7)[0]).not.toBe(7)
      expect(wrongAnswers(lcg(seed), item('3+4=7/c'), 99)).toHaveLength(3)
      expect(wrongAnswers(lcg(seed), item('3+4=7/c'), -1).every((n) => n >= 0)).toBe(true)
    }
  })
  it("near is the answer ± 1 and place is ± 10 (answer 10 or more) or ± 2 (below 10)", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const w = wrongAnswers(lcg(seed), item('13+4=17/c'))   // misconception 7
      expect(w).toContain(7)
      expect(w.some((n) => Math.abs(n - 17) === 1)).toBe(true)
      expect(w.some((n) => Math.abs(n - 17) === 10)).toBe(true)
      const s = wrongAnswers(lcg(seed), item('3+5=8/c'))   // misconception 3
      expect(s).toContain(3)
      expect(s.some((n) => Math.abs(n - 8) === 1)).toBe(true)
      expect(s.some((n) => Math.abs(n - 8) === 2)).toBe(true)
    }
  })
  it("rung 8's wrongs are whole tens (the misconception, the dropped zero, aside)", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const w = wrongAnswers(lcg(seed), item('30+40=70/c'))
      expect(w[0]).toBe(7)
      expect(w.slice(1).every((n) => n % 10 === 0 && [10, 20].includes(Math.abs(n - 70)))).toBe(true)
    }
    for (const it of itemsOfRung('8') as SumItem[]) {
      const w = wrongAnswers(lcg(it.c), it, 4)
      expect(w.slice(1).every((n) => n % 10 === 0)).toBe(true)
      expect(w).toHaveLength(3)
    }
  })
  it("times' place planet is a neighbour product", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const w = wrongAnswers(lcg(seed), item('7x8=56/c'))
      expect(w).toContain(48)
      expect(w.some((n) => [63, 64, 49, 55, 57].includes(n))).toBe(true)   // the second neighbour, or the ± 1 that the digit rule keeps
    }
  })
  it('divide: the place planet is the quotient ± 1', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const w = wrongAnswers(lcg(seed), item('12/3=4/c'))
      expect(w).toContain(3)
      expect(w.some((n) => Math.abs(n - 4) === 1)).toBe(true)
    }
  })
  it('a 2-digit answer has a wrong with its ones digit and one with its tens digit', () => {
    const rng = lcg(21)
    for (const r of ['10', '11', '13', '15', '16', '17', '18', 'H1', 'T3', 'T5', 'S1', 'S2'] as const) {
      const items = itemsOfRung(r) as (SumItem | JumpsItem)[]
      for (let n = 0; n < 150; n++) {
        const it = items[Math.floor(rng() * items.length)]
        if (it.answer < 10 || it.answer > 99) continue
        const w = wrongAnswers(rng, it)
        expect(w.some((x) => x % 10 === it.answer % 10), `${it.id} ones ${w}`).toBe(true)
        expect(w.some((x) => Math.floor(x / 10) === Math.floor(it.answer / 10)), `${it.id} tens ${w}`).toBe(true)
      }
    }
  })
  it('45 + 9: both digits', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const w = wrongAnswers(lcg(seed), item('45+9=54/c'))
      expect(w.some((x) => x % 10 === 4)).toBe(true)
      expect(w.some((x) => Math.floor(x / 10) === 5)).toBe(true)
    }
  })
  it("rung order of the rule", () => {
    expect(rungDef('7').order).toBe(TWO_DIGIT_FROM_ORDER)
  })
})

describe('lanes', () => {
  it("the answer is off the ship's lane 9 in 10", () => {
    const rng = lcg(11)
    let off = 0
    for (let i = 0; i < 5000; i++) if (placeLanes(rng, '5', ['4', '6', '7'], i % LANES, LANES).rightLane !== i % LANES) off++
    expect(off / 5000).toBeGreaterThan(0.88)
    expect(off / 5000).toBeLessThan(0.92)
  })
  it('labels hold the answer once, at the right lane', () => {
    const rng = lcg(5)
    for (let i = 0; i < 200; i++) {
      const { labels, rightLane } = placeLanes(rng, '5', ['4', '6', '7'], i % LANES, LANES)
      expect(labels).toHaveLength(LANES)
      expect(labels.filter((n) => n === '5')).toHaveLength(1)
      expect(labels[rightLane]).toBe('5')
      expect([...labels].sort()).toEqual(['4', '5', '6', '7'])
    }
  })
  it('3 lanes for a comparison, the signs each once', () => {
    const rng = lcg(8)
    const seen = new Set<number>()
    for (let i = 0; i < 300; i++) {
      const { labels, rightLane } = placeLanes(rng, '<', ['=', '>'], i % COMPARE_LANES, COMPARE_LANES)
      expect(labels).toHaveLength(COMPARE_LANES)
      expect([...labels].sort()).toEqual(['<', '=', '>'])
      expect(labels[rightLane]).toBe('<')
      seen.add(rightLane)
    }
    expect(seen.size).toBe(3)
  })
})
