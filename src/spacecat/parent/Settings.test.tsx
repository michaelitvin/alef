import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installFakeAudio } from '../../shared/gameAudio/fakePlayer'
import { applySound } from '../../shared/gameAudio/output'
import { setDeviceSettings } from '../../shared/deviceSettings'
import { ParentArea } from '../../parent/ParentArea'
import { SFX_NAMES } from '../audio/sfx'
import { DEFAULT_SAVE, SAVE_KEY } from '../saveFormat'
import { useSpaceCatStore } from '../store'
import { spaceCatParent } from '.'
import SpaceCatSettings from './Settings'

const audio = installFakeAudio()
const initial = useSpaceCatStore.getState()
const stat = (seen: number, wrong: number, timeout: number, picks: Record<string, number> = {}, times: number[] = []) =>
  ({ seen, wrong, timeout, recent: 'o'.repeat(seen - wrong - timeout) + 'x'.repeat(wrong) + 't'.repeat(timeout), times, picks })
const literal = (state: object) => JSON.stringify({ state, version: 1 })

beforeEach(() => {
  useSpaceCatStore.setState({ ...initial, ...DEFAULT_SAVE }, true)
  setDeviceSettings({ sfx: true, music: true })
  applySound({ sfx: true, music: true, volume: 0.8 })
})

describe('Space Cat\'s section in the parent area', () => {
  it('the hard sums table sorts by predicted mistake', () => {
    useSpaceCatStore.setState({ items: { '2+2=4/c': stat(8, 0, 0), '3+4=7/b': stat(6, 4, 1, { 5: 3, 2: 1 }, [2000, 3000, 4000]), '1+3=4/c': stat(5, 1, 0) } })
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    const rows = [...container.querySelectorAll('[data-hard] [data-item]')]
    expect(rows.map((r) => r.getAttribute('data-item'))).toEqual(['3+4=7/b', '1+3=4/c', '2+2=4/c'])
    expect(rows[0].textContent).toContain('3 + ◌ = 7')
    expect(rows[0].textContent).toContain('1 / 6')
    expect(rows[0].textContent).toContain('3.0 s')
    expect(rows[0].lastElementChild!.textContent).toBe('5')
  })

  it('changing the range opens and caps the rungs', () => {
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    const status = (r: number) => container.querySelector(`[data-rung="${r}"]`)!.getAttribute('data-status')
    expect(status(1)).toBe('open')
    expect(status(2)).toBe('closed')
    expect(status(7)).toBe('switched off')
    fireEvent.change(screen.getByLabelText('range'), { target: { value: '3' } })
    expect(useSpaceCatStore.getState().settings.range).toBe(3)
    expect([1, 2, 3, 4].map(status)).toEqual(['open', 'open', 'open', 'closed'])
    fireEvent.click(screen.getByLabelText('times'))
    expect(status(7)).toBe('closed')
  })

  it('a fixed time shows and the automatic value is kept', () => {
    useSpaceCatStore.setState({ speed: { arrivalMs: 6400, underMs: [], hold: 0 } })
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    expect(container.querySelector('[data-arrival-auto]')!.textContent).toBe('6.4 s')
    fireEvent.click(screen.getByLabelText('4 s'))
    expect(useSpaceCatStore.getState().settings.arrival).toBe(4000)
    expect(useSpaceCatStore.getState().speed.arrivalMs).toBe(6400)
    expect(container.querySelector('[data-arrival-auto]')!.textContent).toBe('6.4 s')
  })

  it('each of the 9 effects and the tune has a button', async () => {
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    for (const n of SFX_NAMES) fireEvent.click(container.querySelector(`[data-sfx="${n}"]`)!)
    expect(audio.log().filter((e) => e.kind === 'sfx').map((e) => e.url)).toEqual(SFX_NAMES.map((n) => `coded:spacecat/${n}`))
    fireEvent.click(container.querySelector('[data-sfx="tune"]')!)
    expect(audio.live().find((e) => e.kind === 'music')?.url).toBe('coded:spacecat/tune')
    fireEvent.click(container.querySelector('[data-sfx="tune"]')!)
  })

  it('with effects off on the device the sound buttons say so', () => {
    setDeviceSettings({ sfx: false })
    applySound({ sfx: false, music: true, volume: 0.8 })
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    expect(container.querySelector('[data-sfx-off]')).not.toBeNull()
    expect(container.querySelector('[data-sfx="right"]')!.textContent).toMatch(/effects off/)
    fireEvent.click(container.querySelector('[data-sfx="right"]')!)
    expect(audio.log().filter((e) => e.kind === 'sfx')).toEqual([])
  })

  it('the flight-music switch notes the device\'s music', () => {
    setDeviceSettings({ music: false })
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    expect(container.querySelector('[data-flight-music-note]')!.textContent).toMatch(/only while music is on for this device/)
    expect(container.querySelector('[data-flight-music-note]')!.textContent).toMatch(/Music is off on this device now/)
    fireEvent.click(screen.getByLabelText('music during flight'))
    expect(useSpaceCatStore.getState().settings.flightMusic).toBe(true)
  })

  it('a change tracks settings by the parent', () => {
    const track = vi.fn()
    render(<SpaceCatSettings goTo={() => {}} track={track} />)
    fireEvent.click(screen.getByLabelText('divide'))
    expect(track).toHaveBeenCalledWith('settings', { divide: true, by: 'parent' })
  })

  it('summary and mixups read a literal save and give null / [] for none or bad JSON', () => {
    const raw = literal({ ladder: { top: 4 }, runs: 3, best: 12, totalPoints: 40, items: { '3+4=7/c': stat(4, 2, 0, { 8: 2 }), '5-2=3/a': stat(2, 1, 0, { 6: 1 }) } })
    expect(spaceCatParent.summary(raw)).toBe('Rung 4 · runs 3 · best 12 · points 40')
    expect(spaceCatParent.mixups(raw)).toEqual([{ asked: '3 + 4 = ◌', chosen: '8', n: 2 }, { asked: '◌ − 2 = 3', chosen: '6', n: 1 }])
    for (const bad of [null, '{x']) {
      expect(spaceCatParent.summary(bad)).toBeNull()
      expect(spaceCatParent.mixups(bad)).toEqual([])
    }
  })

  it('reset clears only alef-spacecat', async () => {
    localStorage.setItem('alef-clock', '{"keep":1}')
    useSpaceCatStore.setState({ best: 9, runs: 2 })
    useSpaceCatStore.getState().setSettings({ times: true })
    await spaceCatParent.reset()
    expect(useSpaceCatStore.getState().best).toBe(0)
    expect(useSpaceCatStore.getState().runs).toBe(0)
    expect(useSpaceCatStore.getState().settings.times).toBe(true)
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).state.best).toBe(0)
    expect(localStorage.getItem('alef-clock')).toBe('{"keep":1}')
  })

  it('the area opens at Space Cat\'s section', async () => {
    const { container } = render(<ParentArea game="spacecat" onClose={() => {}} />)
    expect(await screen.findByText(/Sums he finds hard/, {}, { timeout: 3000 })).toBeTruthy()
    expect(container.querySelector('[data-spacecat-settings]')).not.toBeNull()
  })
})
