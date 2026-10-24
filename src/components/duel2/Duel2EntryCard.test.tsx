import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Duel2EntryCard } from './Duel2EntryCard'

describe('Duel2EntryCard', () => {
  it('renders a link to duel2/', () => {
    render(<Duel2EntryCard />)
    expect(screen.getByLabelText('book 2').getAttribute('href')).toMatch(/duel2\/$/)
  })
  it('shows the game: the broom wizard and an orb with a syllable (the duel card shows its wizard too)', () => {
    const { container } = render(<Duel2EntryCard />)
    expect(container.querySelector('img[data-art="wizbroom"]')!.getAttribute('src')).toMatch(/s-wizbroom/)
    expect(container.querySelectorAll('[data-orb]').length).toBeGreaterThan(0)
    expect(container.querySelector('[data-glyph]')!.textContent).toBe('בָּ'.normalize('NFC'))
  })
  it('has no text but the syllables', () => {
    const { container } = render(<Duel2EntryCard />)
    const c = container.cloneNode(true) as Element
    c.querySelectorAll('[data-glyph]').forEach((e) => e.remove())
    expect(c.textContent?.trim()).toBe('')
  })
})
