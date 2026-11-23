// Page level (T6a): a storage with the OLD keys, after stagingStorage's install, reads through the stores with the new
// keys; old ids inside events read as the new ids; ?copy-prod hands production's old or new keys to the migration.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STAGING_PREFIX } from './stagingPrefix'
import type { TelemetryEvent } from './telemetry'

const open = (events: TelemetryEvent[]) => JSON.stringify({ v: 1, events, sealed: [] })
const T = 1_760_000_000_000
const OLD_LOG = open([{ t: T, s: 'a', run: 1, e: 'round', g: 'book2', target: 'bet' }, { t: T + 1, s: 'a', run: 1, e: 'round', g: 'book2', via: 'tower', visit: 1 }])
const OLD_FROZEN = open([{ t: T - 5, s: 'old', run: 0, e: 'round' }, { t: T - 4, s: 'old', run: 0, e: 'round', g: 'duel' }])
const OLD_SAVE = JSON.stringify({ state: { totalStars: 42 }, version: 8 })
const OLD_PROGRESS = JSON.stringify({ state: { duel: { roundsMs: 123 } }, version: 0 })
const PLAYTIME = JSON.stringify({ v: 1, days: { '2026-11-10': { book2: 60_000, clock: 5_000 } } })

function seedOld(s: Storage) {
  s.setItem('alef-duel2', OLD_SAVE)
  s.setItem('alef-duel2-telemetry', OLD_LOG)
  s.setItem('alef-duel-telemetry', OLD_FROZEN)
  s.setItem('alef-progress', OLD_PROGRESS)
  s.setItem('alef-playtime', PLAYTIME)
}

async function readThroughNewCode() {
  const { useSpellQuestStore } = await import('../spellquest/store')
  const { useProgressStore } = await import('../stores/progressStore')
  const { readPlaytime } = await import('./playtime')
  const { GAMES } = await import('../parent/registry')
  const { readLog } = await import('./telemetryChunks')
  const sq = GAMES.find((g) => g.id === 'spellquest-he')!
  return {
    stars: useSpellQuestStore.getState().totalStars,
    tower: (useProgressStore.getState() as unknown as { tower: { roundsMs: number } }).tower.roundsMs,
    days: readPlaytime().days['2026-11-10'],
    logKeys: sq.logs!.map((l) => l.key),
    spellquest: readLog(sq.logs![0]!.key).map((e) => e.g),
    history: readLog(sq.logs![1]?.key ?? 'x').map((e) => e.g),
  }
}

describe('the rename on a page', () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules() })

  it('production: old keys read through the stores under the new keys', async () => {
    seedOld(localStorage)
    const { runKeyMigration, lastMigrationReport } = await import('./stagingStorage')
    runKeyMigration(localStorage)
    expect(lastMigrationReport()!.steps.map((s) => s.status)).toEqual(['done', 'done'])
    expect(localStorage.getItem('alef-duel2')).toBeNull()
    expect(localStorage.getItem('alef-duel-telemetry')).toBeNull()
    const r = await readThroughNewCode()
    expect(r.stars).toBe(42)
    expect(r.tower).toBe(123)
    expect(r.days).toEqual({ 'spellquest-he': 60_000, clock: 5_000 })
    expect(r.logKeys).toEqual(['alef-spellquest-he-telemetry', 'alef-tower-history-telemetry'])
    expect(r.spellquest).toEqual(['spellquest-he', 'spellquest-he'])
    expect(r.history).toEqual([undefined, 'duel']) // the frozen log is read as stored (ADR 0004); the alias table maps it where a reader asks
  })

  it('staging: the install migrates the prefixed view only', async () => {
    const { installStagingStorage, prefixedStorage } = await import('./stagingStorage') // (a production page migrates on import)
    localStorage.setItem('alef-duel2', 'production, untouched')
    seedOld(prefixedStorage(localStorage, STAGING_PREFIX))
    const win = { location: { href: 'https://example.test/alef/staging/' }, localStorage, confirm: () => false, history: { replaceState: () => {} } } as unknown as Window
    installStagingStorage(win)
    expect(win.localStorage.getItem('alef-spellquest-he')).toBe(OLD_SAVE)
    expect(localStorage.getItem(STAGING_PREFIX + 'alef-duel2')).toBeNull()
    expect(localStorage.getItem('alef-duel2')).toBe('production, untouched')
    expect(localStorage.getItem('alef-spellquest-he')).toBeNull()
  })

  it('a second run after the marker reads 11 keys (the marker, playtime, then per old name its save, open chunk and roll-up: the keys an old page could write again) and changes nothing', async () => {
    seedOld(localStorage)
    const { runKeyMigration } = await import('./stagingStorage')
    runKeyMigration(localStorage)
    const before = JSON.stringify({ ...localStorage })
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    runKeyMigration(localStorage)
    expect(getItem).toHaveBeenCalledTimes(11)
    getItem.mockRestore()
    expect(JSON.stringify({ ...localStorage })).toBe(before)
  })

  it('?copy-prod copies production\'s old keys under their old names (the migration then moves them), and new keys as they are', async () => {
    seedOld(localStorage)
    localStorage.setItem('alef-spellquest-he', OLD_SAVE)
    const { installStagingStorage } = await import('./stagingStorage')
    const win = { location: { href: 'https://example.test/alef/staging/?copy-prod' }, localStorage, confirm: () => true, history: { replaceState: () => {} } } as unknown as Window
    installStagingStorage(win)
    expect(localStorage.getItem(STAGING_PREFIX + 'alef-spellquest-he')).toBe(OLD_SAVE)
    expect(localStorage.getItem(STAGING_PREFIX + 'alef-duel2')).toBeNull() // moved on after the copy
    expect(localStorage.getItem(STAGING_PREFIX + 'alef-progress')).toBe(OLD_PROGRESS)
    expect(localStorage.getItem(STAGING_PREFIX + 'alef-duel2-telemetry')).toBeNull() // no log is copied
  })
})
