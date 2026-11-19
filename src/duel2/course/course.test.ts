import { describe, expect, it } from 'vitest'
import { courseIdFromUrl } from './index'
import { HEBREW } from './hebrew'
import { cycleOf } from '../logic/run'
import { screensOfStage } from '../logic/stages'
import { duel2Telemetry } from '../telemetry'
import { BOOK2_LOG } from '../telemetryLog'

describe('the course', () => {
  it('?course=en picks English only where it is available', () => {
    expect(courseIdFromUrl('?course=en', true)).toBe('en')
    expect(courseIdFromUrl('?course=en', false)).toBe('he')
    expect(courseIdFromUrl('?station=broom', true)).toBe('he')
    expect(courseIdFromUrl('', true)).toBe('he')
  })
  it("the Hebrew course is today's modules", () => {
    expect(HEBREW.stages.screensOfStage).toBe(screensOfStage)
    expect(HEBREW.stages.order).toEqual(['tower', 'broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'spell', 'draw', 'draw-hand'])
    for (const st of [1, 2, 3, 4] as const) expect(HEBREW.stages.order.filter((s) => cycleOf(st, true).includes(s))).toEqual(cycleOf(st, true))
    expect(HEBREW.telemetry).toBe(duel2Telemetry)
    expect(HEBREW.log).toBe(BOOK2_LOG)
    expect(HEBREW.dir).toBe('rtl')
  })
})
