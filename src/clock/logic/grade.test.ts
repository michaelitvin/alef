import { describe, expect, it } from 'vitest'
import { evaluateChoice, evaluateSet, gradeSet, snapMinute } from './grade'
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
