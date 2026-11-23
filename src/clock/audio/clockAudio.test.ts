// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ClockSfx } from '../logic/workday'
import { clockVoiceId, playSfx, playVoice } from './clockAudio'
import { installFakeAudio } from '../../shared/gameAudio/fakePlayer'
import { clearGender, setGender } from '../../shared/player'
import { clockTelemetry } from '../telemetry'

const audio = installFakeAudio()

describe('clockAudio', () => {
  afterEach(() => {
    vi.useRealTimers()
  })
  it('playVoice resolves for an unknown id and reports every word', async () => {
    vi.useFakeTimers()
    audio.missing = () => true
    const words: number[] = []
    const p = playVoice('ph-he-99-99', ['a', 'b', 'c'], (i) => words.push(i))
    await vi.runAllTimersAsync()
    await p
    expect(words).toEqual([0, 1, 2])
    expect(audio.said()).toEqual([])
  })
  it('a girl hears the feminine Hebrew take of a line or customer request that speaks to her; else it falls back', () => {
    const track = vi.spyOn(clockTelemetry, 'track')
    audio.exists = (id) => ['welcome-he-f', 'cust-bear-hello-2-f'].includes(id) || !id.endsWith('-f')
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
    track.mockRestore()
  })
  it('playVoice plays the file chosen for the child, with its caption', async () => {
    setGender('girl', 'child')
    await playVoice('welcome-he', ['x'])
    expect(audio.said()).toEqual(['welcome-he-f'])
    expect(audio.log()[0].caption).toEqual(['x'])
    clearGender()
  })
  it('playSfx resolves for a missing effect', async () => {
    await expect(playSfx('nonexistent' as ClockSfx)).resolves.toBeUndefined()
  })
})
