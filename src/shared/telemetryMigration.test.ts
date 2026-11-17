// The migration of the live logs: an old `v:1` log (up to 700k) becomes sealed chunks, one session per idle slot, with
// no loss and no doubles whatever write fails. It is the first seal pass of an oversized open chunk (no other path).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION, createTelemetry, readLog } from './telemetry'
import { chunkKeysOf, parseOpen } from './telemetryChunks'
import { safeSetItem } from './saveStorage'
import { STAGING_PREFIX, copyUnprefixedOver, prefixedStorage } from './stagingStorage'
import { FROZEN_HISTORY, GOLDEN_NOW, book2Events, goldenExport } from './__fixtures__/telemetry/generate'
import { BOOK2_LOG } from '../duel2/telemetryLog'

const KEY = BOOK2_LOG.key
const NOW = GOLDEN_NOW.getTime()
const real = window.localStorage

/** an old log as the old build wrote it: ~20 sessions, ≈700k characters, events with and without g */
const OLD = book2Events({ days: 27, eventsPerSession: 180 })
const LITERAL = JSON.stringify({ v: 1, events: OLD })
const str = (x: unknown) => JSON.stringify(x)
const theirs = () => readLog(KEY).filter((e) => e.s !== SESSION)
/** let the idle slots run (three per session: encode, write, budget) */
const idle = async (slots = 80) => { for (let i = 0; i < slots; i++) await vi.advanceTimersByTimeAsync(2100) }
const use = (s: Storage) => Object.defineProperty(window, 'localStorage', { value: s, configurable: true })

/** a Storage over `inner` whose setItem throws a quota error when `fail(key, n)` says so (n counts the writes) */
function faulty(inner: Storage, fail: (key: string, n: number) => boolean): Storage {
  let n = 0
  return {
    get length() { return inner.length },
    key: (i) => inner.key(i),
    getItem: (k) => inner.getItem(k),
    setItem: (k, v) => { if (fail(k, n++)) throw new DOMException('full', 'QuotaExceededError'); inner.setItem(k, v) },
    removeItem: (k) => inner.removeItem(k),
    clear: () => inner.clear(),
  }
}

/** a Storage over `inner` that holds at most `limit` characters (keys and values), as a browser's quota does */
function capped(inner: Storage, limit: number): Storage {
  const used = () => { let n = 0; for (let i = 0; i < inner.length; i++) { const k = inner.key(i)!; n += k.length + inner.getItem(k)!.length } return n }
  return {
    get length() { return inner.length },
    key: (i) => inner.key(i),
    getItem: (k) => inner.getItem(k),
    setItem: (k, v) => {
      const old = inner.getItem(k)
      if (used() - (old === null ? 0 : k.length + old.length) + k.length + v.length > limit) throw new DOMException('full', 'QuotaExceededError')
      inner.setItem(k, v)
    },
    removeItem: (k) => inner.removeItem(k),
    clear: () => inner.clear(),
  }
}

beforeEach(() => {
  real.clear()
  vi.useFakeTimers({ now: NOW })
})
afterEach(() => {
  use(real)
  vi.useRealTimers()
})

async function migrate() {
  const t = createTelemetry(KEY, { game: 'book2' })
  t.track('run-start', { stage: 1 })
  await idle()
  t.flush()
  return t
}

describe('the migration of an old log', () => {
  it('the fixture is an old log of ≈700k characters, ~20 sessions, with and without g', () => {
    expect(LITERAL.length).toBeGreaterThan(600_000)
    expect(LITERAL.length).toBeLessThan(800_000)
    expect(new Set(OLD.map((e) => e.s)).size).toBeGreaterThanOrEqual(18)
    expect(OLD.some((e) => !('g' in e)) && OLD.some((e) => e.g === 'book2')).toBe(true)
  })

  it('seals every complete session with no loss and no doubles; the export is the same; the frozen log is untouched', async () => {
    real.setItem(KEY, LITERAL)
    real.setItem('alef-duel-telemetry', FROZEN_HISTORY)
    const before = goldenExport(BOOK2_LOG, readLog(KEY))
    await migrate()
    expect(chunkKeysOf(KEY).length).toBe(new Set(OLD.map((e) => e.s)).size)
    expect(parseOpen(real.getItem(KEY))!.events.every((e) => e.s === SESSION)).toBe(true)
    expect(str(theirs())).toBe(str(OLD))
    expect(goldenExport(BOOK2_LOG, theirs())).toBe(before)
    expect(real.getItem('alef-duel-telemetry')).toBe(FROZEN_HISTORY)
    const total = Object.keys(real).filter((k) => k.startsWith('alef-duel2')).reduce((n, k) => n + k.length + real.getItem(k)!.length, 0)
    expect(total).toBeLessThan(LITERAL.length / 4)
  })

  it('a second run is a no-op', async () => {
    real.setItem(KEY, LITERAL)
    await migrate()
    const snapshot = Object.fromEntries(Object.keys(real).filter((k) => k !== KEY).map((k) => [k, real.getItem(k)]))
    await migrate()
    expect(Object.fromEntries(Object.keys(real).filter((k) => k !== KEY).map((k) => [k, real.getItem(k)]))).toEqual(snapshot)
    expect(str(theirs())).toBe(str(OLD))
  })

  it('a quota error at any one write, in turn, loses and doubles nothing', async () => {
    real.setItem(KEY, LITERAL)
    let writes = 0
    use(faulty(real, () => { writes++; return false }))
    await migrate()
    use(real)
    for (let fail = 0; fail < writes; fail++) {
      real.clear()
      real.setItem(KEY, LITERAL)
      use(faulty(real, (_, n) => n === fail))
      await migrate()
      use(real)
      expect(str(theirs()), `write ${fail} failed`).toBe(str(OLD))
    }
  }, 120_000)

  it('a quota error mid-way leaves the remaining sessions in the open chunk', async () => {
    real.setItem(KEY, LITERAL)
    let chunks = 0
    use(faulty(real, (k) => k !== KEY && ++chunks > 5))
    await migrate()
    use(real)
    expect(chunkKeysOf(KEY)).toHaveLength(5)
    expect(new Set(parseOpen(real.getItem(KEY))!.events.map((e) => e.s)).size).toBeGreaterThan(10)
    expect(str(theirs())).toBe(str(OLD))
  })

  it('a storage too full for the first chunk leaves the log as it is, and a save still succeeds', async () => {
    real.setItem(KEY, LITERAL)
    use(capped(real, LITERAL.length + KEY.length + 100))
    const t = await migrate()
    expect(chunkKeysOf(KEY)).toHaveLength(0)
    expect(str(theirs())).toBe(str(OLD))
    expect(safeSetItem('alef-duel2', 'x'.repeat(20_000))).toBe(true)
    expect(real.getItem('alef-duel2')).toHaveLength(20_000)
    t.clear()
  })

  it('two instances migrating one log at once: the old sessions are neither lost nor doubled (one chunk each)', async () => {
    real.setItem(KEY, LITERAL)
    const a = createTelemetry(KEY, { game: 'book2' })
    const b = createTelemetry(KEY, { game: 'book2' })
    a.track('x', { by: 'a' })
    b.track('x', { by: 'b' })
    await idle(120)
    a.flush()
    b.flush()
    expect(str(theirs())).toBe(str(OLD))
    const keys = chunkKeysOf(KEY)
    expect(new Set(keys.map((k) => k.split('~')[2])).size).toBe(keys.length) // one chunk per session
  })

  it('staging migrates its own prefixed log only, and a ?copy-prod after it copies no chunk', async () => {
    real.setItem(KEY, LITERAL)
    real.setItem(STAGING_PREFIX + KEY, LITERAL)
    use(prefixedStorage(real, STAGING_PREFIX))
    await migrate()
    use(real)
    expect(Object.keys(real).filter((k) => k.startsWith(STAGING_PREFIX + 'alef-duel2~')).length).toBeGreaterThan(10)
    expect(Object.keys(real).filter((k) => k.startsWith('alef-duel2~'))).toEqual([])
    expect(real.getItem(KEY)).toBe(LITERAL)
    copyUnprefixedOver(real, STAGING_PREFIX)
    expect(Object.keys(real).filter((k) => k.includes('~'))).toEqual([])
  })
})
