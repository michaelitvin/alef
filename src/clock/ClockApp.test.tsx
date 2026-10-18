import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
const { playVoice, setClockHidden, startMusic, stopMusic, preload } = vi.hoisted(() => ({
  playVoice: vi.fn((..._a: unknown[]) => Promise.resolve()),
  setClockHidden: vi.fn(), startMusic: vi.fn(), stopMusic: vi.fn(),
  preload: vi.fn(() => Promise.resolve()),
}))
vi.mock('./assets/preload', () => ({ preloadClockAssets: preload }))
vi.mock('./audio/clockAudio', () => ({
  playVoice, playSfx: () => Promise.resolve(), stopVoices: () => {}, startMusic, stopMusic,
  preloadVoices: () => {}, configureClockAudio: () => {}, unlockClockAudio: () => {}, muteClockAudio: () => {},
  setClockHidden, holdClockAudio: () => {},
}))
import ClockApp from './ClockApp'
import { useClockStore } from './store'

describe('ClockApp', () => {
  it('shows the cover with a play button', () => {
    render(<ClockApp />)
    expect(screen.getByRole('button', { name: 'play' })).toBeTruthy()
  })
  it('a double tap on play during the welcome still navigates once', async () => {
    let finish: () => void = () => {}
    playVoice.mockImplementationOnce(() => new Promise<void>((r) => { finish = r }))
    useClockStore.setState({ welcomed: false })
    const { container } = render(<ClockApp />)
    const play = screen.getByRole('button', { name: 'play' })
    fireEvent.click(play)
    fireEvent.click(play)
    expect(playVoice).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.ck-cover')).toBeTruthy()
    await act(async () => { finish() })
    expect(container.querySelector('.ck-cover')).toBeNull()
  })
  it('switching apps silences the audio on the cover too; coming back un-silences it', () => {
    render(<ClockApp />)
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(setClockHidden).toHaveBeenLastCalledWith(true)
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(setClockHidden).toHaveBeenLastCalledWith(false)
    act(() => { window.dispatchEvent(new Event('pagehide')) })
    expect(setClockHidden).toHaveBeenLastCalledWith(true)
  })
  it('the door plays music after the first tap', async () => {
    startMusic.mockClear()
    stopMusic.mockClear()
    const { container } = render(<ClockApp />)
    expect(startMusic).not.toHaveBeenCalled()
    fireEvent.pointerDown(container.querySelector('.ck-cover') as HTMLElement)
    await act(async () => {}) // the music waits for the fonts and images
    expect(startMusic).toHaveBeenCalledTimes(1)
    fireEvent.pointerDown(container.querySelector('.ck-cover') as HTMLElement)
    await act(async () => {})
    expect(startMusic).toHaveBeenCalledTimes(1)
  })
  it('a press on the parent-settings button does not start the door music', async () => {
    startMusic.mockClear()
    const { container } = render(<ClockApp />)
    fireEvent.pointerDown(container.querySelector('.ck-parent-btn') as HTMLElement)
    await act(async () => {})
    expect(startMusic).not.toHaveBeenCalled()
    fireEvent.pointerDown(container.querySelector('.ck-cover') as HTMLElement)
    await act(async () => {})
    expect(startMusic).toHaveBeenCalledTimes(1)
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
