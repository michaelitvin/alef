import { describe, expect, it, vi } from 'vitest'
import { MIGRATIONS_KEY, migrateKeys, plannedMoves, saveKeyFor } from './keyMigration'
import { STAGING_PREFIX, prefixedStorage } from './stagingStorage'
import { chunkKey, openJson, rollupKey } from './telemetryChunks'
import { decodeChunk, encodeChunk } from './telemetryCodec'
import type { TelemetryEvent } from './telemetry'

/** a Storage in memory that holds at most `limit` characters (keys and values), as a browser's quota does */
class FakeStorage implements Storage {
  limit = Infinity
  private m = new Map<string, string>()
  get length() { return this.m.size }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) {
    let used = 0
    for (const [a, b] of this.m) if (a !== k) used += a.length + b.length
    if (used + k.length + v.length > this.limit) throw new DOMException('full', 'QuotaExceededError')
    this.m.set(k, v)
  }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
  chars() { let n = 0; for (const [a, b] of this.m) n += a.length + b.length; return n }
  snapshot() { return Object.fromEntries([...this.m].sort()) }
}

const OLD = 'alef-duel2'
const NEW = 'alef-spellquest'
const events = (s: string, t0: number, n: number): TelemetryEvent[] =>
  Array.from({ length: n }, (_, i) => ({ t: t0 + i * 1000, s, run: 1, e: i === 0 ? 'start' : 'tap', g: 'book2', item: `x${i}` }))

const SESSIONS = [['sa', 1_760_000_000_000], ['sb', 1_760_100_000_000], ['sc', 1_760_200_000_000]] as const
const oldChunks = SESSIONS.map(([s, t0]) => { const evs = events(s, t0, 30); return { key: chunkKey(`${OLD}-telemetry`, t0, s), value: encodeChunk(evs), evs } })
const OPEN_EVENTS = events('sd', 1_760_300_000_000, 5)
const FROZEN = JSON.stringify({ v: 1, events: Array.from({ length: 400 }, (_, i) => ({ t: 1_750_000_000_000 + i, s: 'old', run: 1, e: 'tap' })) })
const ROLLUP = JSON.stringify({ v: 1, folded: [{ k: `${OLD}~aaa~sz-telemetry`, s: 'sz', t0: 1, t1: 2, n: 3, at: 4 }], dropped: 0, days: { '2026-11-01': { n: 3 } }, tails: { sz: 2 } })
const PLAYTIME = JSON.stringify({ v: 1, days: { '2026-11-20': { book2: 5000, clock: 100 }, '2026-11-21': { lessons: 7 } } })
const SAVE = JSON.stringify({ state: { stars: 3 }, version: 4 })

function fullSet(s: Storage) {
  s.setItem(OLD, SAVE)
  s.setItem('alef-playtime', PLAYTIME)
  s.setItem(rollupKey(`${OLD}-telemetry`), ROLLUP)
  for (const c of oldChunks) s.setItem(c.key, c.value)
  s.setItem(`${OLD}-telemetry`, openJson(OPEN_EVENTS, oldChunks.map((c) => c.key)))
  s.setItem('alef-duel-telemetry', FROZEN)
  s.setItem('alef-progress', '{"unrelated":1}')
}
const newKey = (k: string) => k.replace(`${OLD}~`, `${NEW}~`)

describe('migrateKeys', () => {
  it('has nothing to do on a fresh storage and writes the markers', () => {
    const s = new FakeStorage()
    const r = migrateKeys(s)
    expect(r.steps.map((x) => [x.id, x.status])).toEqual([['spellquest-rename', 'done'], ['tower-history', 'done']])
    expect(r.steps[0]!.keys.every((k) => k.status === 'absent')).toBe(true)
    expect(JSON.parse(s.getItem(MIGRATIONS_KEY)!)).toEqual({ v: 1, done: ['spellquest-rename', 'tower-history'] })
    expect(s.length).toBe(1)
  })

  it('moves every key of a full data set and keeps the values', () => {
    const s = new FakeStorage()
    fullSet(s)
    expect(plannedMoves(s).map((m) => m.from)).toEqual([OLD, `${OLD}~sum-telemetry`, ...oldChunks.map((c) => c.key), `${OLD}-telemetry`, 'alef-duel-telemetry'])
    const r = migrateKeys(s)
    expect(r.steps.map((x) => x.status)).toEqual(['done', 'done'])
    expect(s.getItem(OLD)).toBeNull()
    expect(s.getItem(NEW)).toBe(SAVE)
    const pt = JSON.parse(s.getItem('alef-playtime')!)
    expect(pt.days['2026-11-20']).toEqual({ spellquest: 5000, clock: 100 })
    expect(pt.days['2026-11-21']).toEqual({ lessons: 7 })
    for (const c of oldChunks) {
      expect(s.getItem(c.key)).toBeNull()
      expect(s.getItem(newKey(c.key))).toBe(c.value)
      expect(decodeChunk(s.getItem(newKey(c.key)))).toEqual(c.evs)
    }
    const roll = JSON.parse(s.getItem(rollupKey(`${NEW}-telemetry`))!)
    expect(roll.folded[0].k).toBe(`${NEW}~aaa~sz-telemetry`)
    expect(roll.days).toEqual({ '2026-11-01': { n: 3 } })
    const open = JSON.parse(s.getItem(`${NEW}-telemetry`)!)
    expect(open.sealed).toEqual(oldChunks.map((c) => newKey(c.key)))
    expect(open.events).toEqual(OPEN_EVENTS)
    expect(s.getItem('alef-tower-history-telemetry')).toBe(FROZEN)
    expect(s.getItem('alef-duel-telemetry')).toBeNull()
    expect(s.getItem('alef-progress')).toBe('{"unrelated":1}')
    expect(Object.keys(s.snapshot()).filter((k) => k.startsWith(OLD))).toEqual([])
    expect(JSON.parse(s.getItem(MIGRATIONS_KEY)!).done).toEqual(['spellquest-rename', 'tower-history'])
    expect(plannedMoves(s)).toEqual([])
  })

  it('changes nothing on a second run', () => {
    const s = new FakeStorage()
    fullSet(s)
    migrateKeys(s)
    const before = s.snapshot()
    const r = migrateKeys(s)
    expect(s.snapshot()).toEqual(before)
    expect(r.steps.map((x) => [x.status, x.keys.length])).toEqual([['done', 0], ['done', 0]])
  })

  it('resumes after a stop: an old chunk key put back is moved without a marker in between', () => {
    const s = new FakeStorage()
    fullSet(s)
    migrateKeys(s)
    // a run that stopped after the chunks and before the marker: the marker is gone and one old chunk is back
    s.removeItem(MIGRATIONS_KEY)
    s.setItem(oldChunks[1]!.key, oldChunks[1]!.value)
    s.removeItem(newKey(oldChunks[1]!.key))
    const r = migrateKeys(s)
    expect(r.steps[0]!.keys.filter((k) => k.status === 'moved').map((k) => k.from)).toEqual([oldChunks[1]!.key])
    expect(s.getItem(newKey(oldChunks[1]!.key))).toBe(oldChunks[1]!.value)
    expect(s.getItem(oldChunks[1]!.key)).toBeNull()
    expect(JSON.parse(s.getItem(`${NEW}-telemetry`)!).sealed).toEqual(oldChunks.map((c) => newKey(c.key)))
    expect(JSON.parse(s.getItem(MIGRATIONS_KEY)!).done).toEqual(['spellquest-rename', 'tower-history'])
  })

  it('removes the old key when both exist and are equal', () => {
    const s = new FakeStorage()
    s.setItem(OLD, SAVE)
    s.setItem(NEW, SAVE)
    const r = migrateKeys(s)
    expect(r.steps[0]!.keys[0]).toEqual({ from: OLD, to: NEW, status: 'already' })
    expect(s.getItem(OLD)).toBeNull()
  })

  it('keeps both keys and writes no marker on a conflict', () => {
    const s = new FakeStorage()
    s.setItem(OLD, SAVE)
    s.setItem(NEW, '{"other":1}')
    s.setItem('alef-duel-telemetry', FROZEN)
    const r = migrateKeys(s)
    expect(r.steps[0]!.status).toBe('conflict')
    expect(r.steps[0]!.keys[0]!.status).toBe('conflict')
    expect(s.getItem(OLD)).toBe(SAVE)
    expect(s.getItem(NEW)).toBe('{"other":1}')
    expect(JSON.parse(s.getItem(MIGRATIONS_KEY)!).done).toEqual(['tower-history']) // step 2 never waits for step 1
    expect(migrateKeys(s).steps[0]!.status).toBe('conflict')
  })

  it('waits for space when the frozen log does not fit, then finishes', () => {
    const s = new FakeStorage()
    fullSet(s)
    s.limit = s.chars() + 1000 // room for the small keys, not for a second copy of the frozen log
    const r = migrateKeys(s)
    expect(r.steps.map((x) => x.status)).toEqual(['done', 'waiting-space'])
    expect(r.steps[1]!.keys[0]!.status).toBe('waiting-space')
    expect(s.getItem('alef-duel-telemetry')).toBe(FROZEN)
    expect(s.getItem('alef-tower-history-telemetry')).toBeNull()
    expect(JSON.parse(s.getItem(MIGRATIONS_KEY)!).done).toEqual(['spellquest-rename'])
    expect(migrateKeys(s).steps[1]!.status).toBe('waiting-space')
    s.limit = Infinity
    expect(migrateKeys(s).steps.map((x) => x.status)).toEqual(['done', 'done'])
    expect(s.getItem('alef-tower-history-telemetry')).toBe(FROZEN)
    expect(s.getItem('alef-duel-telemetry')).toBeNull()
  })

  it('stops step 1 on no space, leaves the old keys, and resumes', () => {
    const s = new FakeStorage()
    fullSet(s)
    s.limit = s.chars() // no room for any copy
    const r = migrateKeys(s)
    expect(r.steps[0]!.status).toBe('waiting-space')
    expect(r.steps[0]!.keys).toHaveLength(1)
    expect(s.getItem(OLD)).toBe(SAVE)
    expect(s.getItem(NEW)).toBeNull()
    s.limit = Infinity
    expect(migrateKeys(s).steps.map((x) => x.status)).toEqual(['done', 'done'])
  })

  it('on a staging view touches only the prefixed keys', () => {
    const raw = new FakeStorage()
    fullSet(raw)
    const productionBefore = raw.snapshot()
    const staging = prefixedStorage(raw, STAGING_PREFIX)
    fullSet(staging)
    const r = migrateKeys(staging)
    expect(r.steps.map((x) => x.status)).toEqual(['done', 'done'])
    const after = raw.snapshot()
    for (const [k, v] of Object.entries(productionBefore)) expect(after[k]).toBe(v) // production's keys are as they were
    expect(raw.getItem(`${STAGING_PREFIX}${NEW}`)).toBe(SAVE)
    expect(raw.getItem(`${STAGING_PREFIX}${OLD}`)).toBeNull()
    expect(raw.getItem(`${STAGING_PREFIX}${MIGRATIONS_KEY}`)).not.toBeNull()
    expect(raw.getItem(NEW)).toBeNull()
    expect(raw.getItem(MIGRATIONS_KEY)).toBeNull()
  })
})

// A page of the old build that stays open (or comes back from the back-forward cache) after the new build migrated
// writes the old keys again. The next load finds them, even though the step is marked done.
describe('migrateKeys: a late write from an old page', () => {
  const LATE = JSON.stringify({ state: { stars: 5 }, version: 4 })
  const migrated = () => { const s = new FakeStorage(); fullSet(s); migrateKeys(s); return s }

  it('the old save written again over an untouched new save: the late write is newer and moves over it', () => {
    const s = migrated()
    expect(s.getItem(NEW)).toBe(SAVE)
    s.setItem(OLD, LATE)
    const r = migrateKeys(s)
    expect(r.steps[0]!.status).toBe('done')
    expect(r.steps[0]!.keys).toContainEqual({ from: OLD, to: NEW, status: 'moved' })
    expect(s.getItem(NEW)).toBe(LATE)
    expect(s.getItem(OLD)).toBeNull()
    // and again: the fingerprint follows the new value
    s.setItem(OLD, SAVE)
    migrateKeys(s)
    expect(s.getItem(NEW)).toBe(SAVE)
    expect(s.getItem(OLD)).toBeNull()
  })

  it('the old save written again while the new save changed too: both are kept, a conflict with the key names', () => {
    const s = migrated()
    s.setItem(NEW, JSON.stringify({ state: { stars: 7 }, version: 4 }))
    s.setItem(OLD, LATE)
    const r = migrateKeys(s)
    expect(r.steps[0]!.status).toBe('conflict')
    expect(r.steps[0]!.keys).toContainEqual({ from: OLD, to: NEW, status: 'conflict' })
    expect(s.getItem(OLD)).toBe(LATE)
    expect(s.getItem(NEW)).toBe(JSON.stringify({ state: { stars: 7 }, version: 4 }))
    expect(migrateKeys(s).steps[0]!.status).toBe('conflict') // never deletes either, on any later load
    expect(s.getItem(OLD)).toBe(LATE)
  })

  it('the old save written again with no new save: it moves as before', () => {
    const s = migrated()
    s.removeItem(NEW)
    s.setItem(OLD, LATE)
    expect(migrateKeys(s).steps[0]!.status).toBe('done')
    expect(s.getItem(NEW)).toBe(LATE)
    expect(s.getItem(OLD)).toBeNull()
  })

  it('a sealed chunk and the play time of an old page move too', () => {
    const s = migrated()
    const evs = events('se', 1_760_400_000_000, 4)
    const k = chunkKey(`${OLD}-telemetry`, 1_760_400_000_000, 'se')
    s.setItem(k, encodeChunk(evs))
    s.setItem('alef-playtime', JSON.stringify({ v: 1, days: { '2026-11-20': { book2: 1000, spellquest: 5000 } } }))
    expect(migrateKeys(s).steps[0]!.status).toBe('done')
    expect(s.getItem(k)).toBeNull()
    expect(decodeChunk(s.getItem(newKey(k)))).toEqual(evs)
    expect(JSON.parse(s.getItem('alef-playtime')!).days['2026-11-20']).toEqual({ spellquest: 6000 })
  })

  it('an old open chunk next to the new one: its events become sealed chunks of the new log, listed in the open chunk', () => {
    const s = migrated()
    const newOpen = events('sf', 1_760_600_000_000, 3)
    s.setItem(`${NEW}-telemetry`, openJson(newOpen, oldChunks.map((c) => newKey(c.key))))
    const late = [...events('se', 1_760_500_000_000, 3), ...events('sg', 1_760_550_000_000, 2)]
    s.setItem(`${OLD}-telemetry`, openJson(late, oldChunks.map((c) => c.key)))
    const r = migrateKeys(s)
    expect(r.steps[0]!.status).toBe('done')
    expect(s.getItem(`${OLD}-telemetry`)).toBeNull()
    const kE = chunkKey(`${NEW}-telemetry`, 1_760_500_000_000, 'se')
    const kG = chunkKey(`${NEW}-telemetry`, 1_760_550_000_000, 'sg')
    expect(decodeChunk(s.getItem(kE))).toEqual(late.slice(0, 3))
    expect(decodeChunk(s.getItem(kG))).toEqual(late.slice(3))
    const open = JSON.parse(s.getItem(`${NEW}-telemetry`)!)
    expect(open.events).toEqual(newOpen)
    expect(open.sealed).toEqual([...oldChunks.map((c) => newKey(c.key)), kE, kG])
    expect(migrateKeys(s).steps[0]!.status).toBe('done')
  })

  it('an old open chunk that cannot be sealed for space stays, and goes on the next load', () => {
    const s = migrated()
    s.setItem(`${NEW}-telemetry`, openJson(events('sf', 1_760_600_000_000, 3), []))
    const late = events('se', 1_760_500_000_000, 3)
    s.setItem(`${OLD}-telemetry`, openJson(late, []))
    s.limit = s.chars()
    expect(migrateKeys(s).steps[0]!.status).toBe('waiting-space')
    expect(s.getItem(`${OLD}-telemetry`)).toBe(openJson(late, []))
    expect(JSON.parse(s.getItem(`${NEW}-telemetry`)!).sealed ?? []).toEqual([])
    s.limit = Infinity
    expect(migrateKeys(s).steps[0]!.status).toBe('done')
    expect(decodeChunk(s.getItem(chunkKey(`${NEW}-telemetry`, 1_760_500_000_000, 'se')))).toEqual(late)
  })

  it('reads only a few keys when nothing old is back', () => {
    const s = migrated()
    let reads = 0
    const spy: Storage = { get length() { reads += 100; return s.length }, key: (i) => { reads += 100; return s.key(i) }, getItem: (k) => { reads++; return s.getItem(k) }, setItem: (k, v) => s.setItem(k, v), removeItem: (k) => s.removeItem(k), clear: () => s.clear() }
    const before = s.snapshot()
    migrateKeys(spy)
    expect(reads).toBeLessThanOrEqual(6)
    expect(s.snapshot()).toEqual(before)
  })
})

// A save move that fails for space: until it moves, the save store reads and writes the old key (never a fresh save
// under the new key next to it).
describe('saveKeyFor: a save waiting for space', () => {
  const full = () => { const s = new FakeStorage(); fullSet(s); s.limit = s.chars(); return s }

  it('frees telemetry once and moves the save, then uses the new key', () => {
    const s = full()
    expect(migrateKeys(s).steps[0]!.status).toBe('waiting-space')
    const freeSpace = vi.fn(() => { s.removeItem(oldChunks[0]!.key); s.removeItem(oldChunks[1]!.key); return 1 })
    expect(saveKeyFor(s, NEW, freeSpace)).toBe(NEW)
    expect(freeSpace).toHaveBeenCalledTimes(1)
    expect(s.getItem(NEW)).toBe(SAVE)
    expect(s.getItem(OLD)).toBeNull()
  })

  it('still no room: the old key; the store writes it; the next load with room moves it (no conflict, nothing lost)', () => {
    const s = full()
    migrateKeys(s)
    const freeSpace = vi.fn(() => 0)
    expect(saveKeyFor(s, NEW, freeSpace)).toBe(OLD)
    expect(freeSpace).toHaveBeenCalledTimes(1)
    expect(s.getItem(NEW)).toBeNull()
    s.limit = Infinity
    const played = JSON.stringify({ state: { stars: 4 }, version: 5 })
    s.setItem(OLD, played) // the store's write
    const r = migrateKeys(s)
    expect(r.steps[0]!.status).toBe('done')
    expect(s.getItem(OLD)).toBeNull()
    expect(s.getItem(NEW)).toBe(played)
  })

  it('the new key when it is there or when there is no old key; a key that does not move is itself', () => {
    const s = new FakeStorage()
    expect(saveKeyFor(s, NEW)).toBe(NEW)
    s.setItem(NEW, 'n')
    s.setItem(OLD, 'o')
    expect(saveKeyFor(s, NEW)).toBe(NEW)
    expect(saveKeyFor(s, 'alef-english')).toBe('alef-english')
  })
})
