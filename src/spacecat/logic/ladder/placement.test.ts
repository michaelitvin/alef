import { describe, expect, it } from 'vitest'
import type { Mark } from '../predict'
import { RUNGS, type RungId } from '../rungs'
import { afterAnswer, beginRun, chooseRound, frontier } from './index'
import { CONFIRM_RIGHTS, MIGRATION_JUMP, MIGRATION_PROBES, RECHECK_FAST_PASSES, RECHECK_FIRST, RECHECK_PROBES, RECHECK_DAYS, positionIn } from './placement'
import { LADDER_START, placementMode, statusOf, type Ladder, type LadderEvent } from './state'
import { ALL_ON, lcg, ladderWith } from './testkit'

const ORDER = RUNGS.map((r) => r.id)

/** answers to the probes: F fast right, o slow right, x wrong, t time-out; returns the probed rungs */
function answer(l: Ladder, script: string, set = ALL_ON) {
  const rng = lcg(3)
  let ladder = l
  const probed: RungId[] = []
  const events: LadderEvent[] = []
  for (const c of script) {
    const ch = chooseRound(ladder, { rng, set, stats: {}, last: { sinceZero: 0 } })
    expect(ch.part).toBe('probe')
    probed.push(ch.item.rung)
    const mark: Mark = c === 'F' ? 'o' : (c as Mark)
    const out = afterAnswer(ch.ladder, { item: ch.item, part: ch.part, mark, fast: c === 'F', now: 1000, set })
    ladder = out.ladder
    events.push(...out.events)
  }
  return { ladder, probed, events }
}
const placed = (l: Ladder) => ORDER.filter((r) => statusOf(l, r) === 'placed')

describe('placement', () => {
  it('the constants', () => {
    expect([MIGRATION_JUMP, MIGRATION_PROBES, CONFIRM_RIGHTS]).toEqual([4, 10, 2])
  })
  it('fast right answers jump 8; the top confirmed stops it', () => {
    const { ladder, probed, events } = answer(LADDER_START, 'FFFFF')
    expect(probed).toEqual(['1', '8', '14', '18', 'T6'])
    expect(ladder.mode.kind).toBe('practice')
    expect(events[0]).toEqual({ e: 'placement', phase: 'start', kind: 'first', probes: 0, mistakes: 0, frontier: '1' })
    expect(events[events.length - 1]).toMatchObject({ e: 'placement', phase: 'end', kind: 'first', probes: 5, mistakes: 0 })
  })
  it('a slow right halves the jump; 2 rights confirm and go up one', () => {
    const { probed, ladder } = answer(LADDER_START, 'Fooo')
    expect(probed).toEqual(['1', '8', '8', '9'])
    expect(ladder.mode).toMatchObject({ kind: 'placement', at: '9', jump: 1, confirmed: ['1', '8'] })
  })
  it('a wrong answer halves the jump and goes down by it', () => {
    const { probed, ladder } = answer(LADDER_START, 'FxF')
    expect(probed).toEqual(['1', '8', '5'])
    expect(ladder.mode).toMatchObject({ kind: 'placement', at: '8', jump: 4, mistakes: 1, inRow: 0, confirmed: ['1', '5'] })
    // a time-out is wrong here
    expect(answer(LADDER_START, 'Ft').probed).toEqual(['1', '8'])
    expect(answer(LADDER_START, 'Ft').ladder.mode).toMatchObject({ at: '5', mistakes: 1 })
  })
  it('stops after 2 mistakes in a row', () => {
    const { ladder, events } = answer(LADDER_START, 'FFFxx')
    expect(ladder.mode.kind).toBe('practice')
    expect(events[events.length - 1]).toMatchObject({ phase: 'end', probes: 5, mistakes: 2 })
  })
  it('the needs of the confirmed rungs are placed, C1 under 14 stays new', () => {
    const { ladder, events } = answer(LADDER_START, 'FFFxx')
    expect(placed(ladder)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'])
    expect(statusOf(ladder, 'C1')).toBe('new')
    expect(statusOf(ladder, 'S1')).toBe('new')
    expect(frontier(ladder, ALL_ON)).toBe('C1')
    expect(events.filter((e) => e.e === 'ladder')).toHaveLength(14)
    expect(events[1]).toEqual({ e: 'ladder', rung: '1', change: 'placed', by: 'placement' })
    expect(events[events.length - 1]).toMatchObject({ frontier: 'C1' })
    expect(ladder.checkedOn).toBe(ladder.day)
    expect(ladder.rungs['14']).toMatchObject({ status: 'placed', probation: 0 })
  })
  it('stops when the jump is 1 and the rung above the highest confirmed has failed', () => {
    // 1 fast; 8 slow (jump 4); 8 wrong (jump 2, down to 7); 7 fast (up 2 to 8); 8 wrong (jump 1, down to C1);
    // C1 fast (up to 8); 8 wrong: the rung above the highest confirmed (C1) has failed at the jump of 1
    const { ladder, probed } = answer(LADDER_START, 'FoxFxFx')
    expect(probed).toEqual(['1', '8', '8', '7', '8', 'C1', '8'])
    expect(ladder.mode.kind).toBe('practice')
    expect(placed(ladder)).toEqual(['1', '2', '3', '4', '5', '6', '7', 'C1'])
  })
  it('stops at the most probes', () => {
    const { ladder, events } = answer(LADDER_START, 'o'.repeat(16))
    expect(ladder.mode.kind).toBe('practice')
    expect(events[events.length - 1]).toMatchObject({ phase: 'end', probes: 16 })
    expect(placed(ladder)).toEqual(['1', '2', '3', '4', '5', '6', '7', 'C1'])
  })
  it('the migration placement: jump 4, 10 probes, placed by migration', () => {
    const l = ladderWith({ 1: 'placed', 2: 'placed', 3: 'placed' }, { mode: placementMode('migration', '4', MIGRATION_JUMP, MIGRATION_PROBES), lastAt: undefined })
    const { probed, ladder, events } = answer(l, 'Fxx')
    expect(probed).toEqual(['4', 'C1', '6'])
    expect(events.filter((e) => e.e === 'ladder')).toEqual([{ e: 'ladder', rung: '4', change: 'placed', by: 'migration' }])
    expect(events[events.length - 1]).toMatchObject({ e: 'placement', phase: 'end', kind: 'migration' })
    expect(frontier(ladder, ALL_ON)).toBe('5')
  })
  it('a run end in the middle continues in the next run', () => {
    const mid = answer(LADDER_START, 'FF').ladder
    expect(mid.mode).toMatchObject({ kind: 'placement', at: '14', probes: 2 })
    const next = beginRun(mid, { now: 2000, set: ALL_ON })
    expect(next.ladder.mode).toEqual(mid.mode)
    const again = beginRun(mid, { now: 1000 + 13 * 3600e3, set: ALL_ON })
    expect(again.playDay).toBe(true)
    expect(again.ladder.mode).toEqual(mid.mode)
    const rest = answer(next.ladder, 'F')
    expect(rest.probed).toEqual(['14'])
    expect(rest.events.some((e) => e.e === 'placement' && e.phase === 'start')).toBe(false)
  })
  it('positions are of the offered rungs: a switched-off rung maps to the nearest offered one below', () => {
    expect(positionIn(['1', '2', '3', '5'] as RungId[], '4')).toBe(2)
    const set = { ...ALL_ON, compare: false, jumps: false, times: false }
    // offered: 1 to 19 and H1 (20 rungs); a jump of 8 from 1 lands on 9
    expect(answer(LADDER_START, 'FF', set).probed).toEqual(['1', '9'])
  })
})

describe('the re-check', () => {
  it('the constants', () => {
    expect([RECHECK_DAYS, RECHECK_FAST_PASSES, RECHECK_PROBES, RECHECK_FIRST]).toEqual([5, 2, 3, 4])
  })
  const ready = (extra: Partial<Ladder> = {}) =>
    ladderWith({ 1: 'passed', 2: 'passed', 3: 'passed', 4: 'passed', 5: 'passed', 6: 'passed' }, { day: 6, checkedOn: 1, lastAt: 0, ...extra })
  const playDay = (l: Ladder) => beginRun(l, { now: 12 * 3600e3, set: ALL_ON }).ladder
  /** the warm-up on rung 6, ended at once by 3 fast right answers */
  function afterWarmup(l: Ladder) {
    const out = answerAny(playDay(l), 'FFF', (it) => it === '6')
    return out
  }
  function answerAny(l: Ladder, script: string, isTarget: (r: RungId) => boolean) {
    const rng = lcg(5)
    let ladder = l
    const events: LadderEvent[] = []
    const probed: RungId[] = []
    let i = 0
    while (i < script.length) {
      const ch = chooseRound(ladder, { rng, set: ALL_ON, stats: {}, last: { sinceZero: 0 } })
      const c = isTarget(ch.item.rung) || ch.part === 'probe' ? script[i++] : 'o'
      if (ch.part === 'probe') probed.push(ch.item.rung)
      const mark: Mark = c === 'F' ? 'o' : (c as Mark)
      const out = afterAnswer(ch.ladder, { item: ch.item, part: ch.part, mark, fast: c === 'F', now: 13 * 3600e3, set: ALL_ON })
      ladder = out.ladder
      events.push(...out.events)
    }
    return { ladder, events, probed }
  }
  it('due 5 play days after the last check: it starts when the warm-up ends, on the 4th rung above the frontier', () => {
    const w = afterWarmup(ready())
    const warm = w.events.find((e) => e.e === 'warmup')
    expect(warm).toMatchObject({ rung: '6', how: 'fast' })
    // its rounds count the review rounds too
    expect(warm?.e === 'warmup' && warm.rounds).toBeGreaterThanOrEqual(3)
    // the frontier is 7; above it: C1, 8, 9, 10…
    expect(w.ladder.mode).toEqual({ kind: 'recheck', at: '10', probes: 0 })
  })
  it('right and fast places it with its needs, then the 2nd, then the 1st: 3 probes at most', () => {
    const w = afterWarmup(ready()).ladder
    const { ladder, events, probed } = answerAny(w, 'FFF', () => false)
    // 10 brings 9 and the frontier 7 with it; the frontier is C1 then: above it 8, 11, 12…
    expect(probed).toEqual(['10', '11', '8'])
    expect(placed(ladder)).toEqual(['7', '8', '9', '10', '11'])
    expect(events[0]).toEqual({ e: 'placement', phase: 'start', kind: 'recheck', probes: 0, mistakes: 0, frontier: '7' })
    expect(events.filter((e) => e.e === 'ladder').every((e) => e.e === 'ladder' && e.by === 'recheck')).toBe(true)
    expect(events[events.length - 1]).toEqual({ e: 'placement', phase: 'end', kind: 'recheck', probes: 3, mistakes: 0, frontier: 'C1' })
    expect(ladder.mode.kind).toBe('practice')
    expect(ladder.checkedOn).toBe(ladder.day)
  })
  it('a wrong or slow answer ends it quietly: no change, no strike, no hold', () => {
    const w = afterWarmup(ready()).ladder
    for (const c of ['x', 'o', 't']) {
      const { ladder, events } = answerAny(w, c, () => false)
      expect(ladder.rungs).toEqual(w.rungs)
      expect(ladder.strikeLeft).toBe(0)
      expect(events.map((e) => e.e)).toEqual(['placement', 'placement'])
      expect(ladder.mode.kind).toBe('practice')
      expect(ladder.checkedOn).toBe(ladder.day)
    }
  })
  it('due after 2 fast passes on his last play day', () => {
    const l = ready({ checkedOn: 5, fastPasses: { today: 2, lastDay: 0 } })
    expect(playDay(l).recheckDue).toBe(true)
    expect(playDay(ready({ checkedOn: 5, fastPasses: { today: 1, lastDay: 0 } })).recheckDue).toBe(false)
  })
  it('not due before 5 play days', () => {
    expect(playDay(ready({ checkedOn: 3 })).recheckDue).toBe(false)
    // day 6 → 7 on the play day: 7 − 2 = 5
    expect(playDay(ready({ checkedOn: 2 })).recheckDue).toBe(true)
  })
  it('with no warm-up rung it starts at once', () => {
    const l = ladderWith({}, { day: 6, checkedOn: 1, lastAt: 0, rungs: {} })
    // nothing earned: no warm-up; frontier 1, above it 2, 3, 4, 5…
    expect(playDay(l).mode).toEqual({ kind: 'recheck', at: '5', probes: 0 })
  })
  it('never in a run that has a placement', () => {
    const l = ready({ mode: placementMode('parent', '1', 8, 16) })
    const out = playDay(l)
    expect(out.mode.kind).toBe('placement')
    expect(out.recheckDue).toBe(false)
  })
})
