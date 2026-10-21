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
    expect(ids).toEqual(['broom-letter', 'broom-syllable', 'cauldron', 'ladder-vowel', 'ladder-letter', 'ladder-dot', 'ghosts-letter', 'ghosts-syllable', 'doors', 'crystal', 'dot-intro'])
    expect(GALLERY.every((e) => e.force.demo !== false)).toBe(true)
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

})
