import { afterEach, describe, expect, it, vi } from 'vitest'
const { mute } = vi.hoisted(() => ({ mute: vi.fn() }))
vi.mock('howler', async (orig) => {
  const m = await orig<typeof import('howler')>()
  return { ...m, Howler: Object.assign(m.Howler, { mute }) }
})
import type { ClockSfx } from '../logic/workday'
import { holdClockAudio, playSfx, playVoice, setClockHidden } from './clockAudio'

describe('clockAudio', () => {
  afterEach(() => {
    vi.useRealTimers()
  })
  it('playVoice resolves for an unknown id and reports every word', async () => {
    vi.useFakeTimers()
    const words: number[] = []
    const p = playVoice('ph-he-99-99', ['a', 'b', 'c'], (i) => words.push(i))
    await vi.runAllTimersAsync()
    await p
    expect(words).toEqual([0, 1, 2])
  })
  it('playSfx resolves for a missing effect', async () => {
    await expect(playSfx('nonexistent' as ClockSfx)).resolves.toBeUndefined()
  })
  it('a hidden page mutes all clock audio; the pause cover keeps it muted until play', () => {
    setClockHidden(true)
    expect(mute).toHaveBeenLastCalledWith(true)
    holdClockAudio(true) // the workshop shows its pause cover
    setClockHidden(false)
    expect(mute).toHaveBeenLastCalledWith(true)
    holdClockAudio(false) // he taps play
    expect(mute).toHaveBeenLastCalledWith(false)
    setClockHidden(true)
    setClockHidden(false) // a screen with no pause cover (door, summary): the sound comes back
    expect(mute).toHaveBeenLastCalledWith(false)
  })
})
