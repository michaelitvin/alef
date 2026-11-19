import { describe, expect, it } from 'vitest'
import { scheduleBlend } from './blendSchedule'

describe('scheduleBlend', () => {
  it('stretches an even split to the clip\'s real length; a timed plan keeps its times; an unknown length keeps the plan\'s', () => {
    const even = { lights: [{ unit: 0, atMs: 0 }, { unit: 1, atMs: 350 }], totalMs: 700, stretch: true as const }
    expect(scheduleBlend(even, 1400)).toEqual({ lights: [{ unit: 0, atMs: 0 }, { unit: 1, atMs: 700 }], totalMs: 1400 })
    expect(scheduleBlend(even, null)).toEqual({ lights: even.lights, totalMs: 700 })
    const timed = { lights: [{ unit: 0, atMs: 20 }], totalMs: 500 }
    expect(scheduleBlend(timed, 9000)).toEqual({ lights: [{ unit: 0, atMs: 20 }], totalMs: 500 })
  })
})
