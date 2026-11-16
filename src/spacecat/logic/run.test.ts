import { describe, expect, it } from 'vitest'
import type { Rng } from '../../shared/adaptive'
import { HEARTS, RIGHT_PER_LEVEL, RUN_START, SHIP_LEVELS, applyResult, nextLevel, shipsReached, type Run } from './run'

const right1 = { result: 'right', points: 1 } as const
const right2 = { result: 'right', points: 2 } as const
const wrong = { result: 'wrong', points: 0 } as const
const timeout = { result: 'timeout', points: 0 } as const

describe('the run', () => {
  it('the constants', () => {
    expect(HEARTS).toBe(3)
    expect(RIGHT_PER_LEVEL).toBe(7)
    expect(SHIP_LEVELS).toEqual({ 2: 4, 3: 7 })
    expect(RUN_START).toEqual({ hearts: 3, level: 1, rightInLevel: 0, points: 0 })
  })
  it('7 right finish a level', () => {
    let r: Run = RUN_START
    for (let i = 1; i <= 7; i++) {
      const o = applyResult(r, i % 2 ? right1 : right2)
      r = o.run
      expect(o.levelDone).toBe(i === 7)
      expect(o.over).toBe(false)
    }
    expect(r.points).toBe(4 * 1 + 3 * 2 + 0)
    expect(r.rightInLevel).toBe(7)
  })
  it('one round costs at most one heart', () => {
    expect(applyResult(RUN_START, wrong).run.hearts).toBe(2)
    expect(applyResult(RUN_START, timeout).run.hearts).toBe(2)
    expect(applyResult(RUN_START, wrong).run.points).toBe(0)
  })
  it('the run ends at 0 hearts', () => {
    let r: Run = RUN_START
    for (let i = 0; i < 2; i++) expect(applyResult((r = applyResult(r, wrong).run), right1).over).toBe(false)
    r = applyResult(RUN_START, wrong).run
    r = applyResult(r, wrong).run
    const o = applyResult(r, timeout)
    expect(o.over).toBe(true)
    expect(o.run.hearts).toBe(0)
  })
  it('next level fills the hearts', () => {
    const r = nextLevel({ hearts: 1, level: 3, rightInLevel: 7, points: 20 })
    expect(r).toEqual({ hearts: 3, level: 4, rightInLevel: 0, points: 20 })
  })
  it('reaching level 4 unlocks ship 2 and level 7 ship 3', () => {
    expect(shipsReached(1)).toEqual([1])
    expect(shipsReached(3)).toEqual([1])
    expect(shipsReached(4)).toEqual([1, 2])
    expect(shipsReached(6)).toEqual([1, 2])
    expect(shipsReached(7)).toEqual([1, 2, 3])
    expect(shipsReached(12)).toEqual([1, 2, 3])
  })
  it('run length at 1 in 5', () => {
    let seed = 12345
    const rng: Rng = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 2 ** 32
    }
    const N = 20000
    let answers = 0, l4 = 0, l7 = 0
    for (let n = 0; n < N; n++) {
      let r: Run = RUN_START
      let maxLevel = 1
      for (;;) {
        answers++
        const o = applyResult(r, rng() < 0.2 ? wrong : right1)
        r = o.run
        if (o.over) break
        if (o.levelDone) {
          r = nextLevel(r)
          maxLevel = r.level
        }
      }
      if (maxLevel >= 4) l4++
      if (maxLevel >= 7) l7++
    }
    expect(answers / N).toBeGreaterThan(26)
    expect(answers / N).toBeLessThan(34)
    expect(l4 / N).toBeGreaterThan(0.36)
    expect(l4 / N).toBeLessThan(0.44)
    expect(l7 / N).toBeGreaterThan(0.13)
    expect(l7 / N).toBeLessThan(0.19)
  })
})
