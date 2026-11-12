import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Gallery, GALLERY } from './Gallery'
import { Parent } from './Parent'
import { Strokes } from './Strokes'
import { DrawTest } from './DrawTest'
import { STROKES } from '../data/strokes'
import { WORDS } from '../data/words'
import { useDuel2Store } from '../store'
import { clearGender, getPlayer } from '../../shared/player'
import { duel2Telemetry } from '../telemetry'

describe('parent area', () => {
  afterEach(() => vi.restoreAllMocks())
  it('gallery lists every screen and stage', () => {
    const { container } = render(<Gallery onBack={() => {}} onStart={() => {}} />)
    const ids = [...container.querySelectorAll('[data-entry]')].map((e) => e.getAttribute('data-entry'))
    expect(ids).toEqual(['broom-letter', 'broom-syllable', 'cauldron', 'ladder-vowel', 'ladder-letter', 'ladder-dot', 'ghosts-letter', 'ghosts-syllable', 'draw-print', 'draw-hand', 'doors', 'crystal', 'dot-intro', 'boss-dot', 'boss-shin', 'boss-mimic', 'boss-bat', 'merchant'])
    expect(GALLERY.every((e) => e.force.demo !== false)).toBe(true)
  })
  it('the gallery has one entry per boss kind (at a stage that opens it) and one for the potion', () => {
    expect(GALLERY.find((e) => e.id === 'boss-dot')!.force).toMatchObject({ screen: 'broom', boss: 'dot', stage: 3, kind: 'syllable' })
    expect(GALLERY.find((e) => e.id === 'boss-mimic')!.force).toMatchObject({ screen: 'broom', boss: 'mimic', stage: 2 })
    expect(GALLERY.find((e) => e.id === 'potion')).toBeUndefined()
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
  it('the parent can set boy or girl (shared by all the games), and it is logged', () => {
    clearGender()
    const track = vi.spyOn(duel2Telemetry, 'track')
    const { container } = render(<Parent onClose={() => {}} onGallery={() => {}} />)
    fireEvent.click(container.querySelector('[data-player-setting] input[value="girl"]')!)
    expect(getPlayer()).toMatchObject({ gender: 'girl', by: 'parent' })
    expect(track).toHaveBeenCalledWith('player', { gender: 'girl', by: 'parent' })
    clearGender()
  })
  it('export downloads JSON', () => {
    const url = vi.fn(() => 'blob:x')
    Object.assign(URL, { createObjectURL: url, revokeObjectURL: () => {} })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<Parent onClose={() => {}} onGallery={() => {}} />)
    fireEvent.click(screen.getByText('Export telemetry'))
    expect(url).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
  })
  it('reset asks first', () => {
    useDuel2Store.setState({ crystals: 4 })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Parent onClose={() => {}} onGallery={() => {}} />)
    fireEvent.click(screen.getByText('Reset progress'))
    expect(confirm).toHaveBeenCalled()
    expect(useDuel2Store.getState().crystals).toBe(4)
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByText('Reset progress'))
    expect(useDuel2Store.getState().crystals).toBe(0)
  })
  it('the way back to the alef menu is here, behind the parent gate', () => {
    const { container } = render(<Parent onClose={() => {}} onGallery={() => {}} />)
    expect(container.querySelector('a[data-alef-menu]')).not.toBeNull()
  })

  it('shows the flight speed this device has learned, and can reset it (it adapts per device)', () => {
    useDuel2Store.setState({ pace: 0.85 })
    const { container } = render(<Parent onClose={() => {}} onGallery={() => {}} />)
    expect(container.querySelector('[data-pace]')!.textContent).toMatch(/0\.85/)
    fireEvent.click(screen.getByText('Reset flight speed'))
    expect(useDuel2Store.getState().pace).toBe(1)
  })


  it('the parent can turn the drawing screens off and on here', () => {
    useDuel2Store.getState().setSettings({ drawing: false })
    const { container } = render(<Parent onClose={() => {}} onGallery={() => {}} />)
    const box = container.querySelector('input[data-setting-drawing]') as HTMLInputElement
    expect(box.checked).toBe(false)
    fireEvent.click(box)
    expect(useDuel2Store.getState().settings.drawing).toBe(true)
  })
  it('the parent page sets the number range and shows the money section', () => {
    useDuel2Store.setState({ merchant: { visits: 5, purchases: 3, declines: 2, short: 4, over: 1, hints: 6, level: 1, demoSeen: true, undoShown: true, cleanRow: 0, hintRow: 0 } })
    const track = vi.spyOn(duel2Telemetry, 'track')
    const { container } = render(<Parent onClose={() => {}} onGallery={() => {}} />)
    expect((container.querySelector('input[data-range="100"]') as HTMLInputElement).checked).toBe(true)
    fireEvent.click(container.querySelector('input[data-range="10"]')!)
    expect(useDuel2Store.getState().settings.range).toBe(10)
    expect(track).toHaveBeenCalledWith('settings', expect.objectContaining({ range: 10 }))
    const money = container.querySelector('[data-money]')!
    expect(money.querySelector('[data-money-purchases]')!.textContent).toBe('3')
    expect(money.querySelector('[data-money-declines]')!.textContent).toBe('2')
    expect(money.querySelector('[data-money-short]')!.textContent).toBe('4')
    expect(money.querySelector('[data-money-over]')!.textContent).toBe('1')
    expect(money.querySelector('[data-money-hints]')!.textContent).toBe('6')
    expect(money.querySelector('[data-money-level]')!.textContent).toMatch(/1/)
    useDuel2Store.getState().setSettings({ range: 100 })
  })
  it('opens the stroke review and the test board', () => {
    const onStrokes = vi.fn()
    const onDrawTest = vi.fn()
    render(<Parent onClose={() => {}} onGallery={() => {}} onStrokes={onStrokes} onDrawTest={onDrawTest} />)
    fireEvent.click(screen.getByText(/Stroke review/))
    fireEvent.click(screen.getByText(/test board/))
    expect(onStrokes).toHaveBeenCalled()
    expect(onDrawTest).toHaveBeenCalled()
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
    // handwriting shows a second, upright school font next to the game's font
    expect(container.querySelector('[data-stroke-card="ל-hand"] [data-ref-glyph="Dana Yad"]')).not.toBeNull()
    // the letters drawn after Dana Yad show it as the main reference (big), the game's font small below
    expect(container.querySelector('[data-stroke-card="ב-hand"] [data-ref-glyph="Dana Yad"]')!.getAttribute('data-main')).toBe('1')
    expect(container.querySelector('[data-stroke-card="ל-hand"] [data-ref-glyph="Ktav Yad"]')!.getAttribute('data-main')).toBe('1')
    // the game writes the words in Dana Yad: that glyph is marked as the game's font
    expect(container.querySelector('[data-stroke-card="ל-hand"] [data-ref-glyph="Dana Yad"]')!.getAttribute('data-game')).toBe('1')
    fireEvent.click(container.querySelector('[data-stroke-card="ד-print"] [data-mark-ok]')!)
    expect(useDuel2Store.getState().strokeMarks['ד-print']).toBe('ok')
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
