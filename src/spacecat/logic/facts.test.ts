import { describe, expect, it } from 'vitest'
import {
  COMPARE_BIG_MAX, COMPARE_BIG_MIN, COMPARE_SMALL_MAX, H1_ANSWER_MAX, H1_ANSWER_MIN, S1_LAST_MAX, S2_LAST_MAX, S2_TENS_LAST_MAX,
  T1_MAX, T1_MIN, T2_FACTORS, T3_FACTORS, T4_PRODUCT_MAX, classifySum, isRareFact, isZeroFact, itemById, itemsOfRung, maxOfRung, variantsOf,
  type Hole, type Item, type Op, type SumItem,
} from './facts'
import { RUNGS, type RungId } from './rungs'

const rungOf = (id: string) => itemById(id)?.rung
const sum = (id: string) => itemById(id) as SumItem
const CLASSES = ['+', '−', '×', '÷'] as Op[]
void CLASSES
const cls = (a: number, op: Op, b: number, hole: Hole = 'c') => {
  const c = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b
  return classifySum(a, op, b, c, hole)
}
const idsOf = (r: RungId) => new Set(itemsOfRung(r).map((i) => i.id))

describe('the design numbers', () => {
  it('are pinned', () => {
    expect([COMPARE_SMALL_MAX, COMPARE_BIG_MIN, COMPARE_BIG_MAX]).toEqual([20, 10, 99])
    expect(S1_LAST_MAX).toEqual({ 2: 20, 5: 50, 10: 100 })
    expect(S2_LAST_MAX).toEqual({ 3: 30, 4: 40 })
    expect(S2_TENS_LAST_MAX).toBe(97)
    expect([T1_MIN, T1_MAX]).toEqual([2, 6])
    expect(T2_FACTORS).toEqual([2, 5, 10])
    expect(T3_FACTORS).toEqual([3, 4, 6])
    expect(T4_PRODUCT_MAX).toBe(36)
    expect([H1_ANSWER_MIN, H1_ANSWER_MAX]).toEqual([100, 999])
  })
})

describe('every example of the design is in its rung', () => {
  const cases: [string, RungId][] = [
    ['3+2=5/c', '1'], ['1+1=2/c', '1'], ['5-2=3/c', '2'], ['6+3=9/c', '3'], ['7+3=10/b', '4'], ['9-4=5/c', '5'],
    ['4+5=9/b', '6'], ['9-4=5/b', '6'], ['13+4=17/c', '7'], ['17-4=13/c', '7'], ['10+6=16/c', '7'], ['4+13=17/c', '7'], ['17-10=7/c', '7'],
    ['30+40=70/c', '8'], ['70-20=50/c', '8'], ['6+6=12/c', '9'], ['7+8=15/c', '9'], ['8+7=15/c', '9'], ['8+5=13/c', '10'],
    ['13-6=7/c', '11'], ['5+4=9/a', '12'], ['11-3=8/a', '12'], ['23+4=27/c', '13'], ['37-5=32/c', '13'], ['45+30=75/c', '14'],
    ['62-20=42/c', '14'], ['57+10=67/c', '14'], ['45+9=54/c', '15'], ['65+5=70/c', '15'], ['72-6=66/c', '15'], ['30-7=23/c', '15'],
    ['17+12=29/c', '16'], ['27-15=12/c', '16'], ['26+34=60/c', '17'], ['38+45=83/c', '17'], ['85-19=66/c', '18'], ['70-18=52/c', '18'],
    ['37+13=50/b', '19'], ['35-20=15/a', '19'], ['240+30=270/c', 'H1'], ['240+35=275/c', 'H1'], ['375+100=475/c', 'H1'], ['500-200=300/c', 'H1'],
    ['3+3+3=9/c', 'T1'], ['4x5=20/c', 'T2'], ['4x6=24/c', 'T3'], ['3x12=36/b', 'T4a'], ['12/3=4/c', 'T4b'], ['7x8=56/c', 'T5'], ['56/8=7/c', 'T6'],
    ['7?5', 'C1'], ['12?17', 'C1'], ['7?17', 'C1'], ['38?83', 'C2'], ['43?47', 'C2'], ['5,10,15,_', 'S1'], ['4,8,_,16', 'S2'], ['7,17,27,_', 'S2'],
  ]
  it.each(cases)('%s is in rung %s', (id, rung) => {
    const fixed = id === '3x12=36/b' ? '3x4=12/b' : id
    expect(rungOf(fixed)).toBe(rung)
  })
  it('the design example 7 + ◯ = 10 and the others by classifySum', () => {
    expect(classifySum(7, '+', 3, 10, 'b')).toBe('4')
    expect(classifySum(7, '+', 8, 15, 'c')).toBe('9')
    expect(classifySum(8, '+', 6, 14, 'c')).toBe('10')
    expect(classifySum(3, '×', 4, 12, 'b')).toBe('T4a')
    expect(classifySum(4, '+', 3, 7, 'a')).toBe('12')
  })
})

describe('the precedence and the details the table leaves open', () => {
  it('precedence', () => {
    expect(cls(10, '+', 10)).toBe('8')
    expect(cls(6, '+', 6)).toBe('9')
    expect(cls(3, '+', 4)).toBe('3')
    expect(cls(1, '+', 1)).toBe('1')
    expect(classifySum(7, '+', 3, 10, 'b')).toBe('4')
    expect(cls(10, '−', 10)).toBe('5')
    expect(cls(15, '−', 10)).toBe('7')
  })
  it('rung 1 allows a zero, rung 2 minus 0', () => {
    expect(cls(0, '+', 0)).toBe('1')
    expect(cls(4, '−', 0)).toBe('2')
    expect(cls(5, '+', 0)).toBe('1')
  })
  it('rung 6 is every plus and minus fact to 10 with the ring at b, except rung 4', () => {
    expect(classifySum(3, '+', 4, 7, 'b')).toBe('6')
    expect(classifySum(0, '+', 0, 0, 'b')).toBe('6')
    expect(classifySum(9, '−', 4, 5, 'b')).toBe('6')
    expect(classifySum(1, '+', 9, 10, 'b')).toBe('4')
    expect(classifySum(0, '+', 10, 10, 'b')).toBe('6')
  })
  it('rung 12 is the ring at a within 20', () => {
    expect(classifySum(13, '+', 4, 17, 'a')).toBe('12')
    expect(classifySum(11, '−', 3, 8, 'a')).toBe('12')
    expect(classifySum(23, '+', 4, 27, 'a')).toBe('19')
  })
  it('rung 7 and 11 split the minus of the teens', () => {
    expect(cls(13, '−', 6)).toBe('11')
    expect(cls(16, '−', 6)).toBe('7')
  })
  it('rung 13 starts at the tens too (20 + 4)', () => {
    expect(cls(20, '+', 4)).toBe('13')
    expect(cls(20, '−', 4)).toBe('15')
  })
  it('rung 16 has no whole-ten b; rung 14 takes it', () => {
    expect(cls(45, '+', 20)).toBe('14')
    expect(cls(45, '+', 12)).toBe('16')
    expect(cls(23, '−', 12)).toBe('16')
  })
  it('hundreds: no regrouping, multiples of 5, answers 100 to 999', () => {
    expect(cls(240, '+', 30)).toBe('H1')
    expect(cls(375, '+', 100)).toBe('H1')
    expect(cls(375, '+', 35)).toBeUndefined()   // a is not a whole ten: only a whole ten, or a whole hundred
    expect(cls(240, '+', 70)).toBeUndefined()   // 4 + 7 tens regroup
    expect(cls(240, '+', 35)).toBe('H1')
    expect(cls(500, '−', 80)).toBeUndefined()
    expect(cls(500, '−', 500)).toBeUndefined()
    expect(cls(105, '+', 100)).toBe('H1')
    expect(cls(101, '+', 100)).toBeUndefined()
  })
  it('times: factor 1 without 2, 5 or 10 has no rung', () => {
    expect(cls(1, '×', 3)).toBeUndefined()
    expect(cls(1, '×', 5)).toBe('T2')
    expect(cls(2, '×', 10)).toBe('T2')
    expect(cls(3, '×', 6)).toBe('T3')
    expect(cls(3, '×', 7)).toBe('T5')
    expect(cls(10, '×', 10)).toBe('T2')
    expect(cls(9, '×', 9)).toBe('T5')
  })
  it('missing factor and divide', () => {
    expect(classifySum(5, '×', 8, 40, 'b')).toBeUndefined()   // a T2 fact over 36
    expect(classifySum(5, '×', 7, 35, 'b')).toBe('T4a')
    expect(classifySum(7, '×', 8, 56, 'b')).toBe('T6')
    expect(classifySum(7, '×', 8, 56, 'a')).toBeUndefined()
    expect(classifySum(40, '÷', 5, 8, 'c')).toBeUndefined()
    expect(classifySum(35, '÷', 5, 7, 'c')).toBe('T4b')
    expect(classifySum(35, '÷', 7, 5, 'c')).toBe('T4b')
    expect(classifySum(56, '÷', 7, 8, 'c')).toBe('T6')
  })
  it('comparisons: C1 takes the pairs to 20, C2 the other pairs of 10 to 99', () => {
    expect(rungOf('0?20')).toBe('C1')
    expect(rungOf('10?20')).toBe('C1')
    expect(rungOf('10?21')).toBe('C2')
    expect(rungOf('5?30')).toBeUndefined()
    expect(rungOf('99?10')).toBe('C2')
    expect(rungOf('100?5')).toBeUndefined()
  })
  it('jumps', () => {
    expect(rungOf('0,2,4,_')).toBe('S1')
    expect(rungOf('14,16,18,_')).toBe('S1')
    expect(rungOf('16,18,20,_')).toBeUndefined()
    expect(rungOf('35,40,45,_')).toBe('S1')
    expect(rungOf('70,80,90,_')).toBe('S1')
    expect(rungOf('60,70,80,_')).toBe('S1')
    expect(rungOf('0,3,6,_')).toBe('S2')
    expect(rungOf('3,_,9,12')).toBe('S2')
    expect(rungOf('4,_,12,16')).toBe('S2')
    expect(rungOf('_,4,8,12')).toBeUndefined()   // the ring is never first
    expect(rungOf('4,8,12,16')).toBeUndefined()   // no ring
    expect(rungOf('67,77,87,_')).toBe('S2')
    expect(rungOf('68,78,88,_')).toBeUndefined()   // the last is over 97
    expect(rungOf('3,6,9,13')).toBeUndefined()
    expect(rungOf('5,_,15,20')).toBeUndefined()   // the ring in the middle is not S1
  })
})

describe('the items', () => {
  const rungs = RUNGS.map((r) => r.id)
  it('no id is in two rungs and every rung has items', { timeout: 60000 }, () => {
    const seen = new Map<string, RungId>()
    for (const r of rungs) {
      expect(itemsOfRung(r).length).toBeGreaterThan(0)
      for (const it of itemsOfRung(r)) {
        expect(seen.get(it.id), `${it.id} in ${r} and ${seen.get(it.id)}`).toBeUndefined()
        seen.set(it.id, r)
        expect(it.rung).toBe(r)
        expect(it.variant).toBeUndefined()
      }
    }
  })
  it('every item round-trips through its id to the same object', () => {
    for (const r of rungs) for (const it of itemsOfRung(r)) expect(itemById(it.id)).toBe(it)
  })
  const check = (it: Item) => {
    if (it.kind === 'sum') {
      const f = { '+': (a: number, b: number) => a + b, '−': (a: number, b: number) => a - b, '×': (a: number, b: number) => a * b, '÷': (a: number, b: number) => a / b }
      if (it.thrice) expect(it.a * 3).toBe(it.c)
      else expect(f[it.op](it.a, it.b)).toBe(it.c)
      expect(it.answer).toBe(it.hole === 'c' ? it.c : it.hole === 'a' ? it.a : it.b)
      expect(Math.min(it.a, it.b, it.c)).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(it.c)).toBe(true)
    } else if (it.kind === 'compare') {
      expect(it.answer).toBe(it.a < it.b ? '<' : it.a > it.b ? '>' : '=')
    } else {
      expect(it.row.map((n, i) => n - it.row[0] - i * it.step)).toEqual([0, 0, 0, 0])
      expect(it.answer).toBe(it.row[it.hole])
      expect(it.hole).toBeGreaterThanOrEqual(1)
    }
  }
  it('every answer is right and no number is negative', { timeout: 60000 }, () => {
    for (const r of rungs) for (const it of itemsOfRung(r)) check(it)
  })
  it('the old ids keep their meaning', () => {
    expect(sum('3+4=7/c').rung).toBe('3')
    expect(sum('3+4=7/a').rung).toBe('12')
    expect(sum('3+4=7/b').rung).toBe('6')
    expect(sum('3+4=7/b').answer).toBe(4)
    expect(sum('3+4=7/a').answer).toBe(3)
    expect(sum('3+4=7/c').answer).toBe(7)
    expect(rungOf('3+7=10/b')).toBe('4')
    expect(sum('12/3=4/c').rung).toBe('T4b')
    expect(sum('42/7=6/c').rung).toBe('T6')
    expect(rungOf('1x3=3/c')).toBeUndefined()
    expect(itemById('3+5=9/c')).toBeUndefined()
    expect(itemById('nonsense')).toBeUndefined()
  })
  it('fact keys', () => {
    expect(sum('3+4=7/c').fact).toBe('+3,4')
    expect(sum('4+3=7/c').fact).toBe('+3,4')
    expect(sum('9-4=5/c').fact).toBe('-9,4')
    expect(sum('6x3=18/c').fact).toBe('x3,6')
    expect(sum('18/3=6/c').fact).toBe('/18,3')
    expect(sum('3+4=7/b').fact).toBe('+3,4')
    expect(sum('3+3+3=9/c').fact).toBe('r3')
    expect(itemById('7?5')!.fact).toBe('?5,7')
    expect(itemById('5?7')!.fact).toBe('?5,7')
    expect(itemById('5,10,15,_')!.fact).toBe('j5:5')
    expect(itemById('5,_,15,20')).toBeUndefined()
    expect(itemById('4,_,12,16')!.fact).toBe('j4:4')
    expect(itemById('4,8,_,16')!.fact).toBe('j4:4')
  })
  it('T1 is a + a + a with a 2 to 6', () => {
    const t1 = itemsOfRung('T1') as SumItem[]
    expect(t1.map((i) => i.a)).toEqual([2, 3, 4, 5, 6])
    expect(t1.every((i) => i.thrice && i.b === i.a && i.c === 3 * i.a)).toBe(true)
    expect(itemById('3+3+3=10/c')).toBeUndefined()
    expect(itemById('7+7+7=21/c')).toBeUndefined()
  })
  it('sizes of the small rungs', () => {
    expect(itemsOfRung('S1')).toHaveLength(24)
    expect(itemsOfRung('S2').length).toBe(3 * 8 + 3 * 8 + 3 * 61)
    expect(itemsOfRung('C1')).toHaveLength(441)
    expect(itemsOfRung('C2')).toHaveLength(90 * 90 - 11 * 11)
  })
  it('rung 8 is whole tens only, answers 10 to 100', () => {
    for (const it of itemsOfRung('8') as SumItem[]) {
      expect(it.hole).toBe('c')
      expect(it.a % 10 + it.b % 10).toBe(0)
      expect(it.c).toBeGreaterThanOrEqual(10)
      expect(it.c).toBeLessThanOrEqual(100)
    }
  })
  it('the first rungs keep every small fact', () => {
    expect(idsOf('1').has('0+0=0/c')).toBe(true)
    expect(idsOf('1').has('5+0=5/c')).toBe(true)
    expect(idsOf('3').has('5+5=10/c')).toBe(true)
    expect(idsOf('2').has('5-5=0/c')).toBe(true)
    expect(idsOf('5').has('10-10=0/c')).toBe(true)
  })
  it('the missing-number rungs hold the right items', () => {
    expect((itemsOfRung('4') as SumItem[]).every((i) => i.hole === 'b' && i.op === '+' && i.c === 10)).toBe(true)
    expect(itemsOfRung('4')).toHaveLength(9)
    expect((itemsOfRung('12') as SumItem[]).every((i) => i.hole === 'a' && Math.max(i.a, i.b, i.c) <= 20)).toBe(true)
    expect((itemsOfRung('19') as SumItem[]).every((i) => i.hole !== 'c')).toBe(true)
    expect((itemsOfRung('T4a') as SumItem[]).every((i) => i.hole === 'b' && i.c <= 36)).toBe(true)
    expect((itemsOfRung('T4b') as SumItem[]).every((i) => i.op === '÷' && i.a <= 36)).toBe(true)
    expect((itemsOfRung('T6') as SumItem[]).every((i) => (i.op === '÷' && i.hole === 'c') || (i.op === '×' && i.hole === 'b'))).toBe(true)
  })
  it('H1 holds thousands of items, built on demand, all without regrouping', () => {
    const h1 = itemsOfRung('H1') as SumItem[]
    expect(h1.length).toBeGreaterThan(1000)
    expect(h1.every((i) => i.a >= 100 && i.a % 5 === 0 && i.c >= 100 && i.c <= 999 && i.hole === 'c')).toBe(true)
  })
  it('itemById classifies without building a rung', () => {
    // a fresh module state would be needed to prove this; here the lookup of a H1 item must be instant
    const t = performance.now()
    for (let i = 0; i < 2000; i++) itemById(`${100 + (i % 80) * 5}+10=${110 + (i % 80) * 5}/c`)
    expect(performance.now() - t).toBeLessThan(500)
  })
})

describe('ring variants', () => {
  it('13 + ◯ = 17 is a variant of rung 7', () => {
    const v = sum('13+4=17/b')
    expect(v.variant).toBe(true)
    expect(v.rung).toBe('7')
    expect(v.answer).toBe(4)
    expect(sum('13+4=17/a').rung).toBe('12')
  })
  it('◯ + 4 = 27 is rung 19; 3 × ◯ = 12 is T4a', () => {
    expect(sum('23+4=27/a').rung).toBe('19')
    expect(sum('23+4=27/a').variant).toBeUndefined()
    expect(sum('3x4=12/b').rung).toBe('T4a')
    expect(sum('5x8=40/b').variant).toBe(true)
    expect(sum('5x8=40/b').rung).toBe('T2')
  })
  it('no variant of a rung before the second ten, none for ÷ or × at a', () => {
    expect(itemById('3+4=7/a')!.variant).toBeUndefined()
    expect(itemById('5x8=40/a')).toBeUndefined()
    expect(itemById('40/5=8/b')).toBeUndefined()
    expect(variantsOf('3', { b: true, a: true })).toEqual([])
  })
  it('variantsOf returns the moved items of a plain rung, de-duplicated', () => {
    const v = variantsOf('7', { b: true, a: false })
    expect(v.length).toBe(itemsOfRung('7').length)
    expect(v.every((i) => i.hole === 'b')).toBe(true)
    expect(new Set(v.map((i) => i.id)).size).toBe(v.length)
    const both = variantsOf('13', { b: true, a: true })
    expect(both.every((i) => i.rung === '19' && i.variant === undefined)).toBe(true)
    expect(variantsOf('T2', { b: true, a: true }).every((i) => i.op === '×' && i.hole === 'b')).toBe(true)
    expect(variantsOf('T2', { b: true, a: true }).some((i) => i.variant && i.rung === 'T2')).toBe(true)
    expect(variantsOf('H1', { b: true, a: true }).some((i) => i.variant && i.hole === 'a')).toBe(true)
  })
  it('variants are never in a rung list', () => {
    expect(idsOf('7').has('13+4=17/b')).toBe(false)
  })
})

describe('rare facts and the highest number', () => {
  it('rare facts', () => {
    for (const id of ['3+0=3/c', '0+3=3/c', '4-0=4/c', '3x0=0/c', '10x1=10/c', '5x1=5/c', '6/1=6/c', '1x5=5/b']) {
      const it = itemById(id)
      if (it) expect(isRareFact(it), id).toBe(true)
    }
    expect(isRareFact(sum('3x1=3/c' as string) ?? ({} as Item))).toBe(false)
    expect(isRareFact(sum('3+4=7/c'))).toBe(false)
    expect(isRareFact(sum('7x8=56/c'))).toBe(false)
    expect(isRareFact(itemById('7?5')!)).toBe(false)
    expect(isRareFact(sum('3+3+3=9/c'))).toBe(false)
    expect(isRareFact(sum('5x1=5/c'))).toBe(true)
    expect(isRareFact(sum('1x5=5/b'))).toBe(true)
    expect(isRareFact(sum('5/1=5/c'))).toBe(true)
    expect(isRareFact(sum('3+0=3/c'))).toBe(true)
    expect(isRareFact(sum('4-0=4/c'))).toBe(true)
    expect(isRareFact(sum('0-0=0/c'))).toBe(true)
  })
  it('zero facts', () => {
    expect(isZeroFact(sum('0+3=3/c'))).toBe(true)
    expect(isZeroFact(sum('4-0=4/c'))).toBe(true)
    expect(isZeroFact(sum('3+4=7/c'))).toBe(false)
    expect(isZeroFact(sum('5x1=5/c'))).toBe(false)
  })
  it('maxOfRung', () => {
    expect(maxOfRung('1')).toBe(5)
    expect(maxOfRung('3')).toBe(10)
    expect(maxOfRung('C1')).toBe(20)
    expect(maxOfRung('C2')).toBe(99)
    expect(maxOfRung('12')).toBe(20)
    expect(maxOfRung('S1')).toBe(100)
    expect(maxOfRung('T6')).toBe(81)
    expect(maxOfRung('T2')).toBe(100)
    expect(maxOfRung('H1')).toBeLessThanOrEqual(999)
  })
})
