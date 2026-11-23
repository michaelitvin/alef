import { describe, expect, it } from 'vitest'
import { evaluateChoice, evaluateSet, gradeSet, snapMinute } from './grade'
import { poseOf } from './time'
import type { Option } from './tricks'

const both = { hour: true, minute: true }

describe('gradeSet', () => {
  it('accepts the right pose', () => expect(gradeSet({ h: 3, m: 30 }, { hour: 105, minute: 180 }, both)).toEqual({ correct: true, error: null }))
  it('half past with the short hand on the number fails as not advanced', () =>
    expect(gradeSet({ h: 3, m: 30 }, { hour: 90, minute: 180 }, both)).toEqual({ correct: false, error: 'notAdvanced' }))
  it('quarter to with the short hand on the next number passes', () =>
    expect(gradeSet({ h: 3, m: 45 }, { hour: 120, minute: 270 }, both).correct).toBe(true))
  it('classifies swapped hands', () => expect(gradeSet({ h: 3, m: 0 }, { hour: 0, minute: 90 }, both).error).toBe('swap'))
  it('does not call it swapped when one hand is right', () =>
    expect(gradeSet({ h: 3, m: 15 }, { hour: 82.5, minute: 90 }, both).error).toBe('hour1'))
  it('classifies the mirror', () => expect(gradeSet({ h: 3, m: 15 }, { hour: 97.5, minute: 270 }, both).error).toBe('mirror'))
  it('classifies five off', () => expect(gradeSet({ h: 3, m: 20 }, { hour: 100, minute: 150 }, both).error).toBe('five'))
  it('classifies number as minutes', () => expect(gradeSet({ h: 3, m: 5 }, { hour: 92.5, minute: 150 }, both).error).toBe('numberAsMin'))
  it('classifies hour off by one', () => expect(gradeSet({ h: 3, m: 0 }, { hour: 120, minute: 0 }, both).error).toBe('hour1'))
  it('checks only the hand asked for', () => expect(gradeSet({ h: 3, m: 0 }, { hour: 90, minute: 200 }, { hour: true, minute: false }).correct).toBe(true))
  it('snaps the long hand to five minutes', () => {
    expect(snapMinute(44)).toBe(30)
    expect(snapMinute(352)).toBe(0)
  })
})

describe('evaluate', () => {
  const opts: Option[] = [
    { family: null, pose: { hour: 90, minute: 0 }, time: { h: 3, m: 0 }, digital: '3:00' },
    { family: 'hour1', pose: { hour: 120, minute: 0 }, time: { h: 4, m: 0 }, digital: '4:00' },
    { family: 'far', pose: { hour: 270, minute: 180 }, time: { h: 9, m: 30 }, digital: '9:30' },
  ]
  it('choice', () => {
    expect(evaluateChoice(opts, 0, 0)).toEqual({ correct: true, nearMiss: false, tag: null, chosen: { h: 3, m: 0 } })
    expect(evaluateChoice(opts, 0, 1)).toEqual({ correct: false, nearMiss: false, tag: 'hour1', chosen: { h: 4, m: 0 } })
  })
  it('five off is a near miss once', () => {
    expect(evaluateSet({ h: 3, m: 20 }, { hour: 100, minute: 150 }, both, false).nearMiss).toBe(true)
    expect(evaluateSet({ h: 3, m: 20 }, { hour: 100, minute: 150 }, both, true).nearMiss).toBe(false)
  })
})

describe('toAsPast: the "to" time heard as "past"', () => {
  const heard = { exercise: 'setBoth' as const, digital40: false }
  const set = (t: { h: number; m: number }, wrong: { h: number; m: number }, ctx: { exercise: 'setBoth' | 'digitalSet' | 'setShort'; digital40: boolean } = heard) =>
    evaluateSet(t, poseOf(wrong), both, false, ctx).tag
  it('his real poses: 3:45 set as 4:15, 10:45 as 11:15', () => {
    expect(set({ h: 3, m: 45 }, { h: 4, m: 15 })).toBe('toAsPast')
    expect(set({ h: 10, m: 45 }, { h: 11, m: 15 })).toBe('toAsPast')
  })
  it(':50 and :55 (mirror before this change)', () => {
    expect(set({ h: 3, m: 50 }, { h: 4, m: 10 })).toBe('toAsPast')
    expect(set({ h: 3, m: 55 }, { h: 4, m: 5 })).toBe('toAsPast')
    expect(evaluateSet({ h: 3, m: 50 }, poseOf({ h: 4, m: 10 }), both, false).tag).toBe('mirror')
  })
  it('the 12 wraps: 11:45 set as 12:15', () => expect(set({ h: 11, m: 45 }, { h: 12, m: 15 })).toBe('toAsPast'))
  it('a digital round has no phrase: the old tag stays', () => {
    expect(set({ h: 3, m: 45 }, { h: 4, m: 15 }, { exercise: 'digitalSet', digital40: false })).toBe('other')
    expect(set({ h: 3, m: 50 }, { h: 4, m: 10 }, { exercise: 'digitalSet', digital40: false })).toBe('mirror')
  })
  it(':40 read as "forty" says no "to"', () => {
    expect(set({ h: 3, m: 40 }, { h: 4, m: 20 }, { exercise: 'setShort', digital40: true })).not.toBe('toAsPast')
    expect(set({ h: 3, m: 40 }, { h: 4, m: 20 }, { exercise: 'setShort', digital40: false })).toBe('toAsPast')
  })
  it('a past-side mirror stays mirror', () => expect(evaluateSet({ h: 3, m: 15 }, { hour: 97.5, minute: 270 }, both, false, heard).tag).toBe('mirror'))
  it('the long hand on the 9 with the short hand on the four is still notAdvanced-free: hour1/other, not toAsPast', () =>
    expect(set({ h: 3, m: 45 }, { h: 4, m: 45 })).not.toBe('toAsPast'))
  const opt = (time: { h: number; m: number } | null, family: Option['family']): Option => ({ family, pose: { hour: 0, minute: 0 }, time, digital: '' })
  it('a choice of 4:15 for 3:45 in find is toAsPast; digitalPick keeps the family', () => {
    const opts = [opt({ h: 3, m: 45 }, null), opt({ h: 4, m: 15 }, 'mirror')]
    expect(evaluateChoice(opts, 0, 1, { exercise: 'find', digital40: false }).tag).toBe('toAsPast')
    expect(evaluateChoice(opts, 0, 1, { exercise: 'digitalPick', digital40: false }).tag).toBe('mirror')
    expect(evaluateChoice(opts, 0, 1).tag).toBe('mirror')
  })
  it('a choice of the past-side twin stays mirror', () => {
    const opts = [opt({ h: 3, m: 15 }, null), opt({ h: 2, m: 45 }, 'mirror')]
    expect(evaluateChoice(opts, 0, 1, { exercise: 'what', digital40: false }).tag).toBe('mirror')
  })
})
