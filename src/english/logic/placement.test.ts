import { describe, expect, it } from 'vitest'
import { BLENDS, unitsOfStage } from '../content/units'
import { word } from '../content/words'
import { creditOf, seedAfterPlacement, startPlacement, stepPlacement, type PlacementState } from './placement'

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/** a simulated child: is his answer right, given the stage asked, whether it is a confirmation and the state */
type Child = (stage: number, confirming: boolean, s: PlacementState) => boolean

/** runs a whole placement; `walkAnswers` counts the answers before the confirmations */
function walk(ready: number[], child: Child | 'always-right' | 'always-wrong') {
  const answer: Child = child === 'always-right' ? () => true : child === 'always-wrong' ? () => false : child
  let { state, next } = startPlacement(ready)
  const asked: number[] = []
  const kinds: string[] = []
  let walkAnswers = 0
  while ('ask' in next) {
    if (asked.length > 40) throw new Error('the walk does not end')
    const confirming = state.confirming.length > 0
    asked.push(next.ask.stage)
    kinds.push(next.ask.kind)
    if (!confirming) walkAnswers++
    ;({ state, next } = stepPlacement(state, answer(next.ask.stage, confirming, state), ready))
  }
  return { answers: asked.length, level: next.done.level, asked, kinds, walkAnswers }
}

const readsUpTo = (n: number): Child => (stage) => stage <= n
const rightExceptConfirming = (n: number): Child => (stage, confirming) => !(confirming && stage === n)
const alternating = (): Child => {
  let i = 0
  return () => i++ % 2 === 0
}
/** misses the first ask of every stage, then reads it */
const missesFirstAsk = (): Child => {
  const seen = new Set<number>()
  return (stage) => {
    const first = !seen.has(stage)
    seen.add(stage)
    return !first
  }
}

const strip = ({ answers, level, asked }: ReturnType<typeof walk>) => ({ answers, level, asked })

describe('the placement walk', () => {
  it('a child who reads everything: 5 answers and 2 confirmations, level 9', () =>
    expect(strip(walk(ALL, 'always-right'))).toEqual({ answers: 7, level: 9, asked: [4, 6, 8, 9, 9, 5, 7] }))
  // the mock said 7; the table as written asks stage 1 twice before it can say "level 1" (2 wrong at s = 1)
  it('a child who misses everything: level 1', () =>
    expect(strip(walk(ALL, 'always-wrong'))).toEqual({ answers: 8, level: 1, asked: [4, 4, 3, 3, 2, 2, 1, 1] }))
  it('reads stages 1–4: level 5', () => expect(walk(ALL, readsUpTo(4)).level).toBe(5))
  it('reads stages 1–5: level 6, and stage 5, jumped over and then asked, is not confirmed again', () =>
    expect(strip(walk(ALL, readsUpTo(5)))).toEqual({ answers: 6, level: 6, asked: [4, 6, 6, 5, 5, 6] }))
  it('a confirmation miss lowers the level to that stage', () => expect(walk(ALL, rightExceptConfirming(5)).level).toBe(5))
  it('a confirmation miss at 7 makes 7 the level (5 was confirmed first)', () =>
    expect(strip(walk(ALL, rightExceptConfirming(7)))).toEqual({ answers: 7, level: 7, asked: [4, 6, 8, 9, 9, 5, 7] }))
  it('stops after 15 answers (confirmations come after)', () => expect(walk(ALL, alternating()).walkAnswers).toBeLessThanOrEqual(15))
  it('after 15 answers the stage asked is his level', () => {
    const w = walk(ALL, missesFirstAsk())
    expect(w).toMatchObject({ walkAnswers: 15, answers: 15, level: 8 })
    expect(w.asked).toEqual([4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8])
  })
  it('the kind alternates, picture first, through the confirmations', () =>
    expect(walk(ALL, 'always-right').kinds).toEqual(['picture', 'name', 'picture', 'name', 'picture', 'name', 'picture']))
  it('only ready stages are asked, from min(4, the highest ready)', () => {
    expect(Math.max(...walk([1, 2, 3], 'always-right').asked)).toBe(3)
    expect(walk([1, 2, 3], 'always-right').asked[0]).toBe(3)
  })
  it('it never asks or lands on a stage that is not ready', () => {
    for (const ready of [[1], [1, 2], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6, 7]]) {
      for (const child of ['always-right', 'always-wrong', readsUpTo(4), readsUpTo(6), alternating(), missesFirstAsk()] as const) {
        const w = walk(ready, child)
        for (const s of [...w.asked, w.level]) expect(ready).toContain(s)
      }
    }
    // a gap (stage 3 not ready): only the ready stages below the gap
    const gap = walk([1, 2, 4, 5], 'always-right')
    expect(gap).toMatchObject({ level: 2, asked: [2, 2] })
  })
  it('a miss costs nothing but the count: the state has no hearts, hints or streak', () =>
    expect(Object.keys(startPlacement(ALL).state).sort()).toEqual(['asked', 'confirming', 'counts', 'jumped', 'kind', 'missed', 'stage']))
})

describe('the placement credit and seed', () => {
  it("a right word credits each unit; a miss counts only against the stage's unit", () => {
    expect(creditOf(word('ship'), 'sh', true)).toEqual([{ unit: 'sh', right: true }, { unit: 'i', right: true }, { unit: 'p', right: true }])
    expect(creditOf(word('ship'), 'sh', false)).toEqual([{ unit: 'sh', right: false }])
  })
  it('a right word with a blend credits its blend skill too', () =>
    expect(creditOf(word('frog'), 'fr-', true)).toContainEqual({ unit: 'fr-', right: true }))
  it('the seed covers the blends below the level', () => expect(seedAfterPlacement(6)['st-']).toMatchObject({ seen: 3, wrong: 0 }))
  it('the seed covers every unit below the level, and nothing of the level or above', () => {
    const seed = seedAfterPlacement(5)
    for (const s of [1, 2, 3, 4]) for (const u of unitsOfStage(s)) expect(seed[u.id]).toEqual({ seen: 3, wrong: 0 })
    for (const u of unitsOfStage(5)) expect(seed[u.id]).toBeUndefined()
    for (const b of BLENDS) expect(seed[b.id]).toBeUndefined()
    expect(seedAfterPlacement(1)).toEqual({})
  })
})
