// Spell Quest's developer screens, which the parent area's Developer section opens: the screen gallery, the stroke review and
// the drawing test board.
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Gallery, GALLERY } from './Gallery'
import { Strokes } from './Strokes'
import { DrawTest } from './DrawTest'
import { STROKES } from '../data/strokes'
import { WORDS } from '../data/words'
import { useSpellQuestStore } from '../store'

describe('Spell Quest\'s developer screens (opened from the parent area)', () => {
  afterEach(() => vi.restoreAllMocks())
  it('gallery lists every screen and stage', () => {
    const { container } = render(<Gallery onBack={() => {}} onStart={() => {}} />)
    const ids = [...container.querySelectorAll('[data-entry]')].map((e) => e.getAttribute('data-entry'))
    expect(ids).toEqual(['tower', 'tower-boss', 'broom-letter', 'broom-syllable', 'cauldron', 'ladder-vowel', 'ladder-letter', 'ladder-dot', 'ghosts-letter', 'ghosts-syllable', 'draw-print', 'draw-hand', 'doors', 'spell', 'crystal', 'dot-intro', 'boss-dot', 'boss-shin', 'boss-mimic', 'boss-bat', 'merchant'])
    expect(GALLERY.every((e) => e.force.demo !== false)).toBe(true)
  })
  it('the gallery has one entry per boss kind (at a stage that opens it) and one for the potion', () => {
    expect(GALLERY.find((e) => e.id === 'boss-dot')!.force).toMatchObject({ screen: 'broom', boss: 'dot', stage: 3, kind: 'syllable' })
    expect(GALLERY.find((e) => e.id === 'boss-mimic')!.force).toMatchObject({ screen: 'broom', boss: 'mimic', stage: 2 })
    expect(GALLERY.find((e) => e.id === 'potion')).toBeUndefined()
  })
  it('the gallery has the tower: two waves, and its boss', () => {
    expect(GALLERY.find((e) => e.id === 'tower')!.force).toMatchObject({ screen: 'tower' })
    expect(GALLERY.find((e) => e.id === 'tower-boss')!.force).toMatchObject({ screen: 'tower', towerBoss: true })
  })
  it('the gallery has the merchant, with his demo', () => {
    expect(GALLERY.find((e) => e.id === 'merchant')!.force).toMatchObject({ screen: 'merchant', demo: true })
  })
  it('an entry starts its screen', () => {
    const onStart = vi.fn()
    render(<Gallery onBack={() => {}} onStart={onStart} />)
    fireEvent.click(screen.getByText(/Ladder — the dot/))
    expect(onStart.mock.calls[0][0].force).toMatchObject({ screen: 'ladder', fixed: 'dot', stage: 3 })
  })
  it('the stroke review shows every letter in both scripts, with each variant, and keeps the marks', () => {
    const { container } = render(<Strokes onBack={() => {}} />)
    fireEvent.click(screen.getByText('Both'))
    expect(container.querySelectorAll('[data-stroke-card]').length).toBe(STROKES.length)
    expect(container.querySelectorAll('[data-stroke-card="ם-print"] svg[data-variant]').length).toBe(2)
    expect(container.querySelectorAll('[data-stroke-card="ד-print"] [data-stroke-number]').length).toBe(2)
    // the alternatives are shown too (the parent checks them), the first is the one the hand teaches
    expect(container.querySelectorAll('[data-stroke-card="מ-print"] svg[data-variant]').length).toBe(3)
    expect(container.querySelector('[data-stroke-card="מ-print"] [data-variant-label="1"]')!.textContent).toMatch(/taught/)
    expect(container.querySelector('[data-stroke-card="מ-print"] [data-variant-label="2"]')!.textContent).toMatch(/also/)
    // פ in one stroke from the centre (the parent): print פ ף and handwriting פ show it as a second form
    for (const card of ['פ-print', 'ף-print', 'פ-hand']) {
      expect(container.querySelectorAll(`[data-stroke-card="${card}"] svg[data-variant]`).length, card).toBe(2)
      expect(container.querySelector(`[data-stroke-card="${card}"] [data-variant-label="2"]`)!.textContent, card).toMatch(/also/)
    }
    // handwriting shows a second, upright school font next to the game's font
    expect(container.querySelector('[data-stroke-card="ל-hand"] [data-ref-glyph="Dana Yad"]')).not.toBeNull()
    // the letters drawn after Dana Yad show it as the main reference (big), the game's font small below
    expect(container.querySelector('[data-stroke-card="ב-hand"] [data-ref-glyph="Dana Yad"]')!.getAttribute('data-main')).toBe('1')
    expect(container.querySelector('[data-stroke-card="ל-hand"] [data-ref-glyph="Ktav Yad"]')!.getAttribute('data-main')).toBe('1')
    // the game writes the words in Dana Yad: that glyph is marked as the game's font
    expect(container.querySelector('[data-stroke-card="ל-hand"] [data-ref-glyph="Dana Yad"]')!.getAttribute('data-game')).toBe('1')
    fireEvent.click(container.querySelector('[data-stroke-card="ד-print"] [data-mark-ok]')!)
    expect(useSpellQuestStore.getState().strokeMarks['ד-print']).toBe('ok')
    expect(container.querySelector('[data-reviewed]')!.textContent).toMatch(/1 of 54/)
  }, 30_000)
  it('the stroke review has a Words section: every game word in print and handwriting on the lines, its first letter also from the taught strokes', () => {
    const { container } = render(<Strokes onBack={() => {}} />)
    fireEvent.click(screen.getByText('Words'))
    const cards = container.querySelectorAll('[data-word-card]')
    expect(cards.length).toBe(WORDS.length)
    for (const c of cards) for (const sc of ['print', 'hand']) {
      expect(c.querySelector(`[data-word-font="${sc}"] text`), sc).not.toBeNull()
      expect(c.querySelector(`[data-word-taught="${sc}"] [data-taught-letter] polyline`), sc).not.toBeNull()
    }
    expect((container.querySelector('[data-word-card="camel"] [data-word-font="hand"] text') as SVGTextElement).style.fontFamily).toMatch(/Dana Yad/)
  }, 30_000)
  it('the test board judges a stroke and lists its verdict', () => {
    const { container } = render(<DrawTest onBack={() => {}} />)
    const pad = container.querySelector('[data-draw-pad]')!
    fireEvent.pointerDown(pad, { pointerId: 1, clientX: 300, clientY: 400 })
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: 300, clientY: 700 })
    fireEvent.pointerUp(pad, { pointerId: 1, clientX: 300, clientY: 700 })
    expect(container.querySelector('[data-verdicts] li')!.textContent).toMatch(/stroke 1: wrong/)
  })
})
