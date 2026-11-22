import { describe, it, expect, beforeEach } from 'vitest'
import { useProgressStore } from './progressStore'
import { INITIAL_PROGRESS_STATE } from '../types/progress'

beforeEach(() => {
  localStorage.clear()
  useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
})

describe('duel slice', () => {
  it('records rounds and twins', () => {
    const st = useProgressStore.getState()
    st.recordDuelRound('kamatz', 'A', 'correct', 1200)
    st.recordDuelRound('kamatz', 'C', 'wrong', 800)
    st.recordDuelRound('segol', 'D', 'mega', 500)
    st.recordDuelTwin('kamatz', 'C')
    const d = useProgressStore.getState().tower
    expect(d.roundsMs).toBe(2500)
    expect(d.byMark.kamatz).toEqual({ seen: 2, correct: 1, wrong: 1, timeout: 0, twin: 1, mega: 0 })
    expect(d.byMark.segol.mega).toBe(1)
    expect(d.byMark.segol.correct).toBe(0)
    expect(d.byType.C).toEqual({ seen: 1, correct: 0, wrong: 1, timeout: 0, twin: 1, mega: 0 })
  })
  it('records directional confusions: confusions[asked][tapped]', () => {
    const st = useProgressStore.getState()
    st.recordDuelConfusion('segol', 'chirik')
    st.recordDuelConfusion('segol', 'chirik')
    st.recordDuelConfusion('chirik', 'segol')
    expect(useProgressStore.getState().tower.confusions).toEqual({ segol: { chirik: 2 }, chirik: { segol: 1 } })
  })
  it('keeps each mark\'s last 12 answers, newest last (x = wrong or too slow, o = right)', () => {
    const st = useProgressStore.getState()
    st.recordDuelRound('segol', 'A', 'correct', 100)
    st.recordDuelRound('segol', 'A', 'wrong', 100)
    st.recordDuelRound('segol', 'B', 'timeout', 100)
    st.recordDuelRound('segol', 'C', 'mega', 100)
    expect(useProgressStore.getState().tower.recent).toEqual({ segol: 'oxxo' })
    for (let i = 0; i < 20; i++) st.recordDuelRound('kamatz', 'A', i % 2 ? 'wrong' : 'correct', 100)
    expect(useProgressStore.getState().tower.recent!.kamatz).toBe('oxoxoxoxoxox')
  })
  it('persists the duel slice', () => {
    useProgressStore.getState().recordDuelRound('kamatz', 'A', 'correct', 1200)
    const saved = JSON.parse(localStorage.getItem('alef-progress')!)
    expect(saved.state.tower.byMark.kamatz.correct).toBe(1)
  })
  it('an old save without duel/towerMusic loads with empty stats', async () => {
    const old = { ...INITIAL_PROGRESS_STATE, settings: { ...INITIAL_PROGRESS_STATE.settings, backgroundMusic: false } } as Record<string, unknown>
    delete old.tower
    delete (old.settings as Record<string, unknown>).towerMusic
    localStorage.setItem('alef-progress', JSON.stringify({ state: old, version: 0 }))
    await useProgressStore.persist.rehydrate()
    const s = useProgressStore.getState()
    expect(s.tower.sessions).toBe(0)
    expect(s.tower.byMark).toEqual({})
  })
  it('a save from the standalone duel page (its music switch, sessions and records) still loads', async () => {
    localStorage.setItem('alef-progress', '{"state":{"settings":{"soundEffects":true,"backgroundMusic":true,"volume":0.8,"animationSpeed":"normal","showHints":true,"devMode":false,"font":"default","duelMusic":false},"duel":{"sessions":4,"roundsMs":90000,"bestScore":900,"bestWave":6,"lastPlayed":1760000000000,"byMark":{},"byType":{}}},"version":0}')
    await useProgressStore.persist.rehydrate()
    const s = useProgressStore.getState()
    expect(s.settings.volume).toBe(0.8)
    expect(s.tower).toMatchObject({ sessions: 4, bestScore: 900, bestWave: 6 })
  })
  it('a save with an explicit undefined duel still loads empty stats', async () => {
    localStorage.setItem('alef-progress', JSON.stringify({ state: { ...INITIAL_PROGRESS_STATE, tower: null }, version: 0 }))
    await useProgressStore.persist.rehydrate()
    expect(useProgressStore.getState().tower.sessions).toBe(0)
  })
})
