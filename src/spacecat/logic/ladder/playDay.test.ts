import { describe, expect, it } from 'vitest'
import { itemsOfRung } from '../facts'
import type { Mark } from '../predict'
import type { RungId } from '../rungs'
import { afterAnswer, beginRun, chooseRound, frontier, relevel } from './index'
import { LONG_GAP_MS, PLAY_DAY_GAP_MS, WARMUP_SHARE, WARMUP_STRIKES } from './playDay'
import { LADDER_START, placementMode, statusOf, type Ladder, type LadderEvent, type Part } from './state'
import { ALL_ON, lcg, ladderWith } from './testkit'

const H = 3600e3
const SIX = { 1: 'passed', 2: 'passed', 3: 'passed', 4: 'passed', 5: 'passed', 6: 'passed' } as const
const begin = (l: Ladder, now: number, set = ALL_ON) => beginRun(l, { now, set })

/** play rounds; answers on rung `target` follow the script, every other round is a slow right answer */
function play(l: Ladder, script: string, target: RungId, max = 200) {
  const rng = lcg(9)
  let ladder = l
  const events: LadderEvent[] = []
  const parts: Part[] = []
  let i = 0
  for (let n = 0; n < max && i < script.length; n++) {
    const ch = chooseRound(ladder, { rng, set: ALL_ON, stats: {}, last: { sinceZero: 0 } })
    const c = ch.item.rung === target ? script[i++] : 'o'
    parts.push(ch.part)
    const mark: Mark = c === 'F' ? 'o' : (c as Mark)
    const out = afterAnswer(ch.ladder, { item: ch.item, part: ch.part, mark, fast: c === 'F', now: 100 * H, set: ALL_ON })
    ladder = out.ladder
    events.push(...out.events)
  }
  return { ladder, events, parts }
}

describe('play days', () => {
  it('the constants', () => {
    expect(PLAY_DAY_GAP_MS).toBe(12 * H)
    expect(LONG_GAP_MS).toBe(14 * 24 * H)
    expect([WARMUP_SHARE, WARMUP_STRIKES]).toEqual([0.7, 2])
  })
  it('the first run ever is a play day, day 1, with its placement and no warm-up', () => {
    const out = begin(LADDER_START, 5)
    expect(out.playDay).toBe(true)
    expect(out.ladder.day).toBe(1)
    expect(out.ladder.mode).toEqual(LADDER_START.mode)
    expect(out.ladder.recheckDue).toBe(false)
  })
  it('11 h 59 after his last answer: the same play day; 12 h: a new one', () => {
    const l = ladderWith(SIX, { day: 3, lastAt: 0, fastPasses: { today: 2, lastDay: 1 } })
    const same = begin(l, 12 * H - 60e3)
    expect(same.playDay).toBe(false)
    expect(same.ladder).toBe(l)
    const next = begin(l, 12 * H)
    expect(next.playDay).toBe(true)
    expect(next.ladder.day).toBe(4)
    expect(next.ladder.fastPasses).toEqual({ today: 0, lastDay: 2 })
  })
  it('holds free on their day', () => {
    const l = ladderWith({ ...SIX, 7: 'passed', C1: { status: 'held', holds: 1, freeOn: 4, strikes: 0 }, 8: { status: 'held', holds: 2, freeOn: 5 } }, { day: 3, lastAt: 0 })
    expect(frontier(l, ALL_ON)).toBe('9')
    const out = begin(l, 12 * H)
    expect(out.events).toEqual([{ e: 'ladder', rung: 'C1', change: 'free' }])
    expect(out.ladder.rungs.C1).toMatchObject({ status: 'new', strikes: 0, recent: '', holds: 1 })
    expect(statusOf(out.ladder, '8')).toBe('held')
    expect(frontier(out.ladder, ALL_ON)).toBe('C1')
    // the freed rung becomes the frontier: its band's arrival time holds
    expect(out.holdSpeed).toBe('small')
  })
  it('a play day starts the warm-up one rung below the frontier', () => {
    const out = begin(ladderWith(SIX, { lastAt: 0 }), 12 * H)
    expect(out.ladder.mode).toEqual({ kind: 'warmup', rung: '6', recent: '', fastRun: 0, strikes: 0, rounds: 0, reviewLeft: 0 })
  })
  it('after 14 days or more, two rungs below', () => {
    expect(begin(ladderWith(SIX, { lastAt: 0 }), LONG_GAP_MS - 1).ladder.mode).toMatchObject({ rung: '6' })
    expect(begin(ladderWith(SIX, { lastAt: 0 }), LONG_GAP_MS).ladder.mode).toMatchObject({ rung: '5' })
  })
  it('no frontier: the second-highest earned rung; nothing earned: no warm-up', () => {
    expect(begin(ladderWith(SIX, { lastAt: 0 }), 12 * H, { ...ALL_ON, range: '6' }).ladder.mode).toMatchObject({ kind: 'warmup', rung: '5' })
    expect(begin(ladderWith({}, { lastAt: 0, checkedOn: 1 }), 12 * H).ladder.mode).toEqual({ kind: 'practice' })
  })
  it('the warm-up mix: 70% the warm-up rung, 30% review', () => {
    const w = begin(ladderWith(SIX, { lastAt: 0 }), 12 * H).ladder
    const rng = lcg(4)
    let warm = 0
    for (let i = 0; i < 2000; i++) {
      const ch = chooseRound(w, { rng, set: ALL_ON, stats: {}, last: { sinceZero: 0 } })
      if (ch.part === 'warmup') {
        expect(ch.item.rung).toBe('6')
        warm++
      } else expect(ch.part).toBe('review')
    }
    expect(warm / 2000).toBeCloseTo(WARMUP_SHARE, 1)
  })
  it('3 fast right in a row take him back to the frontier', () => {
    const { ladder, events } = play(begin(ladderWith(SIX, { lastAt: 0 }), 12 * H).ladder, 'FFF', '6')
    expect(events.filter((e) => e.e === 'warmup')).toMatchObject([{ rung: '6', how: 'fast' }])
    expect(ladder.mode.kind).toBe('practice')
  })
  it('or 5 right of the last 6 with the last 3 right', () => {
    const { ladder, events } = play(begin(ladderWith(SIX, { lastAt: 0 }), 12 * H).ladder, 'oxoooo', '6')
    expect(events.filter((e) => e.e === 'warmup')).toMatchObject([{ rung: '6', how: 'slow' }])
    expect(ladder.mode.kind).toBe('practice')
  })
  it('a strike on it gives 6 rounds of review; 2 strikes: he forgot it, it is new and the frontier', () => {
    const start = begin(ladderWith(SIX, { lastAt: 0 }), 12 * H).ladder
    const one = play(start, 'xxx', '6')
    expect(one.events).toEqual([{ e: 'ladder', rung: '6', change: 'strike', by: 'warmup' }])
    expect(one.ladder.mode).toMatchObject({ kind: 'warmup', strikes: 1, reviewLeft: 6, recent: '' })
    // the next 6 rounds are review (the guard came first after the 2 mistakes in a row)
    const next = play(one.ladder, 'o'.repeat(8), 'none' as RungId, 8)
    expect(next.parts.filter((p) => p !== 'guard').slice(0, 6).every((p) => p === 'review')).toBe(true)
    const two = play(start, 'xxxxxx', '6')
    expect(two.events.filter((e) => e.e !== 'ladder' || e.change !== 'strike')).toEqual([
      { e: 'ladder', rung: '6', change: 'unpassed', by: 'warmup' },
      expect.objectContaining({ e: 'warmup', rung: '6', how: 'forgot' }),
    ])
    expect(statusOf(two.ladder, '6')).toBe('new')
    expect(frontier(two.ladder, ALL_ON)).toBe('6')
    expect(two.ladder.mode.kind).toBe('practice')
  })
  it('a placed warm-up rung: its probation comes first', () => {
    const start = begin(ladderWith({ ...SIX, 6: 'placed' }, { lastAt: 0 }), 12 * H).ladder
    expect(start.mode).toMatchObject({ kind: 'warmup', rung: '6' })
    const { ladder, events } = play(start, 'xx', '6')
    expect(events).toEqual([
      { e: 'ladder', rung: '6', change: 'unpassed', by: 'probation' },
      expect.objectContaining({ e: 'warmup', rung: '6', how: 'forgot' }),
    ])
    expect(frontier(ladder, ALL_ON)).toBe('6')
    // its right answers count for the probation too
    const ok = play(start, 'FFF', '6')
    expect(ok.ladder.rungs['6']).toMatchObject({ status: 'placed', probation: 3 })
  })
  it('no warm-up in the migration run', () => {
    const l = ladderWith(SIX, { lastAt: undefined, mode: placementMode('migration', '7', 4, 10) })
    expect(begin(l, 5).ladder.mode.kind).toBe('placement')
  })
})

describe('relevel', () => {
  it('every rung new, holds and strikes cleared, a placement from rung 1', () => {
    const l = ladderWith({ ...SIX, 7: { status: 'held', holds: 2, freeOn: 9 } }, { day: 8, strikeLeft: 3, guardLeft: 1, passes: ['fast'] })
    const r = relevel(l)
    expect(r.rungs).toEqual({})
    expect(r.mode).toEqual(placementMode('parent', '1', 8, 16))
    expect(r).toMatchObject({ day: 8, strikeLeft: 0, guardLeft: 0, passes: [], recheckDue: false })
    expect(r.lastAt).toBe(l.lastAt)
  })
})

describe('the warm-up and the spacing', () => {
  it('a mistake that is due comes back on time in the warm-up, as a review round', () => {
    const l = ladderWith(SIX, { mode: { kind: 'warmup', rung: '6', recent: '', fastRun: 0, strikes: 0, rounds: 2, reviewLeft: 0 } })
    const missed = itemsOfRung('2')[4]
    const spacing = { round: 10, recent: ['a', 'b'], rehearsals: [{ fact: missed.fact, item: missed.id, step: 1 as const, due: 9 }] }
    const c = chooseRound(l, { rng: lcg(1), set: ALL_ON, stats: {}, last: { sinceZero: 0, spacing } })
    expect(c).toMatchObject({ part: 'review' })
    expect(c.item.id).toBe(missed.id)
  })
})
