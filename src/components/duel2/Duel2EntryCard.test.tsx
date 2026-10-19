import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Duel2EntryCard } from './Duel2EntryCard'

describe('Duel2EntryCard', () => {
  it('renders a link to duel2/', () => {
    render(<Duel2EntryCard />)
    expect(screen.getByLabelText('book 2').getAttribute('href')).toMatch(/duel2\/$/)
  })
  it('has no text', () => {
    render(<Duel2EntryCard />)
    expect(screen.getByLabelText('book 2').textContent?.trim()).toBe('')
  })
})
