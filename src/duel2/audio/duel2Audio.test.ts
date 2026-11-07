import { afterEach, describe, expect, it, vi } from 'vitest'
const { mute } = vi.hoisted(() => ({ mute: vi.fn() }))
vi.mock('howler', async (orig) => {
  const m = await orig<typeof import('howler')>()
  return { ...m, Howler: Object.assign(m.Howler, { mute }) }
})
import { holdAudio, playSfx, say, sayParts, setHidden, setVoiceExists, setVoicePlayer, stopVoice, voiceIdle } from './duel2Audio'
import { clearGender, setGender } from '../../shared/player'
import { duel2Telemetry } from '../telemetry'

describe('duel2Audio', () => {
  afterEach(() => {
    stopVoice()
    setVoicePlayer(null)
    setVoiceExists(null)
    clearGender()
    vi.useRealTimers()
  })
  it('sayParts tells whether every part really played (a missing file or a stop is not played)', async () => {
    vi.useFakeTimers()
    let r: boolean | undefined
    void sayParts([{ id: 'nope-1' }]).then((x) => { r = x })
    await vi.advanceTimersByTimeAsync(50)
    expect(r).toBe(false)
    setVoicePlayer(() => new Promise((res) => setTimeout(() => res(true), 100)))
    void sayParts([{ id: 'a' }]).then((x) => { r = x })
    expect(voiceIdle()).toBe(false)
    await vi.advanceTimersByTimeAsync(150)
    expect(r).toBe(true)
    expect(voiceIdle()).toBe(true)
    r = undefined
    void sayParts([{ id: 'a' }, { id: 'b' }]).then((x) => { r = x })
    await vi.advanceTimersByTimeAsync(50)
    stopVoice()
    await vi.advanceTimersByTimeAsync(2000)
    expect(r).toBe(false)
  })
  it('a girl hears the feminine take of a line that speaks to her; a missing one falls back and is logged', async () => {
    vi.useFakeTimers()
    const log: string[] = []
    setVoicePlayer((id) => { log.push(id); return Promise.resolve(true) })
    setVoiceExists((id) => id === 'q-door-1-f')
    const track = vi.spyOn(duel2Telemetry, 'track')
    setGender('girl', 'child')
    void say(['q-door-1', 'q-door-2', 'syl-b-a'], 0)
    await vi.advanceTimersByTimeAsync(50)
    expect(log).toEqual(['q-door-1-f', 'q-door-2', 'syl-b-a'])
    expect(track).toHaveBeenCalledWith('voice-fallback', { id: 'q-door-2' })
    void say(['q-door-2'], 0)
    await vi.advanceTimersByTimeAsync(50)
    expect(track.mock.calls.filter((c) => c[0] === 'voice-fallback')).toHaveLength(1) // logged once per id
    log.length = 0
    setGender('boy', 'parent')
    void say(['q-door-1'], 0)
    await vi.advanceTimersByTimeAsync(50)
    expect(log).toEqual(['q-door-1'])
    track.mockRestore()
  })
  it('say resolves for an unknown id', async () => {
    vi.useFakeTimers()
    let done = false
    void say(['nope-1']).then(() => { done = true })
    await vi.advanceTimersByTimeAsync(50)
    expect(done).toBe(true)
  })
  it('say plays in order with a gap and never overlaps', async () => {
    vi.useFakeTimers()
    const log: string[] = []
    setVoicePlayer((id) => {
      log.push(`start ${id}`)
      return new Promise((r) => setTimeout(() => { log.push(`end ${id}`); r() }, 300))
    })
    void say(['a', 'b'])
    await vi.advanceTimersByTimeAsync(300)
    expect(log).toEqual(['start a', 'end a'])
    await vi.advanceTimersByTimeAsync(799)
    expect(log).toEqual(['start a', 'end a'])
    await vi.advanceTimersByTimeAsync(1)
    expect(log).toEqual(['start a', 'end a', 'start b'])
  })
  it('a second say waits for the first', async () => {
    vi.useFakeTimers()
    const log: string[] = []
    setVoicePlayer((id) => { log.push(id); return new Promise((r) => setTimeout(r, 100)) })
    void say(['a'])
    void say(['b'])
    await vi.advanceTimersByTimeAsync(50)
    expect(log).toEqual(['a'])
    await vi.advanceTimersByTimeAsync(1000)
    expect(log).toEqual(['a', 'b'])
  })
  it('sayParts calls onStart as each part starts', async () => {
    vi.useFakeTimers()
    setVoicePlayer(() => new Promise((r) => setTimeout(r, 100)))
    const seen: string[] = []
    void sayParts([{ id: 'x', onStart: () => seen.push('x') }, { id: 'y', onStart: () => seen.push('y') }], 0)
    await vi.advanceTimersByTimeAsync(10)
    expect(seen).toEqual(['x'])
    await vi.advanceTimersByTimeAsync(200)
    expect(seen).toEqual(['x', 'y'])
  })
  it('stopVoice drops the rest of the queue', async () => {
    vi.useFakeTimers()
    const log: string[] = []
    setVoicePlayer((id) => { log.push(id); return new Promise((r) => setTimeout(r, 100)) })
    const p = say(['a', 'b', 'c'])
    await vi.advanceTimersByTimeAsync(10)
    stopVoice()
    await vi.advanceTimersByTimeAsync(5000)
    await p
    expect(log).toEqual(['a'])
  })
  it('test builds log every voice part in order', async () => {
    vi.useFakeTimers()
    const w = window as unknown as { __d2audio?: string[] }
    w.__d2audio = []
    setVoicePlayer(() => Promise.resolve())
    await say(['q-ghosts-1', 'syl-b-a'], 0)
    expect(w.__d2audio).toEqual(['q-ghosts-1', 'syl-b-a'])
  })
  it('playSfx resolves for a missing effect', async () => {
    await expect(playSfx('wave')).resolves.toBeUndefined()
  })
  it('hidden mutes everything until the pause cover lets go', () => {
    setHidden(true)
    expect(mute).toHaveBeenLastCalledWith(true)
    holdAudio(true)
    setHidden(false)
    expect(mute).toHaveBeenLastCalledWith(true)
    holdAudio(false)
    expect(mute).toHaveBeenLastCalledWith(false)
  })
})
