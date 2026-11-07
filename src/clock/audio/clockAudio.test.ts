import { afterEach, describe, expect, it, vi } from 'vitest'
const { mute } = vi.hoisted(() => ({ mute: vi.fn() }))
vi.mock('howler', async (orig) => {
  const m = await orig<typeof import('howler')>()
  return { ...m, Howler: Object.assign(m.Howler, { mute }) }
})
import type { ClockSfx } from '../logic/workday'
import { clockVoiceId, holdClockAudio, playSfx, playVoice, setClockHidden, setClockVoiceExists } from './clockAudio'
import { clearGender, setGender } from '../../shared/player'
import { clockTelemetry } from '../telemetry'

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
  it('a girl hears the feminine Hebrew take of a line or customer request that speaks to her; else it falls back', () => {
    const track = vi.spyOn(clockTelemetry, 'track')
    setClockVoiceExists((id) => ['welcome-he-f', 'cust-bear-hello-2-f'].includes(id) || !id.endsWith('-f'))
    setGender('girl', 'child')
    expect(clockVoiceId('welcome-he')).toBe('welcome-he-f')
    expect(clockVoiceId('cust-bear-hello-2')).toBe('cust-bear-hello-2-f')
    expect(clockVoiceId('welcome-en')).toBe('welcome-en')
    expect(clockVoiceId('cust-owl-hello-2')).toBe('cust-owl-hello-2') // English customers address both alike
    expect(clockVoiceId('ph-he-3-00')).toBe('ph-he-3-00')
    expect(clockVoiceId('day-end-he')).toBe('day-end-he')
    expect(track).toHaveBeenCalledWith('voice-fallback', { id: 'day-end-he' })
    setGender('boy', 'parent')
    expect(clockVoiceId('welcome-he')).toBe('welcome-he')
    clearGender()
    setClockVoiceExists(null)
    track.mockRestore()
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
