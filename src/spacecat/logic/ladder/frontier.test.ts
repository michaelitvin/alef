import { describe, expect, it } from 'vitest'
import { RUNGS, type RungId } from '../rungs'
import { frontier, isDone, isOn, needsClosure, offered, statusText } from './frontier'
import { ALL_ON, ladderWith, passedThrough } from './testkit'

const ORDER = RUNGS.map((r) => r.id)

describe('on, offered, the frontier', () => {
  it('a fresh ladder: the frontier is rung 1, all 31 offered', () => {
    const l = ladderWith({})
    expect(frontier(l, ALL_ON)).toBe('1')
    expect(offered(l, ALL_ON)).toEqual(ORDER)
  })
  it('the frontier is the lowest new rung whose needs are done', () => {
    const l = ladderWith(passedThrough(ORDER, '7'))
    expect(frontier(l, ALL_ON)).toBe('C1')
    // C1 placed: rung 8 is next; 9 needs only 7, so 9 waits for 8 only by the order
    expect(frontier(ladderWith({ ...passedThrough(ORDER, '7'), C1: 'placed' }), ALL_ON)).toBe('8')
  })
  it('a switched-off need counts as passed', () => {
    const set = { ...ALL_ON, jumps: false }
    const l = ladderWith(passedThrough(ORDER, '12'))
    // S1 is off; T1 needs 10 and S1: it is the frontier
    expect(isDone(l, 'S1', set)).toBe(true)
    expect(frontier(l, set)).toBe('T1')
    expect(offered(l, set)).not.toContain('S1')
  })
  it('divide is off while times is off', () => {
    const set = { ...ALL_ON, times: false }
    for (const r of ['T4a', 'T4b', 'T6'] as RungId[]) expect(isOn(r, set)).toBe(false)
    expect(isOn('T4a', ALL_ON)).toBe(true)
    expect(isOn('T4a', { ...ALL_ON, divide: false })).toBe(false)
    expect(offered(ladderWith({}), set).filter((r) => r[0] === 'T')).toEqual([])
  })
  it('the range caps the order', () => {
    const set = { ...ALL_ON, range: '6' as RungId }
    expect(offered(ladderWith({}), set)).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(frontier(ladderWith(passedThrough(ORDER, '6')), set)).toBeNull()
    expect(statusText(ladderWith({}), '7', set)).toBe('above the range')
  })
  it('a held rung is offered nowhere, and the frontier skips it to the next free one in another strand', () => {
    const l = ladderWith({ ...passedThrough(ORDER, '7'), C1: { status: 'held', holds: 1, freeOn: 3 } })
    expect(offered(l, ALL_ON)).not.toContain('C1')
    expect(frontier(l, ALL_ON)).toBe('8')
    // held 8: 9 needs only 7 and is next
    const l2 = ladderWith({ ...passedThrough(ORDER, 'C1'), 8: { status: 'held', holds: 1, freeOn: 3 } })
    expect(frontier(l2, ALL_ON)).toBe('9')
  })
  it('a placed rung counts for the needs', () => {
    expect(frontier(ladderWith({ 1: 'placed', 2: 'placed' }), ALL_ON)).toBe('3')
  })
  it('needsClosure: down to rung 1, in the order', () => {
    expect(needsClosure('1')).toEqual([])
    expect(needsClosure('7')).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(needsClosure('14')).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'])
    expect(needsClosure('14')).not.toContain('C1')
    expect(needsClosure('T1')).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'S1'])
  })
  it('statusText', () => {
    const l = ladderWith({ 1: 'passed', 2: 'placed', 4: { status: 'held', holds: 1, freeOn: 9 } })
    expect(statusText(l, '1', ALL_ON)).toBe('passed')
    expect(statusText(l, '2', ALL_ON)).toBe('placed')
    expect(statusText(l, '3', ALL_ON)).toBe('working on now')
    expect(statusText(l, '4', ALL_ON)).toBe('held')
    expect(statusText(l, '5', ALL_ON)).toBe('not yet')
    expect(statusText(l, 'C1', { ...ALL_ON, compare: false })).toBe('switched off')
  })
})
