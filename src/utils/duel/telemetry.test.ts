import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const KEY = 'alef-duel-telemetry'
const stored = () => JSON.parse(localStorage.getItem(KEY)!) as { v: number; events: Record<string, unknown>[] }

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetModules()
  localStorage.clear()
})
afterEach(() => vi.restoreAllMocks())

describe('duel telemetry', () => {
  it('stores events with wall time, session and run, written to localStorage shortly after', async () => {
    const t = await import('./telemetry')
    vi.setSystemTime(new Date('2026-10-06T20:00:00Z'))
    t.setTelemetryRun(3)
    t.track('choice', { round: 7, key: 'segol', pos: 2, ms: 1840 })
    expect(localStorage.getItem(KEY)).toBeNull() // batched, not one write per event
    await vi.advanceTimersByTimeAsync(1500)
    const ev = stored().events[0]
    expect(ev).toMatchObject({ e: 'choice', run: 3, round: 7, key: 'segol', pos: 2, ms: 1840, t: Date.parse('2026-10-06T20:00:00Z') })
    expect(typeof ev.s).toBe('string')
  })
  it('keeps earlier sessions: new events append to what is already stored', async () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, events: [{ t: 1, s: 'old', run: 1, e: 'run_start' }] }))
    const t = await import('./telemetry')
    t.track('run_start', {})
    t.flushTelemetry()
    expect(stored().events.map((e) => e.s)).toEqual(['old', expect.any(String)])
  })
  it('never overflows: past the cap the OLDEST events go, the newest stay', async () => {
    const t = await import('./telemetry')
    const pad = 'x'.repeat(2000)
    for (let i = 0; i < 1200; i++) t.track('round', { i, pad })
    t.flushTelemetry()
    const raw = localStorage.getItem(KEY)!
    expect(raw.length).toBeLessThanOrEqual(t.TELEMETRY_MAX_CHARS)
    const is = stored().events.map((e) => e.i as number)
    expect(is[is.length - 1]).toBe(1199)
    expect(is[0]).toBeGreaterThan(0)
  })
  it('a full browser storage never breaks the game: it drops old events and retries, else gives up quietly', async () => {
    const t = await import('./telemetry')
    for (let i = 0; i < 100; i++) t.track('round', { i })
    const real = Storage.prototype.setItem
    let fails = 1
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (fails-- > 0) throw new DOMException('full', 'QuotaExceededError')
      return real.call(this, k, v)
    })
    expect(() => t.flushTelemetry()).not.toThrow()
    const n = stored().events.length
    expect(n).toBeGreaterThan(0)
    expect(n).toBeLessThan(100)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    t.track('round', {})
    expect(() => t.flushTelemetry()).not.toThrow()
  })
  it('exports everything as one JSON document (flushing first) and can clear', async () => {
    const t = await import('./telemetry')
    t.track('run_end', { score: 10 })
    const doc = JSON.parse(t.exportTelemetry())
    expect(doc).toMatchObject({ v: 1, events: [expect.objectContaining({ e: 'run_end', score: 10 })] })
    expect(typeof doc.exportedAt).toBe('string')
    expect(t.telemetryCount()).toBe(1)
    t.clearTelemetry()
    expect(t.telemetryCount()).toBe(0)
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})
