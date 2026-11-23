// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { instantSleeper, realSleeper } from './sleeper'

describe('realSleeper', () => {
  afterEach(() => { vi.useRealTimers() })

  it('runs on the window timers, so fake timers drive it', async () => {
    vi.useFakeTimers()
    const log: string[] = []
    void realSleeper.sleep(100).then(() => log.push('sleep'))
    realSleeper.after(50, () => log.push('after'))
    const cancelled = realSleeper.after(60, () => log.push('cancelled'))
    cancelled()
    await vi.advanceTimersByTimeAsync(99)
    expect(log).toEqual(['after'])
    await vi.advanceTimersByTimeAsync(1)
    expect(log).toEqual(['after', 'sleep'])
  })

  it('every repeats until cancelled', async () => {
    vi.useFakeTimers()
    let n = 0
    const stop = realSleeper.every(50, () => { n++ })
    await vi.advanceTimersByTimeAsync(160)
    expect(n).toBe(3)
    stop()
    await vi.advanceTimersByTimeAsync(500)
    expect(n).toBe(3)
  })

  it('frame runs before the next paint and can be cancelled', async () => {
    vi.useFakeTimers()
    const log: string[] = []
    realSleeper.frame(() => log.push('a'))
    realSleeper.frame(() => log.push('b'))()
    await vi.advanceTimersByTimeAsync(50)
    expect(log).toEqual(['a'])
  })
})

describe('instantSleeper', () => {
  it('a sleep resolves at once and the clock moves by the time asked', async () => {
    const s = instantSleeper()
    const t0 = Date.now()
    await s.sleep(60_000)
    expect(s.now()).toBe(60_000)
    await s.sleep(500)
    expect(s.now()).toBe(60_500)
    expect(Date.now() - t0).toBeLessThan(1000)
  })

  it('starts at the given time', () => {
    expect(instantSleeper(1234).now()).toBe(1234)
  })

  it('callbacks run in time order, not in the order they were asked', async () => {
    const s = instantSleeper()
    const log: string[] = []
    await Promise.all([
      s.sleep(1800).then(() => log.push(`defeat@${s.now()}`)),
      s.sleep(400).then(() => log.push(`ring@${s.now()}`)),
      new Promise<void>((r) => { s.after(1000, () => { log.push(`after@${s.now()}`); r() }) }),
    ])
    expect(log).toEqual(['ring@400', 'after@1000', 'defeat@1800'])
  })

  it('a wait asked by code that a callback woke up comes before a later callback', async () => {
    const s = instantSleeper()
    const log: string[] = []
    const late = s.sleep(105).then(() => log.push('late'))
    await s.sleep(100)
    await s.sleep(2)
    log.push(`chain@${s.now()}`)
    await late
    expect(log).toEqual(['chain@102', 'late'])
  })

  it('a cancelled callback never runs', async () => {
    const s = instantSleeper()
    const log: string[] = []
    s.after(10, () => log.push('no'))()
    s.frame(() => log.push('frame'))
    await s.sleep(100)
    expect(log).toEqual(['frame'])
  })

  it('every repeats on the virtual clock until cancelled', async () => {
    const s = instantSleeper()
    const at: number[] = []
    const stop = s.every(50, () => { at.push(s.now()); if (at.length === 4) stop() })
    await s.sleep(1000)
    expect(at).toEqual([50, 100, 150, 200])
  })
})
