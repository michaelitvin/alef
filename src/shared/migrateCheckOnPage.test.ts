// `?migrate-check` on a staging page: the check finishes before a store module evaluates, so a store imported after
// stagingStorage reads the post-check storage; the page reloads without the query; the result is stored.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { encodeChunk } from './telemetryCodec'
import { chunkKey, openJson } from './telemetryChunks'

const prod = window.localStorage
const OLD = 'alef-duel2-telemetry'

describe('?migrate-check on the page', () => {
  const real = Object.getOwnPropertyDescriptor(window, 'localStorage')
  beforeEach(() => { prod.clear(); vi.resetModules(); window.history.replaceState(null, '', '/?migrate-check&x=1') })
  afterEach(() => { if (real) Object.defineProperty(window, 'localStorage', real); window.history.replaceState(null, '', '/'); vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('a store imported after the check sees the migrated save; the reload drops the query; the result is stored', async () => {
    const { installStagingStorage, STAGING_PREFIX } = await import('./stagingStorage')
    // (a production page migrates on import, so production's old keys are put in after it)
    prod.setItem('alef-duel2', JSON.stringify({ state: { bookOpen: true, firstDuelImported: true, stage: { stage: 2 }, coins: 4, settings: { range: 100 } }, version: 7 }))
    const k = chunkKey(OLD, 1_000, 'sa')
    prod.setItem(k, encodeChunk([{ t: 1_000, s: 'sa', run: 1, e: 'answer', g: 'book2' }] as never))
    prod.setItem(OLD, openJson([], [k]))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const reload = vi.fn()
    const pending = installStagingStorage(window, reload)
    expect(pending).not.toBeNull()
    expect(reload).not.toHaveBeenCalled() // the check is still running; nothing else may start
    expect(await pending).toBe(true)
    expect(reload).toHaveBeenCalledWith(expect.stringMatching(/\/\?x=1$/)) // without ?migrate-check
    vi.stubGlobal('localStorage', window.localStorage) // in a browser the global is the window's (now the prefixed view)
    // a store module that evaluates now reads the post-check storage
    const { useSpellQuestStore } = await import('../spellquest/store')
    expect(useSpellQuestStore.getState().screensOpen).toBe(true)
    expect(useSpellQuestStore.getState().coins).toBe(4)
    expect(prod.getItem(`${STAGING_PREFIX}alef-duel2`)).toBeNull()
    expect(prod.getItem('alef-duel2')).not.toBeNull() // production untouched
    expect(JSON.parse(prod.getItem(`${STAGING_PREFIX}alef-migration-check`)!).verdict).toBe('pass')
  })

  it('a refused confirm runs nothing', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { installStagingStorage } = await import('./stagingStorage')
    expect(installStagingStorage(window, vi.fn())).toBeNull()
  })
})
