import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { DuelEntryCard } from './DuelEntryCard'

describe('DuelEntryCard', () => {
  it('navigates to /duel and shows no text', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<DuelEntryCard />} />
          <Route path="/duel" element={<div>DUEL</div>} />
        </Routes>
      </MemoryRouter>,
    )
    const btn = screen.getByRole('button', { name: 'duel' })
    expect(btn.textContent).toBe('')
    fireEvent.click(btn)
    expect(screen.getByText('DUEL')).toBeTruthy()
  })
})
