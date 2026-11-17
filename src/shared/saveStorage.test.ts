import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDuel2Store } from '../duel2/store'
import { useClockStore } from '../clock/store'
import { useProgressStore } from '../stores/progressStore'
import { getGender, setGender } from './player'
import { FREE_SLACK, isQuotaError, requestPersistentStorage, resetPersistRequestForTest, safeSetItem } from './saveStorage'
import { STAGING_PREFIX, prefixedStorage } from './stagingStorage'
import { createTelemetry, type TelemetryEvent } from './telemetry'

/** A localStorage that throws a quota error once keys and values hold more than `limit` characters. */
class FullStorage implements Storage {
  data = new Map<string, string>()
  constructor(public limit = Infinity) {}
  used() { let n = 0; for (const [k, v] of this.data) n += k.length + v.length; return n }
  get length() { return this.data.size }
  key(i: number) { return [...this.data.keys()][i] ?? null }
  getItem(k: string) { return this.data.get(k) ?? null }
  setItem(k: string, v: string) {
    const next = this.used() - (this.data.has(k) ? k.length + this.data.get(k)!.length : 0) + k.length + v.length
    if (next > this.limit) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    this.data.set(k, String(v))
  }
  removeItem(k: string) { this.data.delete(k) }
  clear() { this.data.clear() }
}

const real = window.localStorage
const install = (s: Storage) => Object.defineProperty(window, 'localStorage', { value: s, configurable: true })
afterEach(() => { install(real); vi.restoreAllMocks() })

const BOOK2_LOG = 'alef-duel2-telemetry'
const CLOCK_LOG = 'alef-clock-telemetry'
const FROZEN = 'alef-duel-telemetry'
/** a log of `n` events numbered 0…n-1 (0 is the oldest), about 60 characters each */
const log = (n: number, g = 'book2') => JSON.stringify({
  v: 1, events: Array.from({ length: n }, (_, i): TelemetryEvent => ({ t: i, s: 'x', run: 0, e: 'round', g: g as 'book2', i })),
})
const last = <T,>(a: T[]): T => a[a.length - 1]
const eventsOf = (s: Storage, k: string): TelemetryEvent[] => JSON.parse(s.getItem(k) ?? '{"events":[]}').events

/** A full storage: two live logs, the frozen log, another save; then no room left beyond `room` characters. */
function fullStorage(room = 100): FullStorage {
  const s = new FullStorage()
  s.setItem(BOOK2_LOG, log(600))
  s.setItem(CLOCK_LOG, log(600, 'clock'))
  s.setItem(FROZEN, log(300, 'duel'))
  s.setItem('alef-other-save', JSON.stringify({ precious: 'x'.repeat(2000) }))
  s.limit = s.used() + room
  return s
}
const snapshot = (s: FullStorage, k: string) => s.getItem(k)

describe('a child save in a full storage', () => {
  beforeEach(() => install(new FullStorage()))

  it('the fake throws a quota error past its limit', () => {
    const s = new FullStorage(10)
    expect(() => s.setItem('k', 'x'.repeat(20))).toThrow()
    try { s.setItem('k', 'x'.repeat(20)) } catch (e) { expect(isQuotaError(e)).toBe(true) }
  })

  it.each([
    ['Book 2', 'alef-duel2', () => useDuel2Store.getState().addStars(5), (v: string) => JSON.parse(v).state.totalStars > 0],
    ['the clock', 'alef-clock', () => useClockStore.getState().addGears(7), (v: string) => JSON.parse(v).state.gears >= 7],
    ['the lessons', 'alef-progress', () => useProgressStore.getState().addToVocabulary('full-storage-word'),
      (v: string) => JSON.parse(v).state.vocabulary.includes('full-storage-word')],
  ])('%s: the save survives by trimming a live log, oldest events first', (_name, key, act, saved) => {
    const s = fullStorage()
    install(s)
    const frozen = snapshot(s, FROZEN)
    const other = snapshot(s, 'alef-other-save')
    const before = eventsOf(s, BOOK2_LOG).length + eventsOf(s, CLOCK_LOG).length
    expect(act).not.toThrow()
    const value = s.getItem(key)
    expect(value).not.toBeNull()
    expect(saved(value!)).toBe(true)
    // a live log lost its oldest events; what is left is the newest, in order
    const book2 = eventsOf(s, BOOK2_LOG)
    expect(book2.length + eventsOf(s, CLOCK_LOG).length).toBeLessThan(before)
    if (book2.length) expect(last(book2).i).toBe(599)
    // the frozen log and the other save are untouched
    expect(s.getItem(FROZEN)).toBe(frozen)
    expect(s.getItem('alef-other-save')).toBe(other)
  })

  it('trims only as much as the write needs, and never a save', () => {
    const s = fullStorage()
    install(s)
    expect(safeSetItem('alef-new-save', 'y'.repeat(1000))).toBe(true)
    const freed = log(600).length + log(600, 'clock').length - (s.getItem(BOOK2_LOG)?.length ?? 0) - (s.getItem(CLOCK_LOG)?.length ?? 0)
    expect(freed).toBeGreaterThanOrEqual(1000 + 'alef-new-save'.length)
    expect(freed).toBeLessThan(1000 + FREE_SLACK + 2000)
    expect(s.getItem('alef-other-save')).not.toBeNull()
  })

  it('the player setting survives too', () => {
    const s = fullStorage(5)
    install(s)
    setGender('girl', 'parent')
    expect(JSON.parse(s.getItem('alef-player')!).gender).toBe('girl')
    expect(getGender()).toBe('girl')
  })

  it('staging: the save keeps its prefix, and staging trims only its own logs', () => {
    const raw = new FullStorage()
    raw.setItem(FROZEN, log(300, 'duel'))
    raw.setItem(BOOK2_LOG, log(300))
    raw.setItem(STAGING_PREFIX + CLOCK_LOG, log(600, 'clock'))
    raw.setItem(STAGING_PREFIX + FROZEN, log(100, 'duel'))
    raw.limit = raw.used() + 50
    const prodFrozen = raw.getItem(FROZEN)
    const prodLog = raw.getItem(BOOK2_LOG)
    const stagingFrozen = raw.getItem(STAGING_PREFIX + FROZEN)
    install(prefixedStorage(raw, STAGING_PREFIX))
    useClockStore.getState().addGears(3)
    expect(raw.getItem(STAGING_PREFIX + 'alef-clock')).not.toBeNull()
    expect(raw.getItem('alef-clock')).toBeNull()
    expect(eventsOf(raw, STAGING_PREFIX + CLOCK_LOG).length).toBeLessThan(600)
    expect(raw.getItem(FROZEN)).toBe(prodFrozen)
    expect(raw.getItem(BOOK2_LOG)).toBe(prodLog)
    expect(raw.getItem(STAGING_PREFIX + FROZEN)).toBe(stagingFrozen)
  })

  it('production may trim staging\'s logs, never staging\'s frozen log', () => {
    const s = new FullStorage()
    s.setItem(STAGING_PREFIX + BOOK2_LOG, log(600))
    s.setItem(STAGING_PREFIX + FROZEN, log(300, 'duel'))
    s.setItem(FROZEN, log(300, 'duel'))
    s.limit = s.used() + 50
    const frozen = [s.getItem(FROZEN), s.getItem(STAGING_PREFIX + FROZEN)]
    install(s)
    useDuel2Store.getState().addStars(1)
    expect(s.getItem('alef-duel2')).not.toBeNull()
    expect(eventsOf(s, STAGING_PREFIX + BOOK2_LOG).length).toBeLessThan(600)
    expect([s.getItem(FROZEN), s.getItem(STAGING_PREFIX + FROZEN)]).toEqual(frozen)
  })

  it('a persistent failure keeps the game running: the state stays in memory, nothing throws, nothing is lost', () => {
    const s = new FullStorage()
    s.setItem(FROZEN, log(300, 'duel'))
    s.setItem('alef-other-save', 'z'.repeat(3000))
    s.setItem(BOOK2_LOG, log(5))
    s.limit = s.used() + 10
    const frozen = s.getItem(FROZEN)
    install(s)
    const stars = useDuel2Store.getState().totalStars
    expect(() => useDuel2Store.getState().addStars(2)).not.toThrow()
    expect(useDuel2Store.getState().totalStars).toBe(stars + 2)
    expect(() => useDuel2Store.getState().addStars(1)).not.toThrow()
    expect(useDuel2Store.getState().totalStars).toBe(stars + 3)
    expect(s.getItem(FROZEN)).toBe(frozen)
    expect(s.getItem('alef-other-save')).toBe('z'.repeat(3000))
    expect(safeSetItem('alef-x', 'y'.repeat(5000))).toBe(false)
  })

  it('a storage that throws something else (no storage at all) never throws into the game', () => {
    const broken = new FullStorage()
    broken.setItem = () => { throw new Error('SecurityError') }
    broken.getItem = () => { throw new Error('SecurityError') }
    install(broken)
    expect(() => useClockStore.getState().addGears(1)).not.toThrow()
    expect(safeSetItem('k', 'v')).toBe(false)
  })
})

describe('the request to keep the storage', () => {
  afterEach(() => { resetPersistRequestForTest(); vi.unstubAllGlobals() })

  it('asks once per page and records the answer once', async () => {
    const persist = vi.fn(async () => true)
    vi.stubGlobal('navigator', { storage: { persisted: async () => false, persist } })
    const record = vi.fn()
    await requestPersistentStorage(record)
    await requestPersistentStorage(record)
    expect(persist).toHaveBeenCalledTimes(1)
    expect(record).toHaveBeenCalledTimes(1)
    expect(record).toHaveBeenCalledWith(true)
  })

  it('does not ask again when the storage is already kept', async () => {
    const persist = vi.fn(async () => true)
    vi.stubGlobal('navigator', { storage: { persisted: async () => true, persist } })
    const record = vi.fn()
    await requestPersistentStorage(record)
    expect(persist).not.toHaveBeenCalled()
    expect(record).toHaveBeenCalledWith(true)
  })

  it('is best-effort: no API or an error records nothing and throws nothing', async () => {
    vi.stubGlobal('navigator', {})
    const record = vi.fn()
    await expect(requestPersistentStorage(record)).resolves.toBeUndefined()
    resetPersistRequestForTest()
    vi.stubGlobal('navigator', { storage: { persist: async () => { throw new Error('no') } } })
    await expect(requestPersistentStorage(record)).resolves.toBeUndefined()
    expect(record).not.toHaveBeenCalled()
  })
})

// Last: these make telemetry instances, which stay registered as this page's logs for the rest of the file.
describe('telemetry in a full storage', () => {
  it('its own flush never evicts a save: it gives up its own oldest events', () => {
    const s = new FullStorage()
    s.setItem('alef-duel2', JSON.stringify({ state: { totalStars: 9 } }))
    s.setItem(FROZEN, log(100, 'duel'))
    s.limit = s.used() + 3000
    install(s)
    const t = createTelemetry('alef-test-telemetry', { game: 'book2', maxChars: 1_000_000 })
    for (let i = 0; i < 200; i++) t.track('round', { i })
    t.flush()
    expect(s.getItem('alef-duel2')).toBe(JSON.stringify({ state: { totalStars: 9 } }))
    expect(s.getItem(FROZEN)).toBe(log(100, 'duel'))
    const kept = eventsOf(s, 'alef-test-telemetry')
    expect(kept.length).toBeGreaterThan(0)
    expect(kept.length).toBeLessThan(200)
    expect(last(kept).i).toBe(199)
    t.clear()
  })

  it('this page\'s log is trimmed first, through its instance, so its next flush does not bring the events back', () => {
    const s = fullStorage()
    install(s)
    const clock = createTelemetry(CLOCK_LOG, { game: 'clock', maxChars: 1_000_000 })
    clock.track('round', { i: 600 })
    const book2Before = s.getItem(BOOK2_LOG)
    useClockStore.getState().addGears(1)
    expect(s.getItem('alef-clock')).not.toBeNull()
    expect(s.getItem(BOOK2_LOG)).toBe(book2Before)
    const after = eventsOf(s, CLOCK_LOG)
    expect(after.length).toBeLessThan(600)
    clock.flush()
    const flushed = eventsOf(s, CLOCK_LOG)
    expect(flushed.length).toBeLessThanOrEqual(after.length + 1)
    expect(last(flushed).i).toBe(600)
    clock.clear()
  })
})
