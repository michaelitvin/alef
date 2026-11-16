import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const { preload } = vi.hoisted(() => ({
  preload: vi.fn(() => Promise.resolve()),
}))
vi.mock('./assets/preload', () => ({ preloadClockAssets: preload }))
import ClockApp from './ClockApp'
import { useClockStore } from './store'
import { clearGender, getPlayer, setGender } from '../shared/player'
import { clockTelemetry } from './telemetry'
import { setDeviceSettings } from '../shared/deviceSettings'
import { installFakeAudio } from '../shared/gameAudio/fakePlayer'
import { effectsOn, holdAudio, musicOn } from '../shared/gameAudio/output'
import { stopMusic } from './audio/clockAudio'
import { enterYear } from '../shared/parentGate/testing'

const audio = installFakeAudio()
/** the music starts: each one is a new track */
const musicStarts = () => audio.log().filter((e) => e.kind === 'music').length

describe('ClockApp', () => {
  it('plays at the device\'s one sound setting, not the clock save\'s old fields', () => {
    setDeviceSettings({ sfx: false, music: false, volume: 0.3 })
    useClockStore.setState((s) => ({ settings: { ...s.settings, sfx: true, music: true, volume: 1 } }))
    const { unmount } = render(<ClockApp />)
    expect([audio.volume, effectsOn(), musicOn()]).toEqual([0.3, false, false])
    act(() => setDeviceSettings({ music: true }))
    expect([audio.volume, effectsOn(), musicOn()]).toEqual([0.3, false, true])
    unmount()
    setDeviceSettings({ sfx: true, music: true, volume: 0.8 })
  })
  // the door's music goes on after a test unmounts the app: each test starts with none
  beforeEach(() => { setGender('boy', 'parent'); stopMusic() })
  afterEach(() => clearGender())
  it('the first play asks boy or girl before the welcome; the welcome then speaks to her', async () => {
    clearGender()
    const track = vi.spyOn(clockTelemetry, 'track')
    useClockStore.setState({ welcomed: false })
    const { container } = render(<ClockApp />)
    let loaded: () => void = () => {}
    preload.mockImplementationOnce(() => new Promise<void>((r) => { loaded = r }))
    fireEvent.click(screen.getByRole('button', { name: 'play' }))
    // the wizard pictures load before the question shows
    expect(container.querySelector('[data-screen="gender-question"]')).toBeNull()
    await act(async () => { loaded() })
    const q = container.querySelector('[data-screen="gender-question"]')!
    expect(q).not.toBeNull()
    expect(q.querySelector('[data-gender="girl"] img')!.getAttribute('src')).toMatch(/s-wizard-idle-girl/)
    expect(audio.said()[0]).toBe('ask-gender-he')
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
    fireEvent.click(q.querySelector('[data-gender="girl"]')!)
    await act(async () => { await new Promise((r) => setTimeout(r, 600)) })
    expect(getPlayer()).toMatchObject({ gender: 'girl', by: 'child' })
    expect(track).toHaveBeenCalledWith('player', { gender: 'girl', by: 'child' })
    expect(audio.said()).toContain('welcome-he-f') // the welcome speaks to her
    track.mockRestore()
  })
  it('shows the cover with a play button', () => {
    render(<ClockApp />)
    expect(screen.getByRole('button', { name: 'play' })).toBeTruthy()
  })
  it('a double tap on play during the welcome still navigates once', async () => {
    audio.holdUntil(/^welcome-/)
    useClockStore.setState({ welcomed: false })
    const { container } = render(<ClockApp />)
    const play = screen.getByRole('button', { name: 'play' })
    fireEvent.click(play)
    fireEvent.click(play)
    expect(audio.said()).toHaveLength(1)
    expect(container.querySelector('.ck-cover')).toBeTruthy()
    await act(async () => { audio.release() })
    expect(container.querySelector('.ck-cover')).toBeNull()
  })
  it('switching apps silences the audio on the cover too; coming back un-silences it', () => {
    render(<ClockApp />)
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(audio.muted).toBe(true)
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(audio.muted).toBe(false)
    act(() => { window.dispatchEvent(new Event('pagehide')) })
    expect(audio.muted).toBe(true)
    act(() => { window.dispatchEvent(new Event('pageshow')) })
    expect(audio.muted).toBe(false)
  })
  it('the pause cover keeps the audio silent after the page shows again, until play', () => {
    render(<ClockApp />)
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    holdAudio(true) // the workshop shows its pause cover
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(audio.muted).toBe(true)
    holdAudio(false) // he taps play
    expect(audio.muted).toBe(false)
  })
  it('the door plays music after the first tap', async () => {
    const { container } = render(<ClockApp />)
    expect(musicStarts()).toBe(0)
    fireEvent.pointerDown(container.querySelector('.ck-cover') as HTMLElement)
    await act(async () => {}) // the music waits for the fonts and images
    expect(musicStarts()).toBe(1)
    fireEvent.pointerDown(container.querySelector('.ck-cover') as HTMLElement)
    await act(async () => {})
    expect(musicStarts()).toBe(1)
  })
  it('a press on the parent-settings button does not start the door music', async () => {
    const { container } = render(<ClockApp />)
    fireEvent.pointerDown(container.querySelector('.ck-parent-btn') as HTMLElement)
    await act(async () => {})
    expect(musicStarts()).toBe(0)
    // nor do the presses on its number pad
    vi.useFakeTimers()
    fireEvent.pointerDown(container.querySelector('.ck-parent-btn') as HTMLElement)
    act(() => { vi.advanceTimersByTime(2000) })
    vi.useRealTimers()
    fireEvent.pointerDown(document.querySelector('[data-year-pad] [data-digit="1"]')!)
    await act(async () => {})
    expect(musicStarts()).toBe(0)
    fireEvent.pointerDown(document.querySelector('[data-pad-backdrop]')!)
    await act(async () => {})
    expect(musicStarts()).toBe(0)
    fireEvent.pointerDown(container.querySelector('.ck-cover') as HTMLElement)
    await act(async () => {})
    expect(musicStarts()).toBe(1)
  })
  it('a tap on play that left the door before the loading ended does not open the workshop', async () => {
    vi.useFakeTimers()
    let loaded: () => void = () => {}
    const pending = new Promise<void>((r) => { loaded = r })
    preload.mockImplementation(() => pending)
    useClockStore.setState({ welcomed: true })
    const { container } = render(<ClockApp />)
    fireEvent.click(screen.getByRole('button', { name: 'play' }))
    fireEvent.pointerDown(container.querySelector('.ck-parent-btn') as HTMLElement)
    act(() => { vi.advanceTimersByTime(2000) })
    enterYear(new Date().getFullYear() - 40)
    expect(container.querySelector('.ck-parent')).not.toBeNull()
    await act(async () => { loaded() })
    expect(container.querySelector('.ck-parent')).not.toBeNull()
    expect(container.querySelector('.ck-workshop')).toBeNull()
    preload.mockImplementation(() => Promise.resolve())
    vi.useRealTimers()
  })
  it('the question stops the door music; after the choice it plays again under the welcome', async () => {
    clearGender()
    audio.holdUntil(/^welcome-/)
    useClockStore.setState({ welcomed: false })
    const { container } = render(<ClockApp />)
    fireEvent.pointerDown(container.querySelector('.ck-cover') as HTMLElement)
    await act(async () => {})
    expect(musicStarts()).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'play' }))
    await act(async () => {})
    const q = container.querySelector('[data-screen="gender-question"]')!
    expect(q).not.toBeNull()
    expect(audio.live().filter((e) => e.kind === 'music').every((e) => e.volume === 0)).toBe(true)
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
    fireEvent.click(q.querySelector('[data-gender="boy"]')!)
    await act(async () => { await new Promise((r) => setTimeout(r, 600)) })
    expect(audio.said()).toContain('welcome-he')
    expect(container.querySelector('.ck-cover')).not.toBeNull()
    expect(musicStarts()).toBe(2)
    await act(async () => { audio.release() })
    expect(container.querySelector('.ck-cover')).toBeNull()
  })
  it('play waits for the fonts and images: no caption shows in a fallback font', async () => {
    let loaded: () => void = () => {}
    const pending = new Promise<void>((r) => { loaded = r })
    preload.mockImplementation(() => pending)
    useClockStore.setState({ welcomed: true })
    const { container } = render(<ClockApp />)
    expect(preload).toHaveBeenCalled() // loading starts on the door
    fireEvent.click(screen.getByRole('button', { name: 'play' }))
    await act(async () => {})
    expect(container.querySelector('.ck-cover')).toBeTruthy()
    expect(container.querySelector('.ck-play[data-loading]')).toBeTruthy() // the turning ring shows
    await act(async () => { loaded() })
    expect(container.querySelector('.ck-cover')).toBeNull()
    preload.mockImplementation(() => Promise.resolve())
  })
})
