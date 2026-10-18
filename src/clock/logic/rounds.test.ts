import { describe, expect, it } from 'vitest'
import { HINT_AUTO, exercisesFor, features, hintFor, planRound, predict, scaffoldsFor, checkFor, type RoundContext } from './rounds'
import type { Tally } from '../../shared/adaptive'

const ctx = (over: Partial<RoundContext> = {}): RoundContext => ({
  level: 1, lang: 'he', rng: Math.random, tallies: {}, recent: {}, confusions: {}, ...over,
})

describe('rounds', () => {
  it('exercises by level', () => {
    expect(exercisesFor(1)).toEqual(['find', 'what', 'digitalPick', 'setShort'])
    expect(exercisesFor(2)).toContain('setLong')
    expect(exercisesFor(5)).toEqual(['find', 'what', 'digitalPick', 'setBoth', 'digitalSet'])
  })
  it('scaffolds by level', () => {
    expect(scaffoldsFor(1, 'wall', Math.random)).toEqual({ numbers: 'all', slice: false, hint: null, hintAuto: false, seconds: false })
    expect(scaffoldsFor(7, 'tower', Math.random).numbers).toBe('none')
    expect(scaffoldsFor(5, 'station', Math.random).seconds).toBe(true)
    expect(scaffoldsFor(4, 'pocket', Math.random).seconds).toBe(false)
  })
  it('plans are consistent', () => {
    for (let level = 1; level <= 7; level++)
      for (let i = 0; i < 40; i++) {
        const p = planRound(ctx({ level }))
        expect(p.level).toBe(level)
        if (['find', 'what', 'digitalPick'].includes(p.exercise)) {
          expect(p.options).toHaveLength(3)
          expect(p.options[p.correctIndex].family).toBeNull()
        } else expect(p.options).toHaveLength(0)
        expect(p.features).toContain(`m:${p.time.m}`)
        expect(p.predicted).toBeGreaterThan(0)
        expect(p.predicted).toBeLessThan(1)
      }
  })
  it('level 1 plays only o\'clock', () => {
    for (let i = 0; i < 30; i++) expect(planRound(ctx()).time.m).toBe(0)
  })
  it('about 70% of rounds use the new times', () => {
    let fresh = 0
    for (let i = 0; i < 300; i++) if (planRound(ctx({ level: 3 })).isNew) fresh++
    expect(fresh).toBeGreaterThan(150)
    expect(fresh).toBeLessThan(270)
  })
  it('forced exercise and time', () => {
    const p = planRound(ctx({ level: 2, forcedExercise: 'what', forcedTime: { h: 4, m: 30 } }))
    expect(p.exercise).toBe('what')
    expect(p.time).toEqual({ h: 4, m: 30 })
  })
  it('predict rises with misses on a feature', () => {
    const f = features({ exercise: 'find', time: { h: 3, m: 15 }, families: ['mirror'], scaffolds: { numbers: 'all', slice: true, hint: null, hintAuto: false, seconds: false }, level: 3 })
    const fresh = predict(f, {}, {})
    const bad: Record<string, Tally> = { 'tr:mirror': { seen: 6, wrong: 5 } }
    expect(predict(f, bad, { 'tr:mirror': 'xxxxo' })).toBeGreaterThan(fresh)
  })
  it('checkFor', () => {
    expect(checkFor('setShort')).toEqual({ hour: true, minute: false })
    expect(checkFor('setLong')).toEqual({ hour: false, minute: true })
    expect(checkFor('setBoth')).toEqual({ hour: true, minute: true })
  })
  it('never plans setLong for an o\'clock target', () => {
    for (let i = 0; i < 400; i++) {
      const p = planRound(ctx({ level: 2 }))
      expect(p.exercise === 'setLong' && p.time.m === 0).toBe(false)
    }
    const f = planRound(ctx({ level: 2, forcedExercise: 'setLong', forcedTime: { h: 4, m: 0 } }))
    expect(f.exercise).toBe('setShort')
  })
  it('the hint fits the time, and shows by itself for the first HINT_AUTO rounds', () => {
    expect(hintFor(0)).toBeNull()
    expect([15, 30, 45].map(hintFor)).toEqual(['quarters', 'quarters', 'quarters'])
    expect([5, 20, 40, 55].map(hintFor)).toEqual(['minutes', 'minutes', 'minutes', 'minutes'])
    expect(scaffoldsFor(3, 'wall', Math.random, { h: 3, m: 15 }, {}).hintAuto).toBe(true)
    expect(scaffoldsFor(3, 'wall', Math.random, { h: 3, m: 15 }, { quarters: HINT_AUTO }).hintAuto).toBe(false)
    expect(scaffoldsFor(3, 'wall', Math.random, { h: 3, m: 20 }, { quarters: HINT_AUTO }).hintAuto).toBe(true)
  })
})
