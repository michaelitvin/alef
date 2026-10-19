import { afterEach, describe, expect, it, vi } from 'vitest'
const { mute } = vi.hoisted(() => ({ mute: vi.fn() }))
vi.mock('howler', async (orig) => {
  const m = await orig<typeof import('howler')>()
  return { ...m, Howler: Object.assign(m.Howler, { mute }) }
})
import { holdAudio, playSfx, say, sayParts, setHidden, setVoicePlayer, stopVoice } from './duel2Audio'

describe('duel2Audio', () => {
  afterEach(() => {
    stopVoice()
    setVoicePlayer(null)
    vi.useRealTimers()
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
