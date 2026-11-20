import { describe, expect, it } from 'vitest'
import type { Rng } from '../shared/adaptive'
import { makeRound, PODS_PRODUCT_MAX } from './content'
import { itemById } from './logic/facts'

const rng = (): Rng => {
  let s = 99
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}
const round = (id: string, ship = 0, confusion?: string) => makeRound(rng(), itemById(id)!, ship, confusion)

describe('makeRound', () => {
  it('puts the ring at the hole', () => {
    expect(round('3+4=7/c').box).toEqual(['3', '+', '4', '=', null])
    expect(round('3+4=7/b').box).toEqual(['3', '+', null, '=', '7'])
    expect(round('3+4=7/a').box).toEqual([null, '+', '4', '=', '7'])
  })
  it('the right lane holds the answer', () => {
    const r = round('3+4=7/b', 2)
    expect(r.kind).toBe('sum')
    expect(r.labels).toHaveLength(4)
    expect(r.labels[r.rightLane]).toBe('4')
    expect(r.flyNumber).toBe('4')
    expect(r.itemId).toBe('3+4=7/b')
    expect(r.fact).toBe('+3,4')
    expect(r.rung).toBe('6')
  })
  it("T1's box is a + a + a = ring", () => {
    expect(round('3+3+3=9/c').box).toEqual(['3', '+', '3', '+', '3', '=', null])
  })
  it('a comparison has 3 labels with each sign once', () => {
    for (let ship = 0; ship < 3; ship++) {
      const r = round('7?5', ship)
      expect(r.kind).toBe('compare')
      expect(r.box).toEqual(['7', null, '5'])
      expect([...r.labels].sort()).toEqual(['<', '=', '>'])
      expect(r.labels[r.rightLane]).toBe('>')
      expect(r.flyNumber).toBe('>')
      expect(r.rung).toBe('C1')
    }
  })
  it('bigger: the box index of the bigger number, or both', () => {
    expect(round('7?5').bigger).toBe(0)
    expect(round('5?7').bigger).toBe(2)
    expect(round('6?6').bigger).toBe('both')
    expect(round('3+4=7/c').bigger).toBeUndefined()
  })
  it("a jump row's box is its numbers with one ring", () => {
    const r = round('4,8,_,16')
    expect(r.kind).toBe('jumps')
    expect(r.box).toEqual(['4', '8', null, '16'])
    expect(r.labels).toHaveLength(4)
    expect(r.labels[r.rightLane]).toBe('12')
    expect(round('5,10,15,_').box).toEqual(['5', '10', '15', null])
    expect(round('5,10,15,_').flyNumber).toBe('20')
  })
  it('his recorded wrong pick is on a planet', () => {
    expect(round('5,10,15,_', 0, '25').labels).toContain('25')
    expect(round('5,10,15,_', 0, '<').labels).not.toContain('<')
  })
  it('pods only for T1 to T4b, and for products up to 36', () => {
    expect(PODS_PRODUCT_MAX).toBe(36)
    expect(round('3+3+3=9/c').pods).toEqual({ groups: 3, each: 3, share: false })
    expect(round('4x5=20/c').pods).toEqual({ groups: 4, each: 5, share: false })
    expect(round('4x6=24/c').pods).toEqual({ groups: 4, each: 6, share: false })
    expect(round('3x4=12/b').pods).toEqual({ groups: 3, each: 4, share: false })
    expect(round('12/3=4/c').pods).toEqual({ groups: 3, each: 4, share: true })
    expect(round('5x8=40/c').pods).toBeUndefined()
    expect(round('7x8=56/c').pods).toBeUndefined()
    expect(round('56/8=7/c').pods).toBeUndefined()
    expect(round('3+4=7/c').pods).toBeUndefined()
    expect(round('7?5').pods).toBeUndefined()
  })
})
