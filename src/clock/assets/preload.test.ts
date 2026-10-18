import { describe, expect, it, vi } from 'vitest'
import { READY_MS, preloadClockAssets } from './preload'

describe('preloadClockAssets', () => {
  it('never blocks the game for long: resolves by READY_MS even when nothing loads (jsdom loads no images)', async () => {
    vi.useFakeTimers()
    const p = preloadClockAssets()
    let done = false
    void p.then(() => { done = true })
    await vi.advanceTimersByTimeAsync(READY_MS - 100)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(200)
    expect(done).toBe(true)
    expect(preloadClockAssets()).toBe(p) // loads once
    vi.useRealTimers()
  })
})
