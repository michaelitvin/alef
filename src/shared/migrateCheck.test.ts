// `?migrate-check`: the whole check on realistic old data (chunks from the real codec), a corrupt result, production
// already migrated, a quota stop, a second run, the half-done resume, and production never written.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runMigrateCheck, deepEqual, type CheckSnapshots, type SaveStep } from './migrateCheck'
import { SAVE_STEPS } from './migrateCheckSteps'
import { prefixedStorage, STAGING_PREFIX } from './stagingStorage'
import { encodeChunk } from './telemetryCodec'
import { chunkKey, openJson, rollupKey } from './telemetryChunks'
import { MIGRATIONS_KEY } from './keyMigration'

const OLD = 'alef-duel2-telemetry'
const OLD_EN = 'alef-english-telemetry'
const ev = (t: number, s: string, extra: object = {}) => ({ t, s, run: 1, e: 'answer', g: 'book2', ...extra })
const E1 = [ev(1_000, 'sa'), ev(2_000, 'sa', { ms: 900 }), ev(3_000, 'sa')]
const E2 = [ev(10_000, 'sb'), ev(11_000, 'sb')]
const OPEN = [ev(20_000, 'sc'), ev(21_000, 'sc')]
const K1 = chunkKey(OLD, 1_000, 'sa')
const K2 = chunkKey(OLD, 10_000, 'sb')
const EN1 = [ev(30_000, 'se', { g: 'english' }), ev(31_000, 'se', { g: 'english' })]
const EN_OPEN = [ev(40_000, 'sf', { g: 'english' })]
const KE = chunkKey(OLD_EN, 30_000, 'se')

function seedProduction() {
  const put = (k: string, v: unknown) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
  put('alef-progress', { state: { duel: { wins: 3 }, settings: { duelMusic: false, volume: 2 }, stars: 9 }, version: 0 })
  put('alef-duel2', { state: { bookOpen: true, firstDuelImported: true, stage: { stage: 2 }, coins: 4, settings: { range: 100 }, tower: { x: 1 } }, version: 7 })
  put('alef-english', { state: { bookOpen: false, firstDuelImported: false, settings: { path: true }, placement: { done: true }, coins: 3 }, version: 1 })
  put('alef-playtime', { v: 1, days: { '2026-11-10': { book2: 5000, clock: 100 }, '2026-11-11': { book2: 7000, english: 1000 } } })
  put(KE, encodeChunk(EN1))
  put(rollupKey(OLD_EN), { v: 1, folded: [{ k: `alef-english~xx~sz-telemetry`, s: 'sz', t0: 1, t1: 2, n: 1, at: 3 }], dropped: 0, days: {}, tails: {} })
  put(OLD_EN, openJson(EN_OPEN as never, [KE]))
  put(K1, encodeChunk(E1))
  put(K2, encodeChunk(E2))
  put(rollupKey(OLD), { v: 1, folded: [{ k: K1, s: 'sa', t0: 1_000, t1: 3_000, n: 3, at: 5 }], dropped: 0, days: { '2026-11-10': { n: 3 } }, tails: {} })
  put(OLD, openJson(OPEN as never, [K1, K2]))
  put('alef-duel-telemetry', { v: 1, events: [{ t: 500, s: 'x', run: 1, e: 'choice' }, { t: 600, s: 'x', run: 1, e: 'choice' }] })
  put('alef-clock', { state: { gears: 1 }, version: 1 })
}
const unprefixed = () => Object.keys(localStorage).filter((k) => !k.startsWith(STAGING_PREFIX))
const run = (steps: Record<string, SaveStep> = SAVE_STEPS, staging: Storage = prefixedStorage(localStorage, STAGING_PREFIX)) =>
  runMigrateCheck(localStorage, staging, steps)
const failing = (r: ReturnType<typeof run>) => r.rows.filter((x) => x.moved === false || !x.content || x.counts === false).map((x) => x.key)

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('?migrate-check', () => {
  it('PASS on realistic old data: every key moved, equal, counted; markers; second run; half-done resume', () => {
    seedProduction()
    const before = unprefixed().map((k) => [k, localStorage.getItem(k)])
    const r = run()
    expect(failing(r)).toEqual([])
    expect(r.verdict).toBe('pass')
    const keys = r.rows.map((x) => x.key)
    expect(keys).toEqual(expect.arrayContaining([
      'alef-progress', 'alef-spellquest-he', 'alef-spellquest-en', 'alef-playtime', 'alef-spellquest-he-telemetry', rollupKey('alef-spellquest-he-telemetry'),
      chunkKey('alef-spellquest-he-telemetry', 1_000, 'sa'), 'alef-spellquest-en-telemetry', rollupKey('alef-spellquest-en-telemetry'),
      chunkKey('alef-spellquest-en-telemetry', 30_000, 'se'), 'alef-tower-history-telemetry', MIGRATIONS_KEY, 'second run',
    ]))
    expect(keys.some((k) => k.startsWith('half-done run'))).toBe(true)
    expect(keys).toContain('alef-spellquest-he-telemetry: whole log, 7 events') // 3 + 2 + 2 open
    expect(keys).toContain('alef-spellquest-en-telemetry: whole log, 3 events')
    // staging holds the migrated result; production is untouched
    const staging = prefixedStorage(localStorage, STAGING_PREFIX)
    expect(staging.getItem('alef-duel2')).toBeNull()
    expect(staging.getItem('alef-english')).toBeNull()
    expect(JSON.parse(staging.getItem('alef-spellquest-he')!)).toMatchObject({ version: 8, state: { screensOpen: true, towerImported: true } })
    expect(JSON.parse(staging.getItem('alef-spellquest-en')!)).toMatchObject({ version: 2, state: { screensOpen: false, towerImported: false, coins: 3 } })
    expect(JSON.parse(staging.getItem('alef-playtime')!).days['2026-11-11']).toEqual({ 'spellquest-he': 7000, 'spellquest-en': 1000 })
    expect(JSON.parse(staging.getItem('alef-progress')!).state).toMatchObject({ tower: { wins: 3 }, settings: { towerMusic: false, volume: 2 } })
    expect(unprefixed().map((k) => [k, localStorage.getItem(k)])).toEqual(before)
  })

  it('production is only read: no write or remove on an unprefixed key', () => {
    seedProduction()
    const calls: string[] = []
    const set = Storage.prototype.setItem
    const rem = Storage.prototype.removeItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) { calls.push(k); return set.call(this, k, v) })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, k: string) { calls.push(k); return rem.call(this, k) })
    run()
    expect(calls.length).toBeGreaterThan(10)
    expect(calls.filter((k) => !k.startsWith(STAGING_PREFIX))).toEqual([])
  })

  it('FAIL: a wrong save step fails its row (the expectation is the check\'s own table); a leftover old name fails too', () => {
    seedProduction()
    const noop: SaveStep = { version: 8, migrate: (s) => s }
    const r = run({ ...SAVE_STEPS, 'alef-spellquest-he': noop })
    expect(r.verdict).toBe('fail')
    expect(failing(r)).toEqual(['alef-spellquest-he'])
    const leftover: SaveStep = { version: 1, migrate: (s, v) => ({ ...(SAVE_STEPS['alef-progress']!.migrate(s, v) as object), book2: 1 }) }
    const r2 = run({ ...SAVE_STEPS, 'alef-progress': leftover })
    expect(r2.verdict).toBe('fail')
    expect(r2.rows.find((x) => x.key === 'alef-progress')!.detail).toMatch(/book2/)
  })

  it('production already migrated: says so, fails nothing, and leaves staging alone', () => {
    localStorage.setItem('alef-spellquest-he', '{"state":{},"version":8}')
    localStorage.setItem('alef-spellquest-he-telemetry', openJson(OPEN as never, []))
    localStorage.setItem('staging:alef-keep', 'k')
    const r = run()
    expect(r.verdict).toBe('already')
    expect(r.message).toBe('production is already migrated: nothing to check')
    expect(localStorage.getItem('staging:alef-keep')).toBe('k')
  })

  it('quota stop during the copy: "no space", and what it copied is removed', () => {
    seedProduction()
    const inner = prefixedStorage(localStorage, STAGING_PREFIX)
    let n = 0
    const limited: Storage = {
      get length() { return inner.length },
      key: inner.key, getItem: inner.getItem, removeItem: inner.removeItem, clear: inner.clear,
      setItem: (k, v) => { if (++n > 3) throw new DOMException('full', 'QuotaExceededError'); inner.setItem(k, v) },
    }
    const r = run(SAVE_STEPS, limited)
    expect(r.verdict).toBe('no-space')
    expect(r.message).toMatch(/^no space/)
    expect(Object.keys(localStorage).filter((k) => k.startsWith(STAGING_PREFIX))).toEqual([])
  })

  it('quota stop: staging\'s own saves and logs that step 1 removed are put back', () => {
    seedProduction()
    const inner = prefixedStorage(localStorage, STAGING_PREFIX)
    const own = { 'alef-spellquest': '{"state":{"coins":2},"version":7}', 'alef-spellquest-he': '{"state":{"coins":1},"version":8}', 'alef-progress': '{"state":{},"version":3}', 'alef-spellquest-telemetry': '{"v":1,"events":[]}', [MIGRATIONS_KEY]: '{"v":1,"done":["spellquest-rename"]}' }
    for (const [k, v] of Object.entries(own)) inner.setItem(k, v)
    let n = 0
    const limited: Storage = {
      get length() { return inner.length },
      key: inner.key, getItem: inner.getItem, removeItem: inner.removeItem, clear: inner.clear,
      setItem: (k, v) => { if (++n === 4) throw new DOMException('full', 'QuotaExceededError'); inner.setItem(k, v) },
    }
    n = 0
    const r = run(SAVE_STEPS, limited)
    expect(r.verdict).toBe('no-space')
    expect(r.message).toMatch(/put staging’s own saves back/)
    for (const [k, v] of Object.entries(own)) expect(inner.getItem(k)).toBe(v)
    expect(Object.keys(localStorage).filter((k) => k.startsWith(STAGING_PREFIX)).sort()).toEqual(Object.keys(own).map((k) => STAGING_PREFIX + k).sort())
  })

  it('a second check on the same staging gives the same PASS (it clears its own copies first)', () => {
    seedProduction()
    expect(run().verdict).toBe('pass')
    expect(run().verdict).toBe('pass')
  })

  it('staging with the in-between names of the 2026-11-23 build (and its marker): removed first, still a PASS', () => {
    seedProduction()
    const staging = prefixedStorage(localStorage, STAGING_PREFIX)
    staging.setItem('alef-spellquest', '{"state":{"coins":99},"version":8}')
    staging.setItem('alef-spellquest-telemetry', openJson([ev(90_000, 'sz', { g: 'spellquest' })] as never, []))
    staging.setItem(chunkKey('alef-spellquest-telemetry', 80_000, 'sy'), encodeChunk([ev(80_000, 'sy')]))
    staging.setItem(MIGRATIONS_KEY, JSON.stringify({ v: 1, done: ['spellquest-rename', 'tower-history'], fp: { 'alef-spellquest': 'x' } }))
    const r = run()
    expect(failing(r)).toEqual([])
    expect(r.verdict).toBe('pass')
    expect(Object.keys(localStorage).filter((k) => k.startsWith(`${STAGING_PREFIX}alef-spellquest`) && !/-(he|en)[~-]|-(he|en)$/.test(k))).toEqual([])
  })

  it('the snapshots: before = production\'s keys as copied (raw, byte-equal); after = the migrated keys (no prefix)', () => {
    seedProduction()
    const snap: CheckSnapshots = {}
    expect(runMigrateCheck(localStorage, prefixedStorage(localStorage, STAGING_PREFIX), SAVE_STEPS, 1, snap).verdict).toBe('pass')
    const copied = ['alef-progress', 'alef-duel2', 'alef-english', 'alef-playtime', K1, K2, rollupKey(OLD), OLD, 'alef-duel-telemetry', KE, rollupKey(OLD_EN), OLD_EN]
    expect(Object.keys(snap.before!).sort()).toEqual(copied.sort())
    for (const k of copied) expect(snap.before![k]).toBe(localStorage.getItem(k))
    const staging = prefixedStorage(localStorage, STAGING_PREFIX)
    expect(Object.keys(snap.after!)).toEqual(expect.arrayContaining(['alef-progress', 'alef-spellquest-he', 'alef-spellquest-en', 'alef-playtime',
      'alef-spellquest-he-telemetry', 'alef-spellquest-en-telemetry', chunkKey('alef-spellquest-en-telemetry', 30_000, 'se'), 'alef-tower-history-telemetry', MIGRATIONS_KEY]))
    expect(Object.keys(snap.after!).some((k) => k.startsWith(STAGING_PREFIX) || k.startsWith('alef-duel2') || k.startsWith('alef-english'))).toBe(false)
    for (const [k, v] of Object.entries(snap.after!)) if (k !== MIGRATIONS_KEY) expect(v).toBe(staging.getItem(k))
    expect(JSON.parse(snap.after![MIGRATIONS_KEY]!).done).toEqual(['spellquest-two-names', 'tower-history'])
  })

  it('deepEqual', () => {
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false)
    expect(deepEqual([1], { 0: 1 })).toBe(false)
  })
})
