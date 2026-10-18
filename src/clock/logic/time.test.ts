import { describe, expect, it } from 'vitest'
import { addMinutes, angleDelta, angleDiff, digital, hourAngle, minutesUpTo, minuteAngle, parseTimeId, readPose, timeId } from './time'

describe('time', () => {
  it('ids round-trip', () => {
    expect(timeId({ h: 3, m: 5 })).toBe('3-05')
    expect(parseTimeId('12-45')).toEqual({ h: 12, m: 45 })
  })
  it('addMinutes wraps round 12', () => {
    expect(addMinutes({ h: 12, m: 55 }, 5)).toEqual({ h: 1, m: 0 })
    expect(addMinutes({ h: 1, m: 0 }, -5)).toEqual({ h: 12, m: 55 })
    expect(addMinutes({ h: 11, m: 30 }, 45)).toEqual({ h: 12, m: 15 })
  })
  it('hand angles', () => {
    expect(hourAngle({ h: 3, m: 0 })).toBe(90)
    expect(hourAngle({ h: 3, m: 30 })).toBe(105)
    expect(hourAngle({ h: 12, m: 45 })).toBe(22.5)
    expect(minuteAngle({ h: 1, m: 45 })).toBe(270)
  })
  it('angle helpers', () => {
    expect(angleDiff(350, 10)).toBe(20)
    expect(angleDelta(350, 10)).toBe(20)
    expect(angleDelta(10, 350)).toBe(-20)
  })
  it('readPose reads the nearest hour below and the nearest five minutes', () => {
    expect(readPose({ hour: 0, minute: 90 })).toEqual({ h: 12, m: 15 })
    expect(readPose({ hour: 112, minute: 270 })).toEqual({ h: 3, m: 45 })
  })
  it('digital', () => expect(digital(3, 5)).toBe('3:05'))
  it('minutesUpTo', () => {
    expect(minutesUpTo(2)).toEqual([0, 30])
    expect(minutesUpTo(0)).toEqual([])
    expect(minutesUpTo(7)).toHaveLength(12)
  })
})
