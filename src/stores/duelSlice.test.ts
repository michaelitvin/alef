import { describe, it, expect, beforeEach } from 'vitest'
import { useProgressStore, duelMusicOn } from './progressStore'
import { INITIAL_PROGRESS_STATE } from '../types/progress'

beforeEach(() => {
  localStorage.clear()
  useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
})

describe('duel slice', () => {
  it('records sessions, rounds, twins, run ends', () => {
    const st = useProgressStore.getState()
    st.recordDuelSession()
    st.recordDuelRound('kamatz', 'A', 'correct', 1200)
    st.recordDuelRound('kamatz', 'C', 'wrong', 800)
    st.recordDuelRound('segol', 'D', 'mega', 500)
    st.recordDuelTwin('kamatz', 'C')
    st.recordDuelRunEnd(900, 4)
    st.recordDuelRunEnd(300, 2)
    const d = useProgressStore.getState().duel
    expect(d.sessions).toBe(1)
    expect(d.roundsMs).toBe(2500)
    expect(d.byMark.kamatz).toEqual({ seen: 2, correct: 1, wrong: 1, timeout: 0, twin: 1, mega: 0 })
    expect(d.byMark.segol.mega).toBe(1)
    expect(d.byMark.segol.correct).toBe(0)
    expect(d.byType.C).toEqual({ seen: 1, correct: 0, wrong: 1, timeout: 0, twin: 1, mega: 0 })
    expect(d.bestScore).toBe(900)
    expect(d.bestWave).toBe(4)
    expect(d.lastPlayed).toBeTypeOf('number')
  })
  it('records directional confusions: confusions[asked][tapped]', () => {
    const st = useProgressStore.getState()
    st.recordDuelConfusion('segol', 'chirik')
    st.recordDuelConfusion('segol', 'chirik')
    st.recordDuelConfusion('chirik', 'segol')
    expect(useProgressStore.getState().duel.confusions).toEqual({ segol: { chirik: 2 }, chirik: { segol: 1 } })
  })
  it('persists the duel slice', () => {
    useProgressStore.getState().recordDuelSession()
    const saved = JSON.parse(localStorage.getItem('alef-progress')!)
    expect(saved.state.duel.sessions).toBe(1)
  })
  it('an old save without duel/duelMusic loads with empty stats and music on', async () => {
    const old = { ...INITIAL_PROGRESS_STATE, settings: { ...INITIAL_PROGRESS_STATE.settings, backgroundMusic: false } } as Record<string, unknown>
    delete old.duel
    delete (old.settings as Record<string, unknown>).duelMusic
    localStorage.setItem('alef-progress', JSON.stringify({ state: old, version: 0 }))
    await useProgressStore.persist.rehydrate()
    const s = useProgressStore.getState()
    expect(s.duel.sessions).toBe(0)
    expect(s.duel.byMark).toEqual({})
    expect(duelMusicOn(s.settings)).toBe(true)
  })
  it('a save with an explicit undefined duel still loads empty stats', async () => {
    localStorage.setItem('alef-progress', JSON.stringify({ state: { ...INITIAL_PROGRESS_STATE, duel: null }, version: 0 }))
    await useProgressStore.persist.rehydrate()
    expect(useProgressStore.getState().duel.sessions).toBe(0)
  })
  it('setDuelMusic toggles', () => {
    useProgressStore.getState().setDuelMusic(false)
    expect(duelMusicOn(useProgressStore.getState().settings)).toBe(false)
    useProgressStore.getState().setDuelMusic(true)
    expect(duelMusicOn(useProgressStore.getState().settings)).toBe(true)
  })
})
