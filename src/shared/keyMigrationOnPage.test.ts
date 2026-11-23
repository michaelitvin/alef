// The key migration on real pages: an old page (from before the release) that writes the old keys after the new build
// migrated, and a save whose move waits for space. Nothing the child did is lost.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openJson } from './telemetryChunks'

const SAVE = (coins: number) => JSON.stringify({ state: { screensOpen: true, towerImported: true, stage: { stage: 2 }, coins, settings: { range: 100 } }, version: 7 })
const ev = (t: number, s: string) => ({ t, s, run: 1, e: 'answer', g: 'spellquest' })

describe('the key migration on the page', () => {
  const real = Object.getOwnPropertyDescriptor(window, 'localStorage')
  beforeEach(() => { localStorage.clear(); vi.resetModules() })
  afterEach(() => { if (real) Object.defineProperty(window, 'localStorage', real); vi.unstubAllGlobals(); localStorage.clear() })

  it('an old page that writes the old keys after the migration: the next load keeps its run', async () => {
    localStorage.setItem('alef-duel2', SAVE(1))
    localStorage.setItem('alef-duel2-telemetry', openJson([ev(1_000, 'sa')] as never, []))
    await import('./stagingStorage') // the new build's home page: it migrates
    expect(localStorage.getItem('alef-duel2')).toBeNull()
    expect(localStorage.getItem('alef-spellquest-he')).toBe(SAVE(1))
    // the new build writes its own log; then Back: the old page (old code in memory) plays a run
    localStorage.setItem('alef-spellquest-he-telemetry', openJson([ev(1_000, 'sa'), ev(2_000, 'sb')] as never, []))
    localStorage.setItem('alef-duel2', SAVE(9))
    localStorage.setItem('alef-duel2-telemetry', openJson([ev(5_000, 'sc'), ev(6_000, 'sc')] as never, []))
    vi.resetModules()
    await import('./stagingStorage') // the next load
    const { lastMigrationReport } = await import('./stagingStorage')
    expect(lastMigrationReport()!.steps[0]!.status).toBe('done')
    expect(localStorage.getItem('alef-duel2')).toBeNull()
    expect(localStorage.getItem('alef-duel2-telemetry')).toBeNull()
    const { useSpellQuestStore } = await import('../spellquest/store')
    expect(useSpellQuestStore.getState().coins).toBe(9)
    const { readLog } = await import('./telemetry')
    expect(readLog('alef-spellquest-he-telemetry').map((e) => e.t)).toEqual([1_000, 2_000, 5_000, 6_000])
  })

  it('a save whose move waits for space: the store reads it from the old key and writes there, the next load moves it', async () => {
    const inner = window.localStorage
    let full = true
    const fake: Storage = {
      get length() { return inner.length }, key: (i) => inner.key(i), getItem: (k) => inner.getItem(k), removeItem: (k) => inner.removeItem(k), clear: () => inner.clear(),
      setItem: (k, v) => { if (full && k === 'alef-spellquest-he') throw new DOMException('full', 'QuotaExceededError'); inner.setItem(k, v) },
    }
    Object.defineProperty(window, 'localStorage', { value: fake, configurable: true })
    vi.stubGlobal('localStorage', fake)
    inner.setItem('alef-duel2', SAVE(3))
    const { lastMigrationReport } = await import('./stagingStorage')
    expect(lastMigrationReport()!.steps[0]!.status).toBe('waiting-space')
    const { useSpellQuestStore } = await import('../spellquest/store')
    expect(useSpellQuestStore.getState().coins).toBe(3) // not a fresh save
    useSpellQuestStore.setState({ coins: 5 })
    expect(inner.getItem('alef-spellquest-he')).toBeNull()
    expect(JSON.parse(inner.getItem('alef-duel2')!).state.coins).toBe(5)
    full = false
    vi.resetModules()
    const next = await import('./stagingStorage')
    expect(next.lastMigrationReport()!.steps[0]!.status).toBe('done')
    expect(inner.getItem('alef-duel2')).toBeNull()
    expect(JSON.parse(inner.getItem('alef-spellquest-he')!).state.coins).toBe(5)
  })
})
