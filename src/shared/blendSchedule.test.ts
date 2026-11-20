import { describe, expect, it } from 'vitest'
import { BLEND_UNIT_GAP_MS, BLEND_WORD_GAP_MS, playUnitsThenWord, scheduleBlend } from './blendSchedule'

describe('scheduleBlend', () => {
  it('stretches an even split to the clip\'s real length; a timed plan keeps its times; an unknown length keeps the plan\'s', () => {
    const even = { lights: [{ unit: 0, atMs: 0 }, { unit: 1, atMs: 350 }], totalMs: 700, stretch: true as const }
    expect(scheduleBlend(even, 1400)).toEqual({ lights: [{ unit: 0, atMs: 0 }, { unit: 1, atMs: 700 }], totalMs: 1400 })
    expect(scheduleBlend(even, null)).toEqual({ lights: even.lights, totalMs: 700 })
    const timed = { lights: [{ unit: 0, atMs: 20 }], totalMs: 500 }
    expect(scheduleBlend(timed, 9000)).toEqual({ lights: [{ unit: 0, atMs: 20 }], totalMs: 500 })
  })
})

describe('playUnitsThenWord', () => {
  const run = async (missing: string[]) => {
    const log: string[] = []
    const d = {
      say: async (id: string, onHeard: () => void) => { log.push('say ' + id); if (!missing.includes(id)) onHeard() },
      sleep: async (ms: number) => { log.push('sleep ' + ms) },
      light: (u: number[]) => log.push('light ' + u.join(',')),
      alive: () => true,
    }
    const done = await playUnitsThenWord([{ audio: 'snd-s', units: [0] }, { audio: 'snd-ae', units: [1] }], 'w-sa', [0, 1], d)
    return { done, log }
  }

  it('says each unit and lights it as it plays, pauses, then says the word with all lit', async () => {
    const { done, log } = await run([])
    expect(done).toBe(true)
    expect(log).toEqual(['say snd-s', 'light 0', `sleep ${BLEND_UNIT_GAP_MS}`, 'say snd-ae', 'light 1', `sleep ${BLEND_WORD_GAP_MS}`, 'say w-sa', 'light 0,1'])
  })

  it('a missing unit clip ends it at once with false (the caller plays the fallback); nothing waits', async () => {
    const { done, log } = await run(['snd-ae'])
    expect(done).toBe(false)
    expect(log).not.toContain('say w-sa')
  })

  it('a missing word clip still lights all and ends on a length', async () => {
    const { done, log } = await run(['w-sa'])
    expect(done).toBe(true)
    expect(log.slice(-2)).toEqual(['light 0,1', 'sleep 700'])
  })
})
