// The clock's section in the parent area (moved from the old parent screen's test): languages, captions, logging and the
// reset of the clock only.
import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ClockSettings from './Settings'
import { clockParent } from '.'
import { useClockStore } from '../store'
import { clockTelemetry } from '../telemetry'
import { useDuel2Store } from '../../duel2/store'

describe('the clock\'s section in the parent area', () => {
  beforeEach(() => {
    useClockStore.getState().resetProgress()
    useClockStore.getState().setSettings({ langs: ['he', 'en'] })
  })
  afterEach(() => vi.restoreAllMocks())

  it('cannot untick the last language', () => {
    const { getByLabelText } = render(<ClockSettings goTo={() => {}} />)
    fireEvent.click(getByLabelText('עברית / Hebrew'))
    expect(useClockStore.getState().settings.langs).toEqual(['en'])
    fireEvent.click(getByLabelText('English'))
    expect(useClockStore.getState().settings.langs).toEqual(['en'])
  })

  it('logs each settings change', () => {
    const track = vi.spyOn(clockTelemetry, 'track')
    const { getByLabelText } = render(<ClockSettings goTo={() => {}} />)
    fireEvent.click(getByLabelText('עברית / Hebrew'))
    expect(track).toHaveBeenCalledWith('settings', { keys: ['langs'], langs: ['en'] })
    fireEvent.click(getByLabelText(/Hebrew: mix print and cursive/))
    expect(track).toHaveBeenCalledWith('settings', expect.objectContaining({ keys: ['heCursiveMix'] }))
  })

  it('shows the level, rounds and gears, and a row per feature with its predicted miss', () => {
    useClockStore.getState().addGears(4)
    useClockStore.setState({ tallies: { half: { seen: 4, wrong: 1 } }, recent: { half: 'xo' } })
    const { container } = render(<ClockSettings goTo={() => {}} />)
    expect(container.querySelector('[data-clock-progress]')!.textContent).toMatch(/gears 4/)
    expect(container.querySelector('[data-feature="half"]')!.textContent).toMatch(/%$/)
  })

  it('reset clears the clock only', async () => {
    useClockStore.getState().addGears(4)
    useDuel2Store.setState({ crystals: 2 })
    await clockParent.reset()
    expect(useClockStore.getState().gears).toBe(0)
    expect(useDuel2Store.getState().crystals).toBe(2)
  })
})
