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
  it('never overflows, and never cuts the stored history: past the cap the NEW events are dropped', async () => {
    const pad = 'x'.repeat(2000)
    const history = Array.from({ length: 300 }, (_, i) => ({ t: i, s: 'old', run: 1, e: 'round', i, pad }))
    const literal = JSON.stringify({ v: 1, events: history })
    localStorage.setItem(KEY, literal)
    const t = await import('./telemetry')
    for (let i = 0; i < 1200; i++) t.track('round', { i: 1000 + i, pad })
    t.flushTelemetry()
    const raw = localStorage.getItem(KEY)!
    expect(raw.length).toBeLessThanOrEqual(t.TELEMETRY_MAX_CHARS)
    const evs = stored().events
    expect(evs.slice(0, 300)).toEqual(history) // every old event, unchanged and first
    const is = evs.map((e) => e.i as number)
    expect(is[300]).toBe(1000) // then the new ones, in order, until the cap
    expect(is[is.length - 1]).toBeLessThan(2199)
  })
  it('a log already at its cap is left exactly as it is', async () => {
    const pad = 'y'.repeat(5000)
    const literal = JSON.stringify({ v: 1, events: Array.from({ length: 199 }, (_, i) => ({ t: i, s: 'old', run: 1, e: 'round', pad })) })
    localStorage.setItem(KEY, literal)
    const t = await import('./telemetry')
    for (let i = 0; i < 10; i++) t.track('round', { pad })
    t.flushTelemetry()
    expect(localStorage.getItem(KEY)).toBe(literal)
  })
  it('an unreadable stored log is never overwritten', async () => {
    localStorage.setItem(KEY, '{"v":1,"events":[{"t":1')
    const t = await import('./telemetry')
    t.track('round', {})
    t.flushTelemetry()
    expect(localStorage.getItem(KEY)).toBe('{"v":1,"events":[{"t":1')
  })
  it('a full browser storage never breaks the game and never cuts the history: it drops the new events quietly', async () => {
    const old = [{ t: 1, s: 'old', run: 1, e: 'run_start' }, { t: 2, s: 'old', run: 1, e: 'round', key: 'segol' }]
    localStorage.setItem(KEY, JSON.stringify({ v: 1, events: old }))
    const t = await import('./telemetry')
    for (let i = 0; i < 100; i++) t.track('round', { i })
    const real = Storage.prototype.setItem
    let fails = 1
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (fails-- > 0) throw new DOMException('full', 'QuotaExceededError')
      return real.call(this, k, v)
    })
    expect(() => t.flushTelemetry()).not.toThrow()
    expect(stored().events).toEqual(old)
    t.track('round', { i: 'next' })
    t.flushTelemetry()
    expect(stored().events.slice(0, 2)).toEqual(old)
    expect(stored().events.map((e) => e.i)).toEqual([undefined, undefined, 'next'])
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    t.track('round', {})
    expect(() => t.flushTelemetry()).not.toThrow()
    expect(stored().events).toHaveLength(3)
  })
  it('new events say their game; old ones are read unchanged', async () => {
    const old = { t: 1, s: 'old', run: 1, e: 'choice', key: 'segol', pos: 2 }
    localStorage.setItem(KEY, JSON.stringify({ v: 1, events: [old] }))
    const t = await import('./telemetry')
    t.track('choice', { key: 'kamatz' })
    const evs = JSON.parse(t.exportTelemetry()).events
    expect(evs[0]).toEqual(old)
    expect(evs[1]).toMatchObject({ e: 'choice', g: 'duel', key: 'kamatz' })
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
