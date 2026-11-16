import { afterEach, describe, expect, it, vi } from 'vitest'
import { READY_MS, createPreloader } from './preload'

describe('createPreloader', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
  it('loads once; resolves by READY_MS when nothing loads; then the effects start and the lines warm, but not the skipped ones', async () => {
    vi.useFakeTimers()
    const fetched: string[] = []
    vi.stubGlobal('fetch', (url: string) => { fetched.push(url); return Promise.resolve({ blob: () => Promise.resolve(null) }) })
    const sfx = vi.fn()
    const preload = createPreloader({ fonts: [], images: { a: 'a.webp' }, voices: { 'q-1': 'q1.mp3', 'ph-1': 'ph1.mp3', 'q-2': 'q2.mp3' }, skipVoice: (id) => id.startsWith('ph-'), sfx })
    const p = preload()
    expect(preload()).toBe(p)
    let done = false
    void p.then(() => { done = true })
    await vi.advanceTimersByTimeAsync(READY_MS - 100)
    expect(done).toBe(false)
    expect(sfx).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(200)
    expect(done).toBe(true)
    expect(sfx).toHaveBeenCalledTimes(1)
    expect(fetched.sort()).toEqual(['q1.mp3', 'q2.mp3'])
  })
})
