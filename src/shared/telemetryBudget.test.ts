// One shared budget: past it the oldest sealed chunk of any log goes, folded first; the frozen log never.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { encodeChunk } from './telemetryCodec'
import { chunkKey, chunkKeysOf, openJson, readLog, rollupKey } from './telemetryChunks'
import { LIVE_BUDGET, enforceBudget, evictChunk, frozenLogSizes, liveBudget, liveChars } from './telemetryBudget'
import { readRollup } from './telemetryRollup'
import {
  OPEN_HARD_CAP, createTelemetry, freeTelemetrySpace, registerTelemetryLogs, removeStagingFrozenCopy, resetFrozenCopyForTest, type TelemetryEvent,
  type TelemetryLog,
} from './telemetry'
import { safeSetItem } from './saveStorage'
import { STAGING_PREFIX, prefixedStorage } from './stagingStorage'
import { FROZEN_HISTORY } from './__fixtures__/telemetry/generate'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 10, 20, 12)
const real = window.localStorage
beforeEach(() => { real.clear(); vi.useFakeTimers({ now: NOW }) })
afterEach(() => {
  Object.defineProperty(window, 'localStorage', { value: real, configurable: true })
  vi.useRealTimers()
})

const game = (name: string): TelemetryLog => ({
  key: `alef-${name}-telemetry`, label: name, game: name, about: { game: name, docs: [] },
  rollup: (evs) => evs.filter((e) => e.e === 'answer').map((e) => ({ item: String(e.target), ok: e.ok === true, t: e.t })),
})
let seq = 0
/** a sealed chunk of `log`, `daysAgo` old, of about `chars` characters (random padding, so it does not compress away) */
function chunk(log: TelemetryLog, daysAgo: number, chars = 20_000): string {
  const t0 = NOW - daysAgo * DAY + seq++
  const s = `s${seq}`
  const make = (n: number) => Array.from({ length: n }, (_, i): TelemetryEvent => ({
    t: t0 + i * 1000, s, run: 1, e: 'answer', g: log.game, target: `x${i % 7}`, ok: i % 3 > 0,
    pad: Array.from({ length: 40 }, () => Math.random().toString(36).slice(2, 4)).join(''),
  }))
  const per = encodeChunk(make(50)).length / 50
  const evs = make(Math.max(1, Math.round(chars / per)))
  const k = chunkKey(log.key, t0, s)
  localStorage.setItem(k, encodeChunk(evs))
  return k
}

describe('one shared budget', () => {
  it('the budget is the same with 2 and with 6 games, and eviction takes the oldest chunk across games', () => {
    for (const n of [2, 6]) {
      real.clear()
      const logs = Array.from({ length: n }, (_, i) => game(`g${n}x${i}`))
      const keys = logs.flatMap((l, i) => [60, 50, 40].map((d) => chunk(l, d - i)))
      enforceBudget(logs, { staging: false })
      expect(liveChars()).toBeLessThanOrEqual(LIVE_BUDGET)
      const used = keys.reduce((m, k) => m + k.length + (real.getItem(k)?.length ?? 0), 0)
      expect(used).toBeGreaterThan(0)
    }
    real.clear()
    const [a, b] = [game('a'), game('b')]
    const old = chunk(a, 70, 300_000)
    const mid = chunk(b, 65, 300_000)
    const young = chunk(a, 50, 300_000)
    enforceBudget([a, b], { staging: false })
    expect(real.getItem(old)).toBeNull()
    expect(real.getItem(mid)).not.toBeNull()
    expect(real.getItem(young)).not.toBeNull()
    expect(readRollup(a.key).folded.map((t) => t.k)).toEqual([old])
  })

  it('production keeps every chunk of the last 30 days, even past the budget; staging may evict them', () => {
    const a = game('a')
    const keys = [1, 2, 3, 4].map((d) => chunk(a, d, 300_000))
    enforceBudget([a], { staging: false })
    expect(keys.every((k) => real.getItem(k) !== null)).toBe(true)
    enforceBudget([a], { staging: true })
    expect(liveChars()).toBeLessThanOrEqual(liveBudget(true))
  })

  it('a light game keeps its recent chunks when a heavy game seals', () => {
    const light = game('light')
    const heavy = game('heavy')
    const mine = chunk(light, 10, 10_000)
    const heavies = Array.from({ length: 12 }, (_, i) => chunk(heavy, 80 - i, 90_000))
    enforceBudget([light, heavy], { staging: false })
    expect(real.getItem(mine)).not.toBeNull()
    expect(heavies.filter((k) => real.getItem(k) === null).length).toBeGreaterThan(0)
  })

  it('no eviction removes a chunk of a registered log without its fold; a fault between the two folds once', () => {
    const a = game('a')
    const k = chunk(a, 90, 50_000)
    const evs = readLog(a.key)
    const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => { throw new Error('cut') })
    expect(evictChunk(k, [a])).toBe(0)
    remove.mockRestore()
    expect(real.getItem(k)).not.toBeNull()
    expect(readRollup(a.key).folded.map((t) => t.k)).toEqual([k])
    const once = real.getItem(rollupKey(a.key))
    expect(evictChunk(k, [a])).toBeGreaterThan(0)
    expect(real.getItem(k)).toBeNull()
    const r = readRollup(a.key)
    expect(r.folded.map((t) => t.k)).toEqual([k]) // its tombstone stays (TOMB_KEEP_MS)
    expect(JSON.stringify(r.days)).toBe(JSON.stringify(JSON.parse(once!).days))
    const n = Object.values(r.days).reduce((m, d) => m + Object.values(d.items).reduce((x, i) => x + i.n, 0), 0)
    expect(n).toBe(evs.length)
  })

  it('an unreadable chunk is never evicted', () => {
    const a = game('a')
    const bad = chunkKey(a.key, NOW - 100 * DAY, 'z')
    real.setItem(bad, '{"v":3,"s":"z","t0":1,"t1":2,"n":1,"enc":"cz1","d":"' + 'x'.repeat(900_000) + '"}')
    enforceBudget([a], { staging: false })
    expect(real.getItem(bad)).not.toBeNull()
  })

  it('the production build\'s budget ignores staging\'s keys, and staging\'s own budget sees only its own', () => {
    const a = game('a')
    real.setItem(STAGING_PREFIX + chunkKey(a.key, NOW - 90 * DAY, 'st'), 'y'.repeat(900_000))
    const mine = chunk(a, 90, 20_000)
    expect(liveChars()).toBeLessThan(LIVE_BUDGET)
    enforceBudget([a], { staging: false })
    expect(real.getItem(mine)).not.toBeNull()
  })

  it('the frozen log is never counted, evicted or rewritten, and is byte-equal after all of it', () => {
    const a = game('a')
    real.setItem('alef-duel-telemetry', FROZEN_HISTORY)
    for (let i = 0; i < 6; i++) chunk(a, 90 - i, 200_000)
    enforceBudget([a], { staging: false })
    freeTelemetrySpace(10_000_000)
    expect(real.getItem('alef-duel-telemetry')).toBe(FROZEN_HISTORY)
    expect(frozenLogSizes()).toEqual({ 'alef-duel-telemetry': 'alef-duel-telemetry'.length + FROZEN_HISTORY.length })
    expect(liveChars()).toBe(0)
  })
})

describe('a save under pressure', () => {
  /** a storage that holds at most `limit` characters, keys and values, as WebKit counts them */
  function full(limit: number): Storage {
    const s: Storage = {
      get length() { return real.length },
      key: (i) => real.key(i),
      getItem: (k) => real.getItem(k),
      setItem: (k, v) => {
        let used = 0
        for (let i = 0; i < real.length; i++) { const x = real.key(i)!; if (x !== k) used += x.length + real.getItem(x)!.length }
        if (used + k.length + v.length > limit) throw new DOMException('full', 'QuotaExceededError')
        real.setItem(k, v)
      },
      removeItem: (k) => real.removeItem(k),
      clear: () => real.clear(),
    }
    return s
  }

  it('evicts telemetry (staging\'s chunks first, folded, recent ones too) and the save succeeds', () => {
    const a = game('a')
    const staging = STAGING_PREFIX + chunkKey(a.key, NOW - DAY, 'st')
    real.setItem(staging, encodeChunk([{ t: NOW - DAY, s: 'st', run: 1, e: 'answer', target: 'q', ok: true, g: 'a' }]))
    const recent = chunk(a, 2, 100_000)
    real.setItem('alef-duel-telemetry', FROZEN_HISTORY)
    real.setItem('alef-a', '{"save":1}')
    const used = Object.keys(real).reduce((n, k) => n + k.length + real.getItem(k)!.length, 0)
    Object.defineProperty(window, 'localStorage', { value: full(used + 1000), configurable: true })
    registerTelemetryLogs([a])
    expect(safeSetItem('alef-a', 'S'.repeat(50_000))).toBe(true)
    expect(real.getItem('alef-a')).toHaveLength(50_000)
    expect(real.getItem(staging)).toBeNull()
    expect(real.getItem(recent)).toBeNull()
    expect(readRollup(a.key).days).not.toEqual({})
    expect(real.getItem('alef-duel-telemetry')).toBe(FROZEN_HISTORY)
  })
})

describe('the open chunk\'s hard cap and staging\'s frozen copy', () => {
  it('a page that never idles seals its own session at a flush past the hard cap, instead of dropping events', () => {
    const t = createTelemetry('alef-busy-telemetry', { game: 'busy' })
    window.dispatchEvent(new Event('pointerdown'))
    for (let i = 0; i < 700; i++) t.track('answer', { i, pad: 'p'.repeat(300) })
    expect(openJson(t.events(), []).length).toBeGreaterThan(OPEN_HARD_CAP)
    t.flush()
    expect(chunkKeysOf('alef-busy-telemetry').length).toBeGreaterThan(0)
    expect(real.getItem('alef-busy-telemetry')!.length).toBeLessThan(OPEN_HARD_CAP)
    expect(t.events().map((e) => e.i)).toEqual(Array.from({ length: 700 }, (_, i) => i))
    t.clear()
  })

  it('the staging build deletes its own copy of the frozen log once, and its log says so; production never', () => {
    real.setItem('alef-duel-telemetry', FROZEN_HISTORY)
    real.setItem(STAGING_PREFIX + 'alef-duel-telemetry', FROZEN_HISTORY)
    resetFrozenCopyForTest()
    expect(removeStagingFrozenCopy(false)).toEqual([])
    expect(real.getItem(STAGING_PREFIX + 'alef-duel-telemetry')).toBe(FROZEN_HISTORY)
    Object.defineProperty(window, 'localStorage', { value: prefixedStorage(real, STAGING_PREFIX), configurable: true })
    expect(removeStagingFrozenCopy(true)).toEqual([{ key: STAGING_PREFIX + 'alef-duel-telemetry', chars: FROZEN_HISTORY.length }])
    expect(removeStagingFrozenCopy(true)).toEqual([])
    Object.defineProperty(window, 'localStorage', { value: real, configurable: true })
    expect(real.getItem(STAGING_PREFIX + 'alef-duel-telemetry')).toBeNull()
    expect(real.getItem('alef-duel-telemetry')).toBe(FROZEN_HISTORY)
  })
})
