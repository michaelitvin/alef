import { describe, expect, it } from 'vitest'
import { RUNGS, isZeroFact, itemById, itemsOfRung, maxNumber, type RungId } from './facts'

const ids = (r: RungId) => itemsOfRung(r).map((i) => i.id)
const all = ([1, 2, 3, 4, 5, 6, 7, 8, 9] as RungId[]).flatMap(itemsOfRung)

describe('facts and rungs', () => {
  it('rung 1 is the sums to 5', () => {
    const items = itemsOfRung(1)
    expect(items.every((i) => i.op === '+' && i.c <= 5 && i.hole === 'c')).toBe(true)
    const a = itemById('3+2=5/c')
    const b = itemById('2+3=5/c')
    expect(a).toBeDefined()
    expect(b).toBeDefined()
    expect(a!.fact).toBe(b!.fact)
    expect(ids(1)).toContain('3+2=5/c')
  })
  it('rung 2 holds only 6 to 10', () => {
    expect(itemsOfRung(2).every((i) => i.c >= 6 && i.c <= 10 && i.op === '+')).toBe(true)
  })
  it('rung 4 holds only missing-number items of rungs 1 to 3', () => {
    const base = [1, 2, 3].flatMap((r) => itemsOfRung(r as RungId))
    const facts = new Set(base.map((i) => i.fact))
    const r4 = itemsOfRung(4)
    expect(r4.every((i) => i.hole !== 'c' && facts.has(i.fact))).toBe(true)
    expect(r4.length).toBe(2 * base.length)
  })
  it('missing-number items hold the number of the hole as the answer', () => {
    const it = itemById('3+4=7/b')!
    expect(it.answer).toBe(4)
    expect(itemById('3+4=7/a')!.answer).toBe(3)
    expect(itemById('3+4=7/c')!.answer).toBe(7)
  })
  it('rung 5 has no crossing', () => {
    expect(ids(5)).toContain('12+5=17/c')
    expect(ids(5)).toContain('18-3=15/c')
    expect(ids(5)).not.toContain('8+5=13/c')
    expect(ids(5)).not.toContain('13-6=7/c')
  })
  it('rung 6 crosses', () => {
    expect(ids(6)).toContain('8+5=13/c')
    expect(ids(6)).toContain('13-6=7/c')
  })
  it('no negative numbers anywhere', () => {
    expect(all.every((i) => i.a >= 0 && i.b >= 0 && i.c >= 0)).toBe(true)
  })
  it('the arithmetic holds', () => {
    const f = { '+': (a: number, b: number) => a + b, '−': (a: number, b: number) => a - b, '×': (a: number, b: number) => a * b, '÷': (a: number, b: number) => a / b }
    expect(all.every((i) => f[i.op](i.a, i.b) === i.c)).toBe(true)
  })
  it('ids are unique and round-trip', () => {
    expect(new Set(all.map((i) => i.id)).size).toBe(all.length)
    for (const i of all) expect(itemById(i.id)).toBe(i)
  })
  it('rungs 7-9 need their switches', () => {
    expect(RUNGS[6].needs).toBe('times')
    expect(RUNGS[7].needs).toBe('times')
    expect(RUNGS[8].needs).toBe('divide')
  })
  it('times and divide items', () => {
    expect(ids(7)).toContain('3x10=30/c')
    expect(ids(7)).toContain('10x3=30/c')
    expect(ids(7)).not.toContain('6x7=42/c')
    expect(ids(8)).toContain('6x7=42/c')
    expect(ids(9)).toContain('42/7=6/c')
    expect(itemsOfRung(9).length).toBe(itemsOfRung(7).length + itemsOfRung(8).length)
  })
  it('fact keys', () => {
    expect(itemById('3+4=7/c')!.fact).toBe('+3,4')
    expect(itemById('4+3=7/c')!.fact).toBe('+3,4')
    expect(itemById('9-4=5/c')!.fact).toBe('-9,4')
    expect(itemById('6x3=18/c')!.fact).toBe('x3,6')
    expect(itemById('18/3=6/c')!.fact).toBe('/18,3')
    expect(itemById('3+4=7/b')!.fact).toBe('+3,4')
  })
  it('zero facts', () => {
    expect(isZeroFact(itemById('0+3=3/c')!)).toBe(true)
    expect(isZeroFact(itemById('3+0=3/c')!)).toBe(true)
    expect(isZeroFact(itemById('4-0=4/c')!)).toBe(true)
    expect(isZeroFact(itemById('0-0=0/c')!)).toBe(true)
    expect(isZeroFact(itemById('3+4=7/c')!)).toBe(false)
  })
  it('maxNumber', () => {
    expect(maxNumber([1])).toBe(5)
    expect(maxNumber([1, 2, 3])).toBe(10)
    expect(maxNumber([1, 2, 3, 4, 5, 6])).toBe(20)
  })
})
