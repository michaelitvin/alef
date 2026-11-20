import { describe, expect, it } from 'vitest'
import { itemById, type JumpsItem, type SumItem } from './facts'
import { misconceptions } from './misconceptions'

const m = (id: string) => misconceptions(itemById(id) as SumItem | JumpsItem)

describe('the misconception of each rung', () => {
  it('rungs 1 to 3: a shown number, the sum for minus', () => {
    expect(m('3+2=5/c')).toContain(3)
    expect(m('5-2=3/c')).toEqual([7])
    expect(m('6+3=9/c')).toEqual([6, 3, 8])
  })
  it('rung 4: the shown numbers added, else the shown number', () => {
    expect(m('7+3=10/b')).toEqual([17, 7])
  })
  it('rung 5 and 6', () => {
    expect(m('9-4=5/c')).toEqual([9, 4])
    expect(m('4+5=9/b')).toEqual([13])
    expect(m('9-4=5/b')).toEqual([14])
  })
  it('rung 7 drops the ten, rung 8 the zero', () => {
    expect(m('13+4=17/c')).toEqual([7])
    expect(m('30+40=70/c')).toEqual([7])
  })
  it('rung 9: the next double', () => {
    expect(m('7+8=15/c')).toEqual([14, 16])
    expect(m('6+6=12/c')[0]).toBe(14)
  })
  it('rungs 10 and 11', () => {
    expect(m('8+5=13/c')).toEqual([3])
    expect(m('13-6=7/c')).toEqual([13])
  })
  it('rung 12: the inverse slip', () => {
    expect(m('11-3=8/a')).toEqual([5])
    expect(m('5+4=9/a')).toEqual([13])
  })
  it('rungs 13 and 14', () => {
    expect(m('23+4=27/c')[0]).toBe(63)
    expect(m('37-5=32/c')).toEqual([22, 42])
    expect(m('45+30=75/c')).toEqual([48])
    expect(m('62-20=42/c')).toEqual([60])
  })
  it('rungs 15 and 16', () => {
    expect(m('45+9=54/c')).toEqual([44])
    expect(m('72-6=66/c')).toEqual([74])
    expect(m('27-15=12/c')).toEqual([42])
    expect(m('17+12=29/c')).toEqual([39, 19])
  })
  it('rungs 17 and 18', () => {
    expect(m('38+45=83/c')).toEqual([73])
    expect(m('85-19=66/c')).toEqual([74, 76])
  })
  it('rung 19: the shown numbers added, the difference when that is the answer', () => {
    expect(m('37+13=50/b')[0]).toBe(87)
    expect(m('35-20=15/a')).toEqual([35, 5])
  })
  it('H1: the place slip', () => {
    expect(m('240+30=270/c')[0]).toBe(540)
    expect(m('240+30=270/c')).toContain(370)
    expect(m('375+100=475/c')[0]).toBe(385)
  })
  it('jumps', () => {
    expect(m('5,10,15,_')).toEqual([21, 25])
    expect(m('4,8,_,16')).toEqual([13, 11, 16, 8])
  })
  it('T1 to T3', () => {
    expect(m('3+3+3=9/c')).toEqual([6, 12])
    expect(m('4x5=20/c')).toEqual([9, 15, 25])
    expect(m('4x6=24/c')).toEqual([10, 18, 20])
  })
  it('T4a, T4b, T5, T6', () => {
    expect(m('3x4=12/b')).toEqual([36, 9])
    expect(m('12/3=4/c')).toEqual([3, 9])
    expect(m('7x8=56/c')).toEqual([48, 63, 64, 49])
    expect(m('56/8=7/c')).toEqual([8, 48])
  })
  it('a moved ring uses its own hole: variants', () => {
    expect(m('13+4=17/b')).toEqual([30])
    expect(m('5x8=40/b')).toEqual([200, 35])
  })
})
