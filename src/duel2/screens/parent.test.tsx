import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Gallery, GALLERY } from './Gallery'
import { Parent } from './Parent'
import { useDuel2Store } from '../store'

describe('parent area', () => {
  afterEach(() => vi.restoreAllMocks())
  it('gallery lists every screen and stage', () => {
    const { container } = render(<Gallery onBack={() => {}} onStart={() => {}} />)
    const ids = [...container.querySelectorAll('[data-entry]')].map((e) => e.getAttribute('data-entry'))
    expect(ids).toEqual(['broom-letter', 'broom-syllable', 'cauldron', 'ladder-vowel', 'ladder-letter', 'ladder-dot', 'ghosts-letter', 'ghosts-syllable', 'doors', 'crystal', 'dot-intro', 'boss-dot', 'boss-shin', 'boss-mimic', 'boss-bat', 'potion'])
    expect(GALLERY.every((e) => e.force.demo !== false)).toBe(true)
  })
  it('the gallery has one entry per boss kind (at a stage that opens it) and one for the potion', () => {
    expect(GALLERY.find((e) => e.id === 'boss-dot')!.force).toMatchObject({ screen: 'broom', boss: 'dot', stage: 3, kind: 'syllable' })
    expect(GALLERY.find((e) => e.id === 'boss-mimic')!.force).toMatchObject({ screen: 'broom', boss: 'mimic', stage: 2 })
    expect(GALLERY.find((e) => e.id === 'potion')!.force).toMatchObject({ screen: 'broom', potion: true })
  })
  it('an entry starts its screen', () => {
    const onStart = vi.fn()
    render(<Gallery onBack={() => {}} onStart={onStart} />)
    fireEvent.click(screen.getByText(/Ladder — the dot/))
    expect(onStart.mock.calls[0][0].force).toMatchObject({ screen: 'ladder', fixed: 'dot', stage: 3 })
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

})
