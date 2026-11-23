import { describe, expect, it } from 'vitest'
import type { Rng } from '../../shared/adaptive'
import { itemsOfRung } from './facts'
import { pickNext } from './predict'
import {
  AVOID_LEVELS, GAP_FIRST, GAP_SECOND, MAX_REHEARSALS, NO_REPEAT, OVERDUE_DROP, RECENT_FACTS, SPACING_START, afterRound, avoidSet, dueRehearsal, type Spacing,
} from './spacing'

const lcg = (seed: number): Rng => {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

describe('spacing bookkeeping', () => {
  it('keeps the last RECENT_FACTS facts', () => {
    let sp: Spacing = SPACING_START
    for (let i = 0; i < 10; i++) sp = afterRound(sp, `f${i}`, 'o', () => 0)
    expect(sp.recent).toEqual(['f4', 'f5', 'f6', 'f7', 'f8', 'f9'])
    expect(sp.recent).toHaveLength(RECENT_FACTS)
  })
  it('a mistake schedules step 1 within the first gap; a demo schedules nothing', () => {
    expect(afterRound(SPACING_START, 'a', 'x', () => 0).rehearsals).toEqual([{ fact: 'a', step: 1, due: 1 + GAP_FIRST[0] }])
    expect(afterRound(SPACING_START, 'a', 't', () => 0.999).rehearsals[0].due).toBe(1 + GAP_FIRST[1])
    expect(afterRound(SPACING_START, 'a', undefined, () => 0).rehearsals).toEqual([])
  })
  it('a right answer when due moves to step 2, then ends; a wrong one starts again', () => {
    let sp = afterRound(SPACING_START, 'a', 'x', () => 0)
    sp = { ...sp, round: sp.rehearsals[0].due }
    const s2 = afterRound(sp, 'a', 'o', () => 0)
    expect(s2.rehearsals).toEqual([{ fact: 'a', step: 2, due: s2.round + GAP_SECOND[0] }])
    expect(afterRound({ ...s2, round: s2.rehearsals[0].due }, 'a', 'o', () => 0).rehearsals).toEqual([])
    expect(afterRound({ ...s2, round: s2.rehearsals[0].due }, 'a', 'x', () => 0).rehearsals[0].step).toBe(1)
  })
  it('a right answer before it was due changes nothing', () => {
    const sp = afterRound(SPACING_START, 'a', 'x', () => 0)
    expect(afterRound(sp, 'a', 'o', () => 0).rehearsals).toEqual(sp.rehearsals)
  })
  it('keeps at most MAX_REHEARSALS (oldest dropped) and drops an overdue one', () => {
    let sp: Spacing = SPACING_START
    for (const f of ['a', 'b', 'c', 'd']) sp = afterRound(sp, f, 'x', () => 0)
    expect(sp.rehearsals.map((r) => r.fact)).toEqual(['b', 'c', 'd'])
    expect(sp.rehearsals).toHaveLength(MAX_REHEARSALS)
    const old = afterRound(SPACING_START, 'a', 'x', () => 0)
    expect(afterRound({ ...old, round: old.rehearsals[0].due + OVERDUE_DROP }, 'z', 'o', () => 0).rehearsals).toEqual([])
  })
  it('the older due rehearsal comes first, and only an offered one', () => {
    const sp: Spacing = { round: 10, recent: [], rehearsals: [{ fact: 'a', step: 1, due: 9 }, { fact: 'b', step: 1, due: 8 }, { fact: 'c', step: 1, due: 12 }] }
    expect(dueRehearsal(sp, () => true)?.fact).toBe('a')
    expect(dueRehearsal(sp, (f) => f !== 'a')?.fact).toBe('b')
    expect(dueRehearsal(sp, (f) => f === 'c')).toBeUndefined()
  })
})

describe('a mistake in the picker', () => {
  const cands = itemsOfRung('2')
  const play = (seed: number) => {
    const rng = lcg(seed)
    let sp: Spacing = SPACING_START
    const asked: string[] = []
    const marks: string[] = []
    for (let r = 0; r < 25; r++) {
      const it = pickNext(rng, cands, {}, { sinceZero: 0, spacing: sp })
      const target = asked.length === 0
      // the first round is a mistake; every other answer is right except a repeat of the first fact in the first test
      const mark = target ? 'x' : 'o'
      asked.push(it.fact); marks.push(mark)
      sp = afterRound(sp, it.fact, mark, rng)
    }
    return { asked, marks }
  }
  it('the fact returns at the uneven gaps and never within NO_REPEAT rounds otherwise', () => {
    const gaps = new Set<string>()
    for (let seed = 1; seed <= 40; seed++) {
      const { asked } = play(seed)
      const f = asked[0]
      const at = asked.map((a, i) => (a === f ? i : -1)).filter((i) => i >= 0)
      // return 1 after GAP_FIRST other rounds, return 2 after GAP_SECOND other rounds, then no rehearsal
      expect(at[1] - at[0] - 1).toBeGreaterThanOrEqual(GAP_FIRST[0])
      expect(at[1] - at[0] - 1).toBeLessThanOrEqual(GAP_FIRST[1])
      expect(at[2] - at[1] - 1).toBeGreaterThanOrEqual(GAP_SECOND[0])
      expect(at[2] - at[1] - 1).toBeLessThanOrEqual(GAP_SECOND[1])
      gaps.add(`${at[1] - at[0]},${at[2] - at[1]}`)
      // any other repeat of any fact keeps NO_REPEAT rounds in between
      const lastAt: Record<string, number> = {}
      asked.forEach((a, i) => {
        if (a in lastAt && !at.includes(i)) expect(i - lastAt[a]).toBeGreaterThan(NO_REPEAT)
        lastAt[a] = i
      })
    }
    expect(gaps.size).toBeGreaterThan(3)
  })
  it('a wrong answer on the return starts again at the first gap', () => {
    const rng = lcg(7)
    let sp = afterRound(SPACING_START, cands[0].fact, 'x', rng)
    sp = { ...sp, round: sp.rehearsals[0].due }
    expect(pickNext(rng, cands, {}, { sinceZero: 0, spacing: sp }).fact).toBe(cands[0].fact)
    const again = afterRound(sp, cands[0].fact, 'x', rng)
    expect(again.rehearsals[0]).toMatchObject({ step: 1 })
    expect(again.rehearsals[0].due - again.round).toBeLessThanOrEqual(GAP_FIRST[1])
  })
  it('a probe never takes a rehearsal, and a due fact that the part does not offer waits', () => {
    const sp: Spacing = { round: 5, recent: [], rehearsals: [{ fact: cands[0].fact, step: 1, due: 5 }] }
    const others = cands.filter((i) => i.fact !== cands[0].fact)
    for (let i = 0; i < 50; i++) expect(pickNext(lcg(i), others, {}, { sinceZero: 0, spacing: sp }).fact).not.toBe(cands[0].fact)
    let hits = 0
    for (let i = 0; i < 50; i++) if (pickNext(lcg(i), cands, {}, { sinceZero: 0, spacing: sp, noRehearsal: true }).fact === cands[0].fact) hits++
    expect(hits).toBeLessThan(50)
  })
  it('falls back step by step when the pool is small', () => {
    const two = cands.filter((i) => i.fact === cands[0].fact || i.fact === cands[1].fact)
    const sp: Spacing = { round: 3, recent: [cands[1].fact, cands[0].fact], rehearsals: [] }
    expect(pickNext(lcg(1), two, {}, { sinceZero: 0, spacing: sp }).fact).toBe(cands[1].fact)
  })
  it('a rehearsal keeps the id of the missed item, and the second step keeps it too', () => {
    const sp = afterRound(SPACING_START, 'a', 'x', () => 0, 'item-a')
    expect(sp.rehearsals[0].item).toBe('item-a')
    const s2 = afterRound({ ...sp, round: sp.rehearsals[0].due }, 'a', 'o', () => 0, 'item-a')
    expect(s2.rehearsals[0]).toMatchObject({ step: 2, item: 'item-a' })
  })
  it('rehearsals that wait are avoided at every level but the last', () => {
    const sp: Spacing = { round: 5, recent: ['r1', 'r2', 'r3', 'r4'], rehearsals: [{ fact: 'w', step: 1, due: 9 }] }
    for (let level = 0; level < AVOID_LEVELS.length - 1; level++) expect(avoidSet(sp, level).has('w')).toBe(true)
    expect(avoidSet(sp, AVOID_LEVELS.length - 1).size).toBe(0)
  })
})
