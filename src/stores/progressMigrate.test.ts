// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { PROGRESS_PERSIST_VERSION, migrateProgress, renameTowerFieldsProgress } from './progressMigrate'
import { useProgressStore } from './progressStore'
import { INITIAL_PROGRESS_STATE } from '../types/progress'

const DUEL_STATS = {
  sessions: 4, roundsMs: 90000, bestScore: 900, bestWave: 6, lastPlayed: 1760000000000,
  byMark: { kamatz: { seen: 9, correct: 7, wrong: 1, timeout: 1, twin: 2, mega: 1 } },
  byType: { A: { seen: 5, correct: 4, wrong: 1, timeout: 0, twin: 0, mega: 0 } },
  confusions: { segol: { chirik: 2 } }, recent: { kamatz: 'ooxo' }, pace: 1.25,
}
const OLD = {
  version: 1, nodes: { a: { state: 'mastered' } }, stats: { totalAttempts: 40 },
  settings: { soundEffects: true, volume: 0.8, duelMusic: false },
  duel: DUEL_STATS,
}

describe('alef-progress version 1: the first duel becomes the tower', () => {
  beforeEach(() => { localStorage.clear(); useProgressStore.setState({ ...INITIAL_PROGRESS_STATE }) })

  it('moves duel and settings.duelMusic, keeping every value', () => {
    expect(renameTowerFieldsProgress(OLD)).toEqual({
      version: 1, nodes: { a: { state: 'mastered' } }, stats: { totalAttempts: 40 },
      settings: { soundEffects: true, volume: 0.8, towerMusic: false },
      tower: DUEL_STATS,
    })
  })
  it('is a no-op for a save with the new names, or with none', () => {
    const fresh = { settings: { volume: 1, towerMusic: true }, tower: DUEL_STATS }
    expect(renameTowerFieldsProgress(fresh)).toEqual(fresh)
    expect(renameTowerFieldsProgress({ settings: { volume: 1 } })).toEqual({ settings: { volume: 1 } })
    expect(renameTowerFieldsProgress(undefined)).toEqual({})
  })
  it('a save at the new persist version is unchanged', () => {
    const s = { tower: DUEL_STATS }
    expect(migrateProgress(s, PROGRESS_PERSIST_VERSION)).toBe(s)
  })
  it('the store loads an old save and reads the values through the new names', async () => {
    localStorage.setItem('alef-progress', JSON.stringify({ state: OLD, version: 0 }))
    await useProgressStore.persist.rehydrate()
    const s = useProgressStore.getState()
    expect(s.tower).toMatchObject({ sessions: 4, bestScore: 900, recent: { kamatz: 'ooxo' }, pace: 1.25 })
    expect(s.settings.towerMusic).toBe(false)
    expect((s as unknown as Record<string, unknown>).duel).toBeUndefined()
    expect(JSON.parse(localStorage.getItem('alef-progress')!).version).toBe(PROGRESS_PERSIST_VERSION)
  })
})
