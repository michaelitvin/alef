// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest'
import { useProgressStore } from './progressStore'
import { INITIAL_PROGRESS_STATE } from '../types/progress'

const attempt = (correct: boolean) => ({ itemId: 'i', correct, timestamp: 1, timeMs: 0 })

beforeEach(() => {
  localStorage.clear()
  useProgressStore.setState({ ...INITIAL_PROGRESS_STATE, nodes: {} })
})

describe('the lessons save', () => {
  it('recordAttempt on a node nobody initialised keeps the attempt and the stats (a deep link or a reload on the node)', () => {
    useProgressStore.getState().recordAttempt('words-x', attempt(true))
    const s = useProgressStore.getState()
    expect(s.nodes['words-x'].attempts).toHaveLength(1)
    expect(s.nodes['words-x'].state).toBe('mastered')
    expect(s.stats.totalAttempts).toBe(1)
    expect(s.stats.totalCorrect).toBe(1)
  })

  it('setNodeState on a node nobody initialised creates it', () => {
    useProgressStore.getState().setNodeState('sentences-y', 'mastered')
    const n = useProgressStore.getState().nodes['sentences-y']
    expect(n.nodeId).toBe('sentences-y')
    expect(n.state).toBe('mastered')
    expect(n.attempts).toEqual([])
  })

  it('a mastered node stays mastered after one wrong attempt', () => {
    const st = useProgressStore.getState()
    st.initializeNode('letters-alef', 'letters')
    for (let i = 0; i < 4; i++) st.recordAttempt('letters-alef', attempt(true))
    expect(useProgressStore.getState().nodes['letters-alef'].state).toBe('mastered')
    st.recordAttempt('letters-alef', attempt(false))
    st.recordAttempt('letters-alef', attempt(false))
    const n = useProgressStore.getState().nodes['letters-alef']
    expect(n.successRate).toBeLessThan(0.8)
    expect(n.state).toBe('mastered')
  })

  it('a node under 80 % that is not mastered stays in progress', () => {
    const st = useProgressStore.getState()
    st.recordAttempt('words-z', attempt(false))
    expect(useProgressStore.getState().nodes['words-z'].state).toBe('in_progress')
  })
})
