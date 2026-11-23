import { describe, expect, it } from 'vitest'
import { START_PROGRESS, fixFor, needsSetRound, introsFor, isNewTime, recordNewAnswer, type LevelProgress } from './levels'
import type { Scaffolds } from './types'

import type { Exercise } from './types'
// answers: o/x = choice (find), O/X = a spoken set round (setBoth)
const run = (p: LevelProgress, answers: string) => {
  let passed = false
  for (const c of answers) {
    const ex: Exercise = c === 'O' || c === 'X' ? 'setBoth' : 'find'
    ;({ progress: p, passed } = recordNewAnswer(p, c === 'o' || c === 'O', ex))
  }
  return { p, passed }
}
const plain: Scaffolds = { numbers: 'all', slice: false, hint: null, hintAuto: false, seconds: false }

describe('levels', () => {
  it('fast-forward: 5 right with a set round among them pass the level', () => {
    expect(run(START_PROGRESS, 'oooOo')).toEqual({ p: { level: 2, newAnswers: '', newSetAnswers: '' }, passed: true })
  })
  it('fast-forward needs a set round: 5 right choices do not pass', () => {
    expect(run(START_PROGRESS, 'ooooo').passed).toBe(false)
    expect(run(START_PROGRESS, 'oooooo').passed).toBe(false)
    expect(run(START_PROGRESS, 'oooooO').passed).toBe(true)
  })
  it('a slip blocks fast-forward, also a set slip', () => {
    expect(run(START_PROGRESS, 'ooxOo').passed).toBe(false)
    expect(run(START_PROGRESS, 'oooXo').passed).toBe(false)
    expect(run(START_PROGRESS, 'oooXoOOOOOO').passed).toBe(false)
  })
  it('an old slip that scrolled out of the kept window still blocks fast-forward', () => {
    expect(run(START_PROGRESS, 'x' + 'o'.repeat(60) + 'O').passed).toBe(false)
  })
  it('8 of 10 choices plus 3 of 5 set rounds pass; either alone does not', () => {
    expect(run(START_PROGRESS, 'ooxooooxoo').passed).toBe(false)
    expect(run(START_PROGRESS, 'ooxooooxooXXOOO').passed).toBe(true)
    expect(run(START_PROGRESS, 'ooxooooxooXXOOX').passed).toBe(false)
    expect(run(START_PROGRESS, 'ooxoooxxooXXOOO').passed).toBe(false)
  })
  it('his real level 4: choices pass, set rounds 1/18 does not pass', () => {
    const r = run(START_PROGRESS, 'ooxooooxoo' + 'OXXXXXXXXXXXXXXXXX')
    expect(r.passed).toBe(false)
    expect(r.p.newSetAnswers.slice(-5)).toBe('xxxxx')
  })
  it('failed set rounds do not move the choice window', () => {
    const r = run(START_PROGRESS, 'ooxooooxooXXXX')
    expect(r.p.newAnswers).toBe('ooxooooxoo')
    expect(r.p.newSetAnswers).toBe('xxxx')
  })
  it('needsSetRound: every 3rd round, only while the choice window passes and the set window blocks', () => {
    const base = run(START_PROGRESS, 'ooxooooxoo').p
    expect(needsSetRound(base, 3)).toBe(true)
    expect(needsSetRound(base, 6)).toBe(true)
    expect(needsSetRound(base, 4)).toBe(false)
    expect(needsSetRound(run(START_PROGRESS, 'ooxooooxooXXXX').p, 9)).toBe(true)
    expect(needsSetRound({ ...base, newSetAnswers: 'xxooo' }, 3)).toBe(false)
    expect(needsSetRound(run(START_PROGRESS, 'ooxoo').p, 3)).toBe(false)
    expect(needsSetRound({ level: 7, newAnswers: 'oooooooooo', newSetAnswers: '' }, 3)).toBe(false)
  })
  it('level 7 never passes', () => expect(run({ level: 7, newAnswers: '', newSetAnswers: '' }, 'oooooooooooo').passed).toBe(false))
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

describe('fix-toAsPast', () => {
  it('fixFor maps the tag, with the cooldown', () => {
    expect(fixFor({ explained: {}, roundNo: 5 }, 'toAsPast')).toBe('fix-toAsPast')
    expect(fixFor({ explained: { 'fix-toAsPast': 4 }, roundNo: 5 }, 'toAsPast')).toBeNull()
  })
})
