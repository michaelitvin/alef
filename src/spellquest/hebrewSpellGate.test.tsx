// The Hebrew spell book is hidden on production until its voice files and art ship (src/shared/hebrewSpell.ts): the cycle,
// the home path, the station link and the gallery are those of production before the spell book. Tests run in test mode,
// so the baselines keep it; this file builds the production flag.
import { cleanup, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HEBREW_SPELL_RELEASED } from '../shared/hebrewSpell'

const production = () => vi.doMock('../shared/hebrewSpell', () => ({ HEBREW_SPELL_RELEASED: false, HEBREW_SPELL_AVAILABLE: false }))

describe('the Hebrew spell book on production', () => {
  afterEach(() => { cleanup(); vi.doUnmock('../shared/hebrewSpell'); vi.resetModules() })

  it('is not released yet', () => expect(HEBREW_SPELL_RELEASED).toBe(false))

  it('the cycle at stage 4 ends with the doors, as before the spell book', async () => {
    production(); vi.resetModules()
    const { screensOfStage } = await import('./logic/stages')
    const { cycleOf } = await import('./logic/run')
    expect(screensOfStage(4)).toEqual(['broom', 'cauldron', 'ladder', 'ghosts', 'doors'])
    expect(cycleOf(4, true)).not.toContain('spell')
  })

  it('the station link of the spell book opens the cover, and the home path has no spell station', async () => {
    production(); vi.resetModules()
    const { openScreens, stationFromUrl } = await import('./station')
    const open = openScreens({ stage: { stage: 4 }, screensOpen: true }, {})
    expect(stationFromUrl('?station=spell', open)).toBeNull()
    expect(stationFromUrl('?station=doors', open)).toBe('doors')
    const { useStations } = await import('../components/home/stations')
    let ids: string[] = []
    const Probe = () => { ids = useStations().map((s) => s.id); return null }
    render(<MemoryRouter><Probe /></MemoryRouter>)
    expect(ids).not.toContain('spell')
    expect(ids).toContain('doors')
  })

  it('the gallery of the Hebrew page lists no spell book; the English page still does', async () => {
    production(); vi.resetModules()
    const { galleryFor } = await import('./screens/Gallery')
    expect(galleryFor('he').some((e) => e.force.screen === 'spell')).toBe(false)
    expect(galleryFor('en').some((e) => e.force.screen === 'spell')).toBe(true)
  })

  it('in test mode (staging, dev) the spell book is there', async () => {
    const { screensOfStage } = await import('./logic/stages')
    expect(screensOfStage(4)).toContain('spell')
  })
})
