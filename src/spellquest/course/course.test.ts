import { describe, expect, it } from 'vitest'
import { courseIdFor } from './index'
import { HEBREW } from './hebrew'
import { cycleOf } from '../logic/run'
import { screensOfStage } from '../logic/stages'
import { spellQuestTelemetry } from '../telemetry'
import { SPELLQUEST_LOG } from '../telemetryLog'

describe('the course', () => {
  it('the English page plays English only where it is available', () => {
    expect(courseIdFor('en', true)).toBe('en')
    expect(courseIdFor('en', false)).toBe('he')
    expect(courseIdFor('he', true)).toBe('he')
  })
  it("the Hebrew course is today's modules", () => {
    expect(HEBREW.stages.screensOfStage).toBe(screensOfStage)
    expect(HEBREW.stages.order).toEqual(['tower', 'broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'spell', 'draw', 'draw-hand'])
    for (const st of [1, 2, 3, 4] as const) expect(HEBREW.stages.order.filter((s) => cycleOf(st, true).includes(s))).toEqual(cycleOf(st, true))
    expect(HEBREW.telemetry).toBe(spellQuestTelemetry)
    expect(HEBREW.log).toBe(SPELLQUEST_LOG)
    expect(HEBREW.dir).toBe('rtl')
  })
})
