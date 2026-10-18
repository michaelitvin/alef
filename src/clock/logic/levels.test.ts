import { describe, expect, it } from 'vitest'
import { START_PROGRESS, fixFor, introsFor, isNewTime, recordNewAnswer, type LevelProgress } from './levels'
import type { Scaffolds } from './types'

const run = (p: LevelProgress, answers: string) => {
  let passed = false
  for (const c of answers) ({ progress: p, passed } = recordNewAnswer(p, c === 'o'))
  return { p, passed }
}
const plain: Scaffolds = { numbers: 'all', slice: false, hint: null, hintAuto: false, seconds: false }

describe('levels', () => {
  it('fast-forward: the first 5 new answers right pass the level', () => {
    expect(run(START_PROGRESS, 'ooooo')).toEqual({ p: { level: 2, newAnswers: '' }, passed: true })
  })
  it('a slip blocks fast-forward; 8 of the last 10 then pass', () => {
    expect(run(START_PROGRESS, 'ooxoo').passed).toBe(false)
    expect(run(START_PROGRESS, 'ooxooooxoo').passed).toBe(true)
    expect(run(START_PROGRESS, 'ooxoooxxoo').passed).toBe(false)
  })
  it('level 7 never passes', () => expect(run({ level: 7, newAnswers: '' }, 'oooooooooooo').passed).toBe(false))
  it('isNewTime', () => {
    expect(isNewTime(3, 15)).toBe(true)
    expect(isNewTime(3, 30)).toBe(false)
  })
  it('intros: hands first, then the level idea and the exercise', () => {
    const s = { explained: {}, roundNo: 0, mistakes: [] }
    expect(introsFor(s, { level: 1, isNew: true, exercise: 'find', scaffolds: plain })).toEqual(['hands', 'ex-find'])
    const s2 = { explained: { hands: 0, 'ex-find': 0, 'ex-set': 3 }, roundNo: 9, mistakes: [] }
    expect(introsFor(s2, { level: 3, isNew: true, exercise: 'setBoth', scaffolds: { ...plain, seconds: true } })).toEqual(['level-3', 'seconds'])
    expect(introsFor(s2, { level: 3, isNew: false, exercise: 'digitalPick', scaffolds: plain })).toEqual(['ex-digital'])
  })
  it('the "to" side explanation waits for a round that says "to" (:35 and "one forty" do not)', () => {
    const s = { explained: { hands: 0, 'ex-find': 0 }, roundNo: 9, mistakes: [] }
    const at = (m: number, digital40 = false) => introsFor(s, { level: 6, isNew: true, exercise: 'find', scaffolds: plain, time: { m }, digital40 })
    expect(at(35)).toEqual([])
    expect(at(40, true)).toEqual([])
    expect(at(40)).toEqual(['level-6'])
    expect(at(50)).toEqual(['level-6'])
  })
  it('the first digital set also gets the finger demo when it has not played', () => {
    const s = { explained: { hands: 0, 'ex-find': 0 }, roundNo: 9, mistakes: [] }
    expect(introsFor(s, { level: 3, isNew: false, exercise: 'digitalSet', scaffolds: plain })).toEqual(['ex-digital', 'ex-set'])
    const s2 = { explained: { hands: 0, 'ex-set': 2 }, roundNo: 9, mistakes: [] }
    expect(introsFor(s2, { level: 3, isNew: false, exercise: 'digitalSet', scaffolds: plain })).toEqual(['ex-digital'])
    const s3 = { explained: { hands: 0, 'ex-digital': 2 }, roundNo: 9, mistakes: [] }
    expect(introsFor(s3, { level: 3, isNew: false, exercise: 'digitalSet', scaffolds: plain })).toEqual(['ex-set'])
  })
  it('a mistake brings its explanation, then a cooldown of FIX_COOLDOWN rounds; an untagged mistake none', () => {
    expect(fixFor({ explained: {}, roundNo: 7 }, 'mirror')).toBe('fix-mirror')
    expect(fixFor({ explained: { 'fix-mirror': 5 }, roundNo: 7 }, 'mirror')).toBeNull()
    expect(fixFor({ explained: { 'fix-mirror': 1 }, roundNo: 7 }, 'mirror')).toBe('fix-mirror')
    expect(fixFor({ explained: {}, roundNo: 7 }, 'far')).toBeNull()
    expect(fixFor({ explained: {}, roundNo: 7 }, null)).toBeNull()
  })
})
