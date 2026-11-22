import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
vi.mock('../assets/preload', () => ({ READY_MS: 8000, preloadSpellQuestAssets: () => new Promise(() => {}) }))
import SpellQuestApp from '../SpellQuestApp'

describe('the tower glyph sheet (test builds)', () => {
  it('#/tower-glyphs shows the tower’s runes, monsters and icons for a visual check', () => {
    location.hash = '#/tower-glyphs'
    const { container } = render(<SpellQuestApp />)
    expect(container.querySelector('.nd-glyphs')).not.toBeNull()
    expect(container.querySelectorAll('.nd-rune').length).toBeGreaterThan(10)
    expect(container.querySelectorAll('svg[data-icon]').length).toBeGreaterThan(5)
    location.hash = ''
  })
})
