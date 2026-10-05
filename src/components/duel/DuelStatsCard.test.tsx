import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DuelStatsCard } from './DuelStatsCard'
import { useProgressStore } from '../../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../../types/progress'

beforeEach(() => useProgressStore.setState({ ...INITIAL_PROGRESS_STATE }))

describe('DuelStatsCard', () => {
  it('shows an empty state before the first game', () => {
    render(<DuelStatsCard />)
    expect(screen.getByText('עוד לא שיחקו')).toBeTruthy()
  })
  it('sorts marks by misses and shows twin and MEGA columns', () => {
    const st = useProgressStore.getState()
    st.recordDuelSession()
    st.recordDuelRound('segol', 'A', 'wrong', 1000)
    st.recordDuelRound('segol', 'A', 'timeout', 1000)
    st.recordDuelRound('kamatz', 'C', 'correct', 1000)
    st.recordDuelTwin('kamatz', 'C')
    st.recordDuelRound('chirik', 'D', 'mega', 1000)
    const { container } = render(<DuelStatsCard />)
    const rows = [...container.querySelectorAll('tbody tr[data-mark]')].map((r) => r.getAttribute('data-mark'))
    expect(rows[0]).toBe('segol')
    expect(rows).toHaveLength(10)
    expect(container.querySelector('tr[data-mark="kamatz"] [data-col="twin"]')!.textContent).toBe('1')
    expect(container.querySelector('tr[data-mark="chirik"] [data-col="mega"]')!.textContent).toBe('1')
    expect(container.querySelector('tr[data-mark="chirik"] [data-col="correct"]')!.textContent).toBe('0%')
    expect(container.querySelector('tr[data-mark="shva"] [data-col="correct"]')!.textContent).toBe('—')
    expect(container.querySelector('tr[data-type="C"] [data-col="twin"]')!.textContent).toBe('1')
  })
})
