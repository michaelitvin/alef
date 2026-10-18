import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Parent } from './Parent'
import { useClockStore } from '../store'
import { clockTelemetry } from '../telemetry'

describe('Parent', () => {
  beforeEach(() => {
    useClockStore.getState().resetProgress()
    useClockStore.getState().setSettings({ langs: ['he', 'en'] })
  })
  it('cannot untick the last language', () => {
    const { getByLabelText } = render(<Parent onClose={() => {}} />)
    fireEvent.click(getByLabelText('עברית / Hebrew'))
    expect(useClockStore.getState().settings.langs).toEqual(['en'])
    fireEvent.click(getByLabelText('English'))
    expect(useClockStore.getState().settings.langs).toEqual(['en'])
  })
  it('logs each settings change', () => {
    const track = vi.spyOn(clockTelemetry, 'track')
    const { getByLabelText } = render(<Parent onClose={() => {}} />)
    fireEvent.click(getByLabelText('עברית / Hebrew'))
    expect(track).toHaveBeenCalledWith('settings', { keys: ['langs'], langs: ['en'] })
    track.mockRestore()
  })
  it('reset asks first', () => {
    useClockStore.getState().addGears(4)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { getByText } = render(<Parent onClose={() => {}} />)
    fireEvent.click(getByText('Reset clock progress'))
    expect(confirm).toHaveBeenCalled()
    expect(useClockStore.getState().gears).toBe(0)
  })
})
