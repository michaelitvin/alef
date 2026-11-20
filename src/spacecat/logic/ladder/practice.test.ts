import { describe, expect, it } from 'vitest'
import type { Mark } from '../predict'
import { RUNGS } from '../rungs'
import { frontier } from './frontier'
import {
  FAST_PASS, GUARD_AFTER, GUARD_ROUNDS, HOLD_DAYS, HOLD_STRIKES, PROBATION_RIGHT, SLOW_PASS, STRIKE, STRIKE_ROUNDS, applyPractice, markGuard,
} from './practice'
import { WINDOW, rungOf, type Ladder, type LadderEvent } from './state'
import { ALL_ON, itemOf, ladderWith, passedThrough } from './testkit'

const ORDER = RUNGS.map((r) => r.id)

/** answers on rung r: marks, with F for a fast right answer */
function feed(l: Ladder, r: Parameters<typeof itemOf>[0], marks: string, set = ALL_ON): { ladder: Ladder; events: LadderEvent[] } {
  let ladder = l
  const events: LadderEvent[] = []
  for (const c of marks) {
    const mark: Mark = c === 'F' ? 'o' : (c as Mark)
    const out = applyPractice(ladder, { item: itemOf(r), mark, fast: c === 'F', set })
    ladder = out.ladder
    events.push(...out.events)
  }
  return { ladder, events }
}

describe('the practice rules', () => {
  it('the constants', () => {
    expect(WINDOW).toBe(6)
    expect(FAST_PASS).toBe(3)
    expect(SLOW_PASS).toEqual([5, 6])
    expect(STRIKE).toEqual([2, 3])
    expect(STRIKE_ROUNDS).toBe(6)
    expect(HOLD_STRIKES).toBe(2)
    expect(HOLD_DAYS).toEqual([2, 4, 7])
    expect(PROBATION_RIGHT).toBe(4)
    expect([GUARD_AFTER, GUARD_ROUNDS]).toEqual([2, 2])
  })
  it('up by 3 fast right answers in a row', () => {
    const { ladder, events } = feed(ladderWith({}), '1', 'FFF')
    expect(rungOf(ladder, '1').status).toBe('passed')
    expect(events).toEqual([{ e: 'ladder', rung: '1', change: 'passed', by: 'fast' }])
    expect(ladder.passes).toEqual(['fast'])
    expect(ladder.fastPasses.today).toBe(1)
    expect(frontier(ladder, ALL_ON)).toBe('2')
  })
  it('a slow right answer breaks the fast run', () => {
    expect(rungOf(feed(ladderWith({}), '1', 'FFoF').ladder, '1').status).toBe('new')
  })
  it('up by 5 right of the last 6 with the last 3 right', () => {
    const { ladder, events } = feed(ladderWith({}), '1', 'oxoooo')
    expect(rungOf(ladder, '1').status).toBe('passed')
    expect(events[0]).toEqual({ e: 'ladder', rung: '1', change: 'passed', by: 'slow' })
    expect(ladder.fastPasses.today).toBe(0)
    // the last 3 not all right: no pass
    expect(rungOf(feed(ladderWith({}), '1', 'oooxoo').ladder, '1').status).toBe('new')
    // two time-outs are one mistake
    expect(rungOf(feed(ladderWith({}), '1', 'totooo').ladder, '1').status).toBe('passed')
  })
  it('the passed rung\'s band is held, the new frontier starts with an empty window', () => {
    let l = feed(ladderWith(passedThrough(ORDER, '12')), 'S1', 'o').ladder
    expect(rungOf(l, 'S1').recent).toBe('o')
    const out = applyPractice(l, { item: itemOf('S1'), mark: 'o', fast: true, set: ALL_ON })
    l = feed(out.ladder, 'S1', 'FF').ladder
    expect(rungOf(l, 'S1').status).toBe('passed')
    const passed = applyPractice(feed(ladderWith(passedThrough(ORDER, '12')), 'S1', 'FF').ladder, { item: itemOf('S1'), mark: 'o', fast: true, set: ALL_ON })
    expect(passed.holdSpeed).toBe('small')
    const f = frontier(passed.ladder, ALL_ON)
    expect(f).toBe('T1')
    expect(rungOf(passed.ladder, f!)).toMatchObject({ recent: '', strikes: 0, fastRun: 0 })
  })
  it('a pass into the big band holds the big band', () => {
    const l = ladderWith({ ...passedThrough(ORDER, 'T1') })
    expect(frontier(l, ALL_ON)).toBe('13')
    const { ladder } = feed(l, '13', 'FF')
    expect(applyPractice(ladder, { item: itemOf('13'), mark: 'o', fast: true, set: ALL_ON }).holdSpeed).toBe('big')
  })
  it('a strike after 2 mistakes in the last 3, with at least 3 answers', () => {
    expect(feed(ladderWith({}), '1', 'xx').events).toEqual([])
    const { ladder, events } = feed(ladderWith({}), '1', 'xxo'.slice(0, 2) + 'x')
    expect(events).toEqual([{ e: 'ladder', rung: '1', change: 'strike' }])
    expect(rungOf(ladder, '1')).toMatchObject({ strikes: 1, recent: '', status: 'new' })
    expect(ladder.strikeLeft).toBe(STRIKE_ROUNDS)
    // a time-out is half: x t o is 1.5, no strike; x t t is 2
    expect(feed(ladderWith({}), '1', 'xto').events).toEqual([])
    expect(feed(ladderWith({}), '1', 'xtt').events).toHaveLength(1)
  })
  it('2 strikes hold a rung: 2, 4, then 7 play days', () => {
    const { ladder, events } = feed(ladderWith(passedThrough(ORDER, '7'), { day: 5 }), 'C1', 'xxxxxx')
    expect(events.map((e) => e.e === 'ladder' && e.change)).toEqual(['strike', 'strike', 'held'])
    expect(events[2]).toEqual({ e: 'ladder', rung: 'C1', change: 'held', days: 2 })
    expect(rungOf(ladder, 'C1')).toMatchObject({ status: 'held', holds: 1, freeOn: 7 })
    expect(frontier(ladder, ALL_ON)).toBe('8')
    const second = ladderWith(passedThrough(ORDER, '7'), { day: 5 })
    second.rungs.C1 = { ...rungOf(second, 'C1'), holds: 1 }
    expect(rungOf(feed(second, 'C1', 'xxxxxx').ladder, 'C1').freeOn).toBe(9)
    const fourth = ladderWith(passedThrough(ORDER, '7'), { day: 5 })
    fourth.rungs.C1 = { ...rungOf(fourth, 'C1'), holds: 3 }
    expect(rungOf(feed(fourth, 'C1', 'xxxxxx').ladder, 'C1').freeOn).toBe(12)
  })
  it('re-jump: a fast pass after two fast passes places the next rung of the same strand', () => {
    const l = ladderWith(passedThrough(ORDER, '8'), { passes: ['fast', 'fast'] })
    expect(frontier(l, ALL_ON)).toBe('9')
    const { ladder, events } = feed(l, '9', 'FFF')
    expect(events).toEqual([
      { e: 'ladder', rung: '9', change: 'passed', by: 'fast' },
      { e: 'ladder', rung: '10', change: 'placed', by: 'rejump' },
    ])
    expect(rungOf(ladder, '10')).toMatchObject({ status: 'placed', probation: 0 })
    expect(frontier(ladder, ALL_ON)).toBe('11')
    // a slow pass between: no re-jump
    expect(feed(ladderWith(passedThrough(ORDER, '8'), { passes: ['slow', 'fast'] }), '9', 'FFF').events).toHaveLength(1)
  })
  it('a placed rung passes after 4 right answers', () => {
    const { ladder, events } = feed(ladderWith({ 1: 'placed' }), '1', 'oxoFo')
    expect(events).toEqual([{ e: 'ladder', rung: '1', change: 'passed', by: 'probation' }])
    expect(rungOf(ladder, '1').status).toBe('passed')
  })
  it('a placed rung with 2 mistakes in its last 3 is new again, and becomes the frontier', () => {
    const l = ladderWith({ 1: 'placed', 2: 'placed', 3: 'placed' })
    expect(frontier(l, ALL_ON)).toBe('4')
    const { ladder, events } = feed(l, '2', 'oxx')
    expect(events).toEqual([{ e: 'ladder', rung: '2', change: 'unpassed', by: 'probation' }])
    expect(frontier(ladder, ALL_ON)).toBe('2')
    expect(feed(l, '2', 'xox').events).toHaveLength(1)
    expect(feed(l, '2', 'xoo').events).toHaveLength(0)
  })
  it('a passed rung and a new rung that is not the frontier do not change', () => {
    const l = ladderWith({ 1: 'passed' })
    expect(feed(l, '1', 'xxxx').ladder.rungs).toEqual(l.rungs)
    expect(feed(l, '5', 'xxxx').ladder.rungs).toEqual(l.rungs)
  })
  it('the guard: 2 mistakes in a row anywhere', () => {
    let l = ladderWith({})
    l = markGuard(l, 'x')
    expect(l.guardLeft).toBe(0)
    l = markGuard(l, 't')
    expect(l.guardLeft).toBe(GUARD_ROUNDS)
    expect(markGuard({ ...l, guardLeft: 0 }, 'o').guardLeft).toBe(0)
  })
})
