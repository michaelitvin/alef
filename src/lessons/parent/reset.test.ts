// The lessons' reset clears the reading course only: the tower's history (`tower` in the same save) stays.
import { beforeEach, describe, expect, it } from 'vitest'
import { lessonsParent } from '.'
import { useProgressStore } from '../../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../../types/progress'

describe('the lessons\' reset', () => {
  beforeEach(() => { localStorage.clear(); useProgressStore.setState({ ...INITIAL_PROGRESS_STATE }) })

  it('clears the lessons and keeps the tower\'s history, in the store and in the save', async () => {
    const tower = { ...INITIAL_PROGRESS_STATE.tower, sessions: 7, bestScore: 4321, byMark: { kamatz: { seen: 3, correct: 2, wrong: 1, timeout: 0, twin: 0, mega: 0 } } }
    useProgressStore.setState({ tower: tower, stats: { ...INITIAL_PROGRESS_STATE.stats, lettersLearned: 5, totalAttempts: 40 } })
    await lessonsParent.reset()
    const st = useProgressStore.getState()
    expect(st.stats.lettersLearned).toBe(0)
    expect(st.stats.totalAttempts).toBe(0)
    expect(st.tower).toEqual(tower)
    const saved = JSON.parse(localStorage.getItem('alef-progress')!).state
    expect(saved.tower.sessions).toBe(7)
    expect(saved.stats.lettersLearned).toBe(0)
  })
})
