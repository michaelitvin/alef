// An evicted chunk is counted once: never again as raw events, never folded twice. A chunk goes only when the stored open
// chunk no longer holds its events, and it leaves a tombstone that drops any copy a stale view brings back.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTelemetry, freeTelemetrySpace, readLog, registerTelemetryLogs, registeredLogs, type TelemetryEvent, type TelemetryLog } from './telemetry'
import { chunkKey, chunkKeysOf, logStats, openJson, parseOpen } from './telemetryChunks'
import { encodeChunk } from './telemetryCodec'
import { enforceBudget } from './telemetryBudget'
import { readRollup } from './telemetryRollup'
import { safeSetItem } from './saveStorage'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 10, 20, 12)
const real = window.localStorage
const use = (s: Storage) => Object.defineProperty(window, 'localStorage', { value: s, configurable: true })
beforeEach(() => { real.clear(); vi.useFakeTimers({ now: NOW }) })
afterEach(() => { use(real); vi.useRealTimers(); vi.restoreAllMocks() })

let seq = 0
const log = (): TelemetryLog => {
  const name = `ev${seq++}`
  return {
    key: `alef-${name}-telemetry`, label: name, game: name, about: { game: name, docs: [] },
    rollup: (evs) => evs.filter((e) => e.e === 'answer').map((e) => ({ item: 'x', ok: true, t: e.t })),
  }
}
const noise = (n: number) => Array.from({ length: n }, () => Math.random().toString(36).slice(2, 6)).join('')
/** a session of 150 answers, 40 days old (past the raw floor), about 60k characters of JSON */
const stale = (s = 'old-x') => Array.from({ length: 150 }, (_, i): TelemetryEvent => ({ t: NOW - 40 * DAY + i * 1000, s, run: 1, e: 'answer', g: 'a', i, pad: noise(60) }))
/** a young chunk of another log that fills the budget on its own (the floor keeps it) */
function filler() {
  const f = log()
  registerTelemetryLogs([f])
  const evs = Array.from({ length: 3000 }, (_, i): TelemetryEvent => ({ t: NOW - DAY + i, s: 'fill', run: 1, e: 'answer', g: f.game, pad: noise(80) }))
  real.setItem(chunkKey(f.key, evs[0]!.t, 'fill'), encodeChunk(evs))
}
/** session `s`'s answers: raw (in the merged log) and in the roll-up */
function counts(key: string, s = 'old-x') {
  const raw = readLog(key).filter((e) => e.s === s).length
  const rolled = Object.values(readRollup(key).days).reduce((m, d) => m + (d.items.x?.n ?? 0), 0)
  return { raw, rolled, stats: logStats(key).events }
}
const idle = async (slots = 40) => { for (let i = 0; i < slots; i++) await vi.advanceTimersByTimeAsync(2100) }

describe('an evicted chunk is counted once', () => {
  it('a failed open-chunk rewrite after a seal: the budget does not evict the chunk while the open chunk holds it', async () => {
    const L = log()
    registerTelemetryLogs([L])
    filler()
    real.setItem(L.key, openJson(stale(), []))
    let fail = true
    use({
      get length() { return real.length }, key: (i) => real.key(i), getItem: (k) => real.getItem(k),
      setItem: (k, v) => { if (fail && k === L.key) throw new DOMException('full', 'QuotaExceededError'); real.setItem(k, v) },
      removeItem: (k) => real.removeItem(k), clear: () => real.clear(),
    })
    const t = createTelemetry(L.key, { game: L.game })
    t.track('x')
    await idle()
    expect(counts(L.key)).toMatchObject({ raw: 150 })
    expect(counts(L.key).raw + counts(L.key).rolled).toBe(150)
    fail = false
    t.flush() // the rewrite now succeeds: the open chunk lists the chunk and no longer holds its events
    enforceBudget(registeredLogs(), { staging: false }) // the next seal's budget pass
    t.track('x')
    await idle()
    t.flush()
    const c = counts(L.key)
    expect(c.raw + c.rolled).toBe(150)
    expect(c.rolled).toBe(150) // evicted once the open chunk no longer held it, folded once
    expect(parseOpen(real.getItem(L.key))!.events.filter((e) => e.s === 'old-x')).toEqual([])
  })

  it('a second tab that flushes an older view after the eviction brings nothing back, and nothing is folded twice', async () => {
    const L = log()
    registerTelemetryLogs([L])
    filler()
    real.setItem(L.key, openJson(stale(), []))
    // a second tab loaded this view; it flushes it back later (its seal pass has not run: a hidden tab, say)
    const older = real.getItem(L.key)!
    const a = createTelemetry(L.key, { game: L.game })
    a.track('x')
    await idle()
    expect(chunkKeysOf(L.key)).toEqual([]) // sealed, then evicted (past the floor, over the budget)
    expect(counts(L.key)).toMatchObject({ raw: 0, rolled: 150 })
    real.setItem(L.key, older) // the other tab's flush: old-x is in the stored open chunk again, its chunk is gone
    expect(counts(L.key)).toMatchObject({ raw: 0, rolled: 150 })
    expect(counts(L.key).stats).toBe(readLog(L.key).length)
    // a page that loads that view seals it again: nothing is sealed or folded a second time
    const b = createTelemetry(L.key, { game: L.game })
    b.track('x')
    await idle()
    b.flush()
    expect(counts(L.key)).toMatchObject({ raw: 0, rolled: 150 })
    expect(chunkKeysOf(L.key)).toEqual([])
    expect(parseOpen(real.getItem(L.key))!.events.filter((e) => e.s === 'old-x')).toEqual([])
  })

  it('a save under pressure (freeChunks) never evicts a chunk the open chunk still holds, and loses nothing', () => {
    const L = log()
    registerTelemetryLogs([L])
    const evs = stale()
    // a seal cut between its two writes: the chunk is written, the open chunk still holds its events and lacks its key
    real.setItem(L.key, openJson(evs, []))
    const k = chunkKey(L.key, evs[0]!.t, 'old-x')
    real.setItem(k, encodeChunk(evs))
    expect(counts(L.key).raw).toBe(150)
    real.setItem('alef-save', '{"save":1}')
    const used = Object.keys(real).reduce((n, x) => n + x.length + real.getItem(x)!.length, 0)
    const limit = used + 1000
    use({
      get length() { return real.length }, key: (i) => real.key(i), getItem: (x) => real.getItem(x),
      setItem: (x, v) => {
        let n = 0
        for (let i = 0; i < real.length; i++) { const y = real.key(i)!; if (y !== x) n += y.length + real.getItem(y)!.length }
        if (n + x.length + v.length > limit) throw new DOMException('full', 'QuotaExceededError')
        real.setItem(x, v)
      },
      removeItem: (x) => real.removeItem(x), clear: () => real.clear(),
    })
    expect(safeSetItem('alef-save', 'S'.repeat(5000))).toBe(true)
    const c = counts(L.key)
    expect(c.raw + c.rolled).toBe(150)
    expect(freeTelemetrySpace(1)).toBeGreaterThanOrEqual(0)
    const d = counts(L.key)
    expect(d.raw + d.rolled).toBe(150)
  })
})
