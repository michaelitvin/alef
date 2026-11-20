import { describe, expect, it } from 'vitest'
import { FAST_START_STREAK, LADDER_START, OPEN_MAX_MISTAKES, OPEN_WINDOW, RUNGS, afterAnswer, candidates, itemsOfOldRung, oldRungOf, openRungs, type LadderSettings, type LadderState, type RungId } from './ladder'
import type { Mark } from './predict'

const auto: LadderSettings = { range: 'auto', times: true, divide: true }
const play = (s: LadderState, marks: string, set = auto, rung?: RungId) => {
  let st = s
  let opened: RungId | undefined
  for (const m of marks) {
    const it = itemsOfOldRung(rung ?? st.top)[0]
    const r = afterAnswer(st, it, m as Mark, set)
    st = r.state
    if (r.opened) opened = r.opened
  }
  return { st, opened }
}

describe('the ladder', () => {
  it('the constants', () => {
    expect(OPEN_WINDOW).toBe(12)
    expect(OPEN_MAX_MISTAKES).toBe(2)
    expect(FAST_START_STREAK).toBe(4)
    expect(LADDER_START).toEqual({ top: 1, topRecent: '', topMistake: false, streak: 0 })
  })
  it('four right in a row open the next rung before any mistake', () => {
    const { st, opened } = play(LADDER_START, 'oooo')
    expect(opened).toBe(2)
    expect(st.top).toBe(2)
    expect(st.topRecent).toBe('')
    expect(st.streak).toBe(0)
  })
  it('after a mistake the fast start is gone', () => {
    expect(play(LADDER_START, 'xoooo').opened).toBeUndefined()
  })
  it('12 answers with 2 mistakes open', () => {
    expect(play(LADDER_START, 'xooooooooxoo').opened).toBe(2)
  })
  it('12 with 2.5 (two x, one t) do not', () => {
    expect(play(LADDER_START, 'xoootooooxoo').opened).toBeUndefined()
  })
  it('answers on lower rungs do not count', () => {
    const s: LadderState = { top: 3, topRecent: '', topMistake: false, streak: 0 }
    const { st, opened } = play(s, 'oooooo', auto, 1)
    expect(opened).toBeUndefined()
    expect(st).toEqual(s)
  })
  it('rung 7 needs the times switch', () => {
    const s: LadderState = { top: 6, topRecent: '', topMistake: false, streak: 0 }
    const set = { ...auto, times: false }
    expect(play(s, 'oooooooooooo', set).opened).toBeUndefined()
    expect(play(s, 'oooo', auto).opened).toBe(7)
  })
  it('turning times off closes rungs 7 to 9 for the choice', () => {
    const s: LadderState = { top: 8, topRecent: '', topMistake: false, streak: 0 }
    expect(candidates(s, auto).some((i) => i.kind === 'sum' && i.op === '×')).toBe(true)
    expect(candidates(s, { ...auto, times: false }).some((i) => i.kind === 'sum' && i.op === '×')).toBe(false)
    expect(openRungs(s, { ...auto, times: false })).toEqual([1, 2, 3, 4, 5, 6])
  })
  it("the parent's range opens and caps", () => {
    const set: LadderSettings = { range: 3, times: false, divide: false }
    expect(openRungs(LADDER_START, set)).toEqual([1, 2, 3])
    expect(play(LADDER_START, 'oooooooooooooooooooo', set).opened).toBeUndefined()
    expect(candidates(LADDER_START, set).length).toBe([1, 2, 3].flatMap((r) => itemsOfOldRung(r as RungId)).length)
  })
  it('the top rung is the last one: nothing opens', () => {
    const s: LadderState = { top: 9, topRecent: '', topMistake: false, streak: 0 }
    expect(play(s, 'oooooooooooo').opened).toBeUndefined()
  })
})

describe('the adapter to the new rungs (until the longer ladder replaces this file)', () => {
  it('every offered item has one old rung and the old rungs do not overlap', () => {
    const seen = new Set<string>()
    for (const { id } of RUNGS) {
      const items = itemsOfOldRung(id)
      expect(items.length).toBeGreaterThan(0)
      for (const it of items) {
        expect(oldRungOf(it)).toBe(id)
        expect(seen.has(it.id)).toBe(false)
        seen.add(it.id)
      }
    }
  })
  it('old rung 4 is the missing-number sums within 10', () => {
    const ids = itemsOfOldRung(4).map((i) => i.id)
    expect(ids).toContain('3+4=7/b')
    expect(ids).toContain('3+4=7/a')
    expect(ids).toContain('7+3=10/b')
    expect(ids).not.toContain('13+4=17/a')
  })
  it('times and divide are the new T rungs', () => {
    expect(itemsOfOldRung(7).map((i) => i.id)).toContain('3x10=30/c')
    expect(itemsOfOldRung(8).map((i) => i.id)).toContain('6x7=42/c')
    expect(itemsOfOldRung(9).map((i) => i.id)).toContain('42/7=6/c')
  })
})
