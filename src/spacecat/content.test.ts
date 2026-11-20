import { describe, expect, it } from 'vitest'
import type { Rng } from '../shared/adaptive'
import { makeRound } from './content'
import { itemById } from './logic/facts'

const rng = (): Rng => {
  let s = 99
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

describe('makeRound', () => {
  it('puts the ring at the hole', () => {
    expect(makeRound(rng(), itemById('3+4=7/c')!, 0, 10).box).toEqual(['3', '+', '4', '=', null])
    expect(makeRound(rng(), itemById('3+4=7/b')!, 0, 10).box).toEqual(['3', '+', null, '=', '7'])
    expect(makeRound(rng(), itemById('3+4=7/a')!, 0, 10).box).toEqual([null, '+', '4', '=', '7'])
  })
  it('the right lane holds the answer', () => {
    const r = makeRound(rng(), itemById('3+4=7/b')!, 2, 10)
    expect(r.labels).toHaveLength(4)
    expect(r.labels[r.rightLane]).toBe('4')
    expect(r.flyNumber).toBe('4')
    expect(r.itemId).toBe('3+4=7/b')
    expect(r.fact).toBe('+3,4')
  })
})
