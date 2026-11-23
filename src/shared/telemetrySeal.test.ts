// The write side: an instance seals its open chunk into chunks at idle, and no cut, no second tab and no full storage
// loses or doubles an event.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION, createTelemetry, readLog, type TelemetryEvent } from './telemetry'
import { OPEN_SEAL_CHARS, chunkKey, chunkKeysOf, openJson, parseOpen, rollupKey } from './telemetryChunks'
import { encodeChunk } from './telemetryCodec'
import { LIVE_BUDGET } from './telemetryBudget'
import { GOLDEN_SPELLQUEST, GOLDEN_NOW, goldenExport } from './__fixtures__/telemetry/generate'
import { SPELLQUEST_LOG } from '../spellquest/telemetryLog'

const KEY = 'alef-sealtest-telemetry'
const NOW = GOLDEN_NOW.getTime()
const MIN = 60 * 1000
const real = window.localStorage

beforeEach(() => {
  real.clear()
  vi.useFakeTimers({ now: NOW })
})
afterEach(() => {
  Object.defineProperty(window, 'localStorage', { value: real, configurable: true })
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const pad = 'p'.repeat(300)
const ev = (s: string, t: number, i: number): TelemetryEvent => ({ t, s, run: 1, e: 'answer', g: 'spellquest', i, pad })
/** a session of `n` events ending at `end` */
const session = (s: string, end: number, n: number) => Array.from({ length: n }, (_, i) => ev(s, end - (n - 1 - i) * 1000, i))
const str = (x: unknown) => JSON.stringify(x)
/** let the idle slots run (no requestIdleCallback in jsdom: 2 s of quiet each) */
const idle = async (slots = 30) => { for (let i = 0; i < slots; i++) await vi.advanceTimersByTimeAsync(2100) }
const open = () => parseOpen(real.getItem(KEY))!

/** a Storage over `real` whose setItem throws when `fail(key, n)` says so (n counts the writes) */
function faulty(fail: (key: string, n: number) => boolean) {
  let n = 0
  const s: Storage = {
    get length() { return real.length },
    key: (i) => real.key(i),
    getItem: (k) => real.getItem(k),
    setItem: (k, v) => { if (fail(k, n++)) throw new DOMException('full', 'QuotaExceededError'); real.setItem(k, v) },
    removeItem: (k) => real.removeItem(k),
    clear: () => real.clear(),
  }
  Object.defineProperty(window, 'localStorage', { value: s, configurable: true })
}

describe('sealing the open chunk', () => {
  it('a flush writes only the open chunk', () => {
    const t = createTelemetry(KEY, { game: 'spellquest' })
    const set = vi.spyOn(Storage.prototype, 'setItem')
    for (let i = 0; i < 20; i++) t.track('x', { i })
    t.flush()
    expect(set.mock.calls.map((c) => c[0])).toEqual([KEY])
  })

  it('past 40k characters, its own session is sealed at idle; the events read back whole and in order', async () => {
    const t = createTelemetry(KEY, { game: 'spellquest' })
    for (let i = 0; i < 200; i++) { t.track('answer', { i, pad }); vi.advanceTimersByTime(10) }
    t.flush()
    const before = readLog(KEY)
    expect(real.getItem(KEY)!.length).toBeGreaterThan(OPEN_SEAL_CHARS)
    await idle(2)
    expect(chunkKeysOf(KEY)).toHaveLength(1)
    expect(open().events).toEqual([])
    expect(open().sealed).toEqual(chunkKeysOf(KEY))
    expect(str(readLog(KEY))).toBe(str(before))
    t.track('answer', { i: 200 })
    expect(t.events().map((e) => e.i)).toEqual(Array.from({ length: 201 }, (_, i) => i))
    t.clear()
    expect(Object.keys(real)).toEqual([])
  })

  it('with no requestIdleCallback, nothing seals while taps come less than 2 s apart', async () => {
    const t = createTelemetry(KEY, { game: 'spellquest' })
    for (let i = 0; i < 200; i++) t.track('answer', { i, pad })
    t.flush()
    for (let i = 0; i < 20; i++) {
      window.dispatchEvent(new Event('pointerdown'))
      await vi.advanceTimersByTimeAsync(1500)
    }
    expect(chunkKeysOf(KEY)).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(2100) // a quiet slot: the encode
    expect(chunkKeysOf(KEY)).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(2100) // the next one: the write
    expect(chunkKeysOf(KEY)).toHaveLength(1)
  })

  it('a later page seals the first page\'s stale session, not one that is still live in another tab', async () => {
    const stale = session('old-1', NOW - 40 * MIN, 80)
    const live = session('live-1', NOW - 5 * MIN, 80)
    real.setItem(KEY, openJson([...stale, ...live], []))
    const t = createTelemetry(KEY, { game: 'spellquest' })
    t.track('answer', { i: -1 })
    await idle()
    expect(chunkKeysOf(KEY).map((k) => k.split('~')[2])).toEqual(['old-1-telemetry'])
    expect(new Set(open().events.map((e) => e.s))).toEqual(new Set(['live-1', SESSION]))
    expect(str(readLog(KEY))).toBe(str([...stale, ...live, ...t.events().slice(-1)]))
  })

  it('a seal cut after the chunk write (the open rewrite fails) loses and doubles nothing, and finishes next time', async () => {
    const stale = session('old-1', NOW - 40 * MIN, 150)
    real.setItem(KEY, openJson(stale, []))
    let cut = true
    faulty((k) => cut && k === KEY && chunkKeysOf(KEY).length > 0) // the rewrite right after the chunk write fails
    const t = createTelemetry(KEY, { game: 'spellquest' })
    t.track('answer', { i: -1 })
    await idle(3)
    expect(chunkKeysOf(KEY)).toHaveLength(1)
    expect(open().sealed).toEqual([]) // the open chunk still holds the session
    const all = readLog(KEY)
    expect(all.filter((e) => e.s === 'old-1')).toHaveLength(150)
    cut = false
    t.flush()
    expect(open().events.every((e) => e.s === SESSION)).toBe(true)
    expect(str(readLog(KEY))).toBe(str(all))
  })

  it('a quota error on the chunk write leaves the open chunk as it is', async () => {
    const stale = session('old-1', NOW - 40 * MIN, 150)
    real.setItem(KEY, openJson(stale, []))
    faulty((k) => k !== KEY)
    const t = createTelemetry(KEY, { game: 'spellquest' })
    t.track('answer', { i: -1 })
    await idle(3)
    t.flush()
    expect(chunkKeysOf(KEY)).toHaveLength(0)
    expect(open().events).toHaveLength(151)
  })

  it('two instances on one log (one seals, the other flushes its older view after): the sealed session is neither lost nor doubled', async () => {
    const stale = session('old-1', NOW - 40 * MIN, 150)
    real.setItem(KEY, openJson(stale, []))
    const b = createTelemetry(KEY, { game: 'spellquest' })
    b.flush() // b holds the old view
    const a = createTelemetry(KEY, { game: 'spellquest' })
    a.track('answer', { i: 'a' })
    await idle()
    expect(chunkKeysOf(KEY)).toHaveLength(1)
    b.flush() // its older view comes back into the open chunk
    expect(readLog(KEY).filter((e) => e.s === 'old-1')).toHaveLength(150)
    b.track('answer', { i: 'b' })
    await idle()
    expect(chunkKeysOf(KEY)).toHaveLength(1) // b took in a's chunk: no second copy
    b.flush()
    const evs = readLog(KEY)
    expect(evs.filter((e) => e.s === 'old-1')).toHaveLength(150)
    expect(str(evs.filter((e) => e.s === 'old-1'))).toBe(str(stale))
    // the accepted limit (last writer wins on the open chunk, as before the chunks): b's older view overwrote a's new,
    // unsealed event. The plan states it (Task 4b).
    expect(evs.filter((e) => e.e === 'answer' && e.i === 'a')).toEqual([])
    expect(evs.filter((e) => e.e === 'answer' && e.i === 'b')).toHaveLength(1)
  })

  it('a session that cannot be sealed (a t that is not a safe integer) is skipped once, and the next ones are sealed', async () => {
    const odd = session('old-1', NOW - 90 * MIN, 60)
    odd[5] = { ...odd[5]!, t: odd[5]!.t + 0.5 }
    const next = [session('old-2', NOW - 70 * MIN, 60), session('old-3', NOW - 50 * MIN, 60)]
    real.setItem(KEY, openJson([...odd, ...next.flat()], []))
    const t = createTelemetry(KEY, { game: 'spellquest' })
    t.track('answer', { i: -1 })
    await idle()
    expect(chunkKeysOf(KEY).map((k) => k.split('~')[2])).toEqual(['old-2-telemetry', 'old-3-telemetry'])
    expect(str(readLog(KEY).filter((e) => e.s === 'old-1'))).toBe(str(odd))
    const skips = () => readLog(KEY).filter((e) => e.e === 'seal-skipped')
    expect(skips()).toMatchObject([{ s: SESSION, session: 'old-1', reason: 'time' }])
    // a later pass on this page does not record it again
    for (let i = 0; i < 150; i++) t.track('answer', { i, pad })
    await idle()
    expect(skips()).toHaveLength(1)
    t.clear()
  })

  it('a session whose chunk key already holds an unreadable value is skipped, and the next one is sealed', async () => {
    const a = session('old-1', NOW - 90 * MIN, 80)
    const b = session('old-2', NOW - 60 * MIN, 80)
    real.setItem(KEY, openJson([...a, ...b], []))
    const taken = chunkKey(KEY, a[0]!.t, 'old-1')
    real.setItem(taken, 'not a chunk')
    const t = createTelemetry(KEY, { game: 'spellquest' })
    t.track('answer', { i: -1 })
    await idle()
    expect(real.getItem(taken)).toBe('not a chunk')
    expect(chunkKeysOf(KEY)).toContain(chunkKey(KEY, b[0]!.t, 'old-2'))
    expect(open().events.some((e) => e.s === 'old-2')).toBe(false)
    expect(str(open().events.filter((e) => e.s === 'old-1'))).toBe(str(a))
    expect(readLog(KEY).filter((e) => e.e === 'seal-skipped')).toMatchObject([{ session: 'old-1', reason: 'taken' }])
    t.clear()
  })

  it('a throwing storage never throws out of track or flush', () => {
    const t = createTelemetry(KEY, { game: 'spellquest' })
    const bad = { get length(): number { throw new Error('x') }, key() { throw new Error('x') }, getItem() { throw new Error('x') }, setItem() { throw new Error('x') }, removeItem() { throw new Error('x') }, clear() {} }
    Object.defineProperty(window, 'localStorage', { value: bad, configurable: true })
    expect(() => { t.track('x'); t.flush(); t.setRun(2); t.events(); t.clear() }).not.toThrow()
  })

  it('the frozen log is never opened for writing (a throw in dev)', () => {
    expect(() => createTelemetry('alef-tower-history-telemetry', { game: 'duel' })).toThrow(/frozen/)
  })

  it('the goldens match through the chunked path (an old log sealed session by session)', async () => {
    const evs = GOLDEN_SPELLQUEST()
    real.setItem(SPELLQUEST_LOG.key, JSON.stringify({ v: 1, events: evs }))
    const pre = goldenExport(SPELLQUEST_LOG, readLog(SPELLQUEST_LOG.key))
    const t = createTelemetry(SPELLQUEST_LOG.key, { game: 'spellquest' })
    t.track('x')
    await idle(80)
    expect(chunkKeysOf(SPELLQUEST_LOG.key).length).toBeGreaterThan(5)
    expect(goldenExport(SPELLQUEST_LOG, readLog(SPELLQUEST_LOG.key).filter((e) => e.s !== SESSION))).toBe(pre)
    t.clear()
  })
})

describe('the seal pass and the main thread', () => {
  type Cb = (d: { timeRemaining(): number; didTimeout: boolean }) => void
  let queue: Cb[] = []
  beforeEach(() => {
    queue = []
    Object.assign(window, { requestIdleCallback: (cb: Cb) => { queue.push(cb); return queue.length }, cancelIdleCallback: () => {} })
  })
  afterEach(() => {
    delete (window as { requestIdleCallback?: unknown }).requestIdleCallback
    delete (window as { cancelIdleCallback?: unknown }).cancelIdleCallback
  })
  /** run the waiting idle callback with `ms` of idle time left (a short slot, or a timeout, during a round) */
  const slot = (ms: number, didTimeout = false) => { const cb = queue.shift(); expect(cb).toBeDefined(); cb!({ timeRemaining: () => ms, didTimeout }) }

  it('a slot with little idle time left (a frame during a round, or a timeout) does no seal work and waits for the next', () => {
    real.setItem(KEY, openJson(session('old-1', NOW - 40 * MIN, 150), []))
    const t = createTelemetry(KEY, { game: 'spellquest' })
    t.track('answer', { i: -1 })
    const set = vi.spyOn(Storage.prototype, 'setItem')
    for (let i = 0; i < 5; i++) slot(3, i % 2 === 1)
    expect(set).not.toHaveBeenCalled()
    expect(queue).toHaveLength(1) // it asked again
    t.clear()
  })

  it('encode, write and the budget run in idle slots of their own', () => {
    const fill = 'alef-sealfill-telemetry'
    const noise = () => Array.from({ length: 100 }, () => Math.random().toString(36).slice(2, 6)).join('')
    const old = Array.from({ length: 2600 }, (_, i): TelemetryEvent => ({ t: NOW - 90 * 24 * 60 * MIN + i, s: 'f', run: 1, e: 'answer', g: 'x', pad: noise() }))
    real.setItem(chunkKey(fill, old[0]!.t, 'f'), encodeChunk(old))
    expect(real.getItem(chunkKey(fill, old[0]!.t, 'f'))!.length).toBeGreaterThan(LIVE_BUDGET)
    real.setItem(KEY, openJson(session('old-1', NOW - 40 * MIN, 150), []))
    const t = createTelemetry(KEY, { game: 'spellquest' })
    t.track('answer', { i: -1 })
    const set = vi.spyOn(Storage.prototype, 'setItem')
    const remove = vi.spyOn(Storage.prototype, 'removeItem')
    slot(50) // encode only
    expect(set).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    slot(50) // write, read back, rewrite the open chunk
    expect(chunkKeysOf(KEY)).toHaveLength(1)
    expect(set.mock.calls.map((c) => c[0])).toEqual([chunkKeysOf(KEY)[0], KEY])
    expect(remove).not.toHaveBeenCalled()
    set.mockClear()
    slot(50) // the budget: the old filler goes, folded first
    expect(real.getItem(chunkKey(fill, old[0]!.t, 'f'))).toBeNull()
    expect(set.mock.calls.map((c) => c[0])).toEqual([rollupKey(fill)])
    t.clear()
  })

  it('at the hard cap, a flush encodes its own session and the next flush writes it (never both in one task)', () => {
    const t = createTelemetry(KEY, { game: 'spellquest' })
    for (let i = 0; i < 700; i++) t.track('answer', { i, pad })
    const set = vi.spyOn(Storage.prototype, 'setItem')
    t.flush()
    expect(set.mock.calls.map((c) => c[0])).toEqual([KEY]) // encoded, not written
    expect(chunkKeysOf(KEY)).toHaveLength(0)
    t.flush()
    expect(chunkKeysOf(KEY)).toHaveLength(1)
    expect(real.getItem(KEY)!.length).toBeLessThan(OPEN_SEAL_CHARS)
    expect(t.events().map((e) => e.i)).toEqual(Array.from({ length: 700 }, (_, i) => i))
    t.clear()
  })
})
