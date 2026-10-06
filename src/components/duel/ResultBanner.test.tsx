import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ResultBanner } from './ResultBanner'
import { RuneGlyph } from './RuneGlyph'
import { markById } from '../../utils/duel/marks'
import { wordsFor } from '../../utils/duel/words'

describe('ResultBanner', () => {
  it('marks which part is being spoken (sound → the vowel marks, name → the whole rune, word → the picture)', () => {
    for (const speaking of ['sound', 'name', 'word'] as const) {
      const { container, unmount } = render(<ResultBanner mark={markById('cholam')} word={wordsFor('o')[0]} kind="hit" speaking={speaking} />)
      expect(container.querySelector('.nd-resolve')!.getAttribute('data-speaking')).toBe(speaking)
      unmount()
    }
  })
  it('the rune separates its vowel marks (what is sounded) from the placeholder', () => {
    const { container } = render(<RuneGlyph mark={markById('holam-male')} />)
    expect(container.querySelector('.nd-rune-mark')).toBeTruthy()
    expect(container.querySelector('.nd-rune-mark circle, .nd-rune-mark polygon, .nd-rune-mark line')).toBeTruthy()
  })
  it('the dotted placeholder is faint and a different colour from the ink, so the mark dominates', () => {
    const { container } = render(<RuneGlyph mark={markById('segol')} />)
    const guide = container.querySelector('.nd-rune-guide')!
    const stroke = guide.getAttribute('stroke')!
    const alpha = Number(stroke.match(/rgba\([^)]*,\s*([\d.]+)\)/)![1])
    expect(alpha).toBeLessThanOrEqual(0.35)
    expect(stroke).not.toMatch(/^rgba\(255,\s*2[34]\d/) // not the warm ink tone
  })
})
