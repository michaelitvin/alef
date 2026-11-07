import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
// a child build (no test hooks): the stroke review opens only through the parent area
vi.mock('../testHooks', () => ({ TEST_HOOKS: false }))
vi.mock('../assets/preload', () => ({ READY_MS: 8000, preloadDuel2Assets: () => new Promise(() => {}) }))
import Duel2App from '../Duel2App'

describe('stroke review link', () => {
  it('#/strokes does not skip the parent gate in a child build', () => {
    location.hash = '#/strokes'
    const { container } = render(<Duel2App />)
    expect(container.querySelector('[data-strokes-page]')).toBeNull()
    expect(container.querySelector('[data-screen="cover"]')).not.toBeNull()
    location.hash = ''
  })
})
