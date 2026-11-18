// A build where English cannot be opened (production until it is released): no English section and no English
// play-time column in the parent area.
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
vi.mock('../english/available', () => ({ ENGLISH_AVAILABLE: false, ENGLISH_RELEASED: false, englishAvailable: () => false }))
import { GAMES } from './registry'
import { ProgressSection } from './sections/Progress'

describe('the English gate closed', () => {
  it('the registry lists no English section', () => {
    expect(GAMES.map((g) => g.id)).toEqual(['book2', 'clock', 'lessons'])
  })
  it('the Progress table has no English column', () => {
    const { container } = render(<ProgressSection />)
    const heads = [...container.querySelectorAll('[data-playtime] th')].map((th) => th.textContent)
    expect(heads).toEqual(['Day', 'Book 2', 'Clock', 'Lessons'])
    expect(container.querySelector('[data-game="english"]')).toBeNull()
    expect(container.querySelector('[data-progress-game="english"]')).toBeNull()
  })
})
