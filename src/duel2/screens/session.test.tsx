import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const { gate } = vi.hoisted(() => {
  let open: () => void = () => {}
  const p = new Promise<void>((r) => { open = r })
  return { gate: { p, open: () => open() } }
})
vi.mock('../assets/preload', () => ({ READY_MS: 8000, preloadDuel2Assets: () => gate.p }))
// the run itself is tested in useRun.test: here a session ends at once, so the shell around it can be checked
const { playOpts, exits } = vi.hoisted(() => ({ playOpts: [] as unknown[], exits: [] as (undefined | (() => void))[] }))
vi.mock('./Play', () => ({
  Play: ({ opts, onOver, onExit }: { opts: { session?: { screen: string } }; onOver: (o: unknown) => void; onExit?: () => void }) => {
    playOpts.push(opts)
    exits.push(onExit)
    return <div data-screen="play" data-session={opts.session?.screen} onClick={() => onOver({ score: 4, crystals: 0, best: false, session: !!opts.session })} />
  },
}))
import Duel2App from '../Duel2App'
import { Summary, HOME_AFTER_MS } from './Summary'
import { stationFromUrl } from '../station'
import { useDuel2Store } from '../store'
import { setVoicePlayer } from '../audio/duel2Audio'
import { clearGender, setGender } from '../../shared/player'

let vis: DocumentVisibilityState = 'visible'
const setVis = (v: DocumentVisibilityState) => { vis = v; document.dispatchEvent(new Event('visibilitychange')) }
const at = (search: string) => history.replaceState(null, '', `/${search}`)

describe('a station link from the home screen (spec: one duel, Part 3)', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => vis })
    vis = 'visible'
    playOpts.length = 0
    useDuel2Store.getState().resetProgress()
    useDuel2Store.setState({ bookOpen: true, stage: { stage: 1, newAnswers: '' } })
    setGender('boy', 'parent')
    setVoicePlayer(() => Promise.resolve(true))
  })
  afterEach(() => { vi.useRealTimers(); clearGender(); setVoicePlayer(null); at('') })

  it('stationFromUrl: only an open screen', () => {
    expect(stationFromUrl('?station=ghosts', ['tower', 'broom', 'ghosts'])).toBe('ghosts')
    expect(stationFromUrl('?station=doors', ['tower', 'broom', 'ghosts'])).toBeNull()
    expect(stationFromUrl('?station=x', ['tower'])).toBeNull()
    expect(stationFromUrl('', ['tower'])).toBeNull()
  })

  it('?station=ghosts shows one play button; its tap waits for preload, then the ghosts session starts', async () => {
    at('?station=ghosts')
    const { container } = render(<Duel2App goHome={() => {}} />)
    expect(container.querySelector('[data-screen="station"]')).not.toBeNull()
    expect(container.querySelectorAll('button').length).toBe(1)
    fireEvent.pointerDown(container.querySelector('[data-station-play]')!)
    expect(container.querySelector('[data-screen="play"]')).toBeNull()
    await act(async () => { gate.open(); await gate.p })
    const play = container.querySelector('[data-screen="play"]')!
    expect(play.getAttribute('data-session')).toBe('ghosts')
    expect(playOpts[playOpts.length - 1]).toEqual({ session: { screen: 'ghosts' } })
  })

  it('a locked or unknown station opens the cover', () => {
    for (const q of ['?station=doors', '?station=x', '?station=ladder', '?station=']) {
      at(q)
      const { container, unmount } = render(<Duel2App goHome={() => {}} />)
      expect(container.querySelector('[data-screen="cover"]')).not.toBeNull()
      unmount()
    }
    // a new player (Book 2 not open yet): only the tower
    useDuel2Store.getState().resetProgress()
    at('?station=broom')
    const a = render(<Duel2App goHome={() => {}} />)
    expect(a.container.querySelector('[data-screen="cover"]')).not.toBeNull()
    a.unmount()
    at('?station=tower')
    const b = render(<Duel2App goHome={() => {}} />)
    expect(b.container.querySelector('[data-screen="station"]')).not.toBeNull()
    b.unmount()
  })

  it('the session summary has no play button and goes home by itself, once', async () => {
    at('?station=ghosts')
    const home = vi.fn()
    const { container } = render(<Duel2App goHome={home} />)
    fireEvent.pointerDown(container.querySelector('[data-station-play]')!)
    await act(async () => { gate.open(); await gate.p })
    vi.useFakeTimers()
    fireEvent.click(container.querySelector('[data-screen="play"]')!)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    const sum = container.querySelector('[data-screen="summary"]')!
    expect(sum).not.toBeNull()
    expect(sum.querySelector('[aria-label="play again"]')).toBeNull()
    expect(sum.querySelector('[data-best-score]')).toBeNull()
    expect(sum.querySelector('[data-teaser], .d2-summary-bosses')).toBeNull()
    await act(async () => { await vi.advanceTimersByTimeAsync(HOME_AFTER_MS - 200) })
    expect(home).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })
    expect(home).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000) })
    expect(home).toHaveBeenCalledTimes(1)
  })

  it('a lock during the session summary still goes home once', async () => {
    vi.useFakeTimers()
    const home = vi.fn()
    render(<Summary over={{ score: 2, crystals: 0, best: false, session: true }} onAgain={() => {}} onHome={home} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    act(() => setVis('hidden'))
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(home).not.toHaveBeenCalled()
    act(() => setVis('visible'))
    // the wait starts again (never doubled by a second show)
    act(() => setVis('visible'))
    await act(async () => { await vi.advanceTimersByTimeAsync(HOME_AFTER_MS - 100) })
    expect(home).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    expect(home).toHaveBeenCalledTimes(1)
    act(() => setVis('hidden'))
    act(() => setVis('visible'))
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(home).toHaveBeenCalledTimes(1)
  })

  it('the held home button: a session has none (it goes home by itself); a full run leaves through it to the home screen', async () => {
    at('?station=ghosts')
    const a = render(<Duel2App goHome={() => {}} />)
    fireEvent.pointerDown(a.container.querySelector('[data-station-play]')!)
    await act(async () => { gate.open(); await gate.p })
    expect(exits[exits.length - 1]).toBeUndefined()
    fireEvent.click(a.container.querySelector('[data-screen="play"]')!)
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
    expect(a.container.querySelector('[aria-label="home (hold)"]')).toBeNull()
    a.unmount()
    at('')
    const home = vi.fn()
    const b = render(<Duel2App goHome={home} />)
    fireEvent.click(b.container.querySelector('[aria-label="play"]')!)
    await act(async () => { await gate.p; await new Promise((r) => setTimeout(r, 0)) })
    expect(b.container.querySelector('[data-screen="play"]')).not.toBeNull()
    const exit = exits[exits.length - 1]!
    act(() => exit())
    expect(home).toHaveBeenCalledTimes(1)
    expect(b.container.querySelector('[data-screen="play"]')).toBeNull()
    b.unmount()
    // the summary of a full run: the hold leaves too, with a run-exit
    const home2 = vi.fn()
    const c = render(<Duel2App goHome={home2} />)
    fireEvent.click(c.container.querySelector('[aria-label="play"]')!)
    await act(async () => { await gate.p; await new Promise((r) => setTimeout(r, 0)) })
    fireEvent.click(c.container.querySelector('[data-screen="play"]')!)
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
    const btn = c.container.querySelector('[data-screen="summary"] [aria-label="home (hold)"]')!
    expect(btn).not.toBeNull()
    vi.useFakeTimers()
    fireEvent.pointerDown(btn)
    fireEvent.pointerUp(btn)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(home2).not.toHaveBeenCalled()
    fireEvent.pointerDown(btn)
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(home2).toHaveBeenCalledTimes(1)
    expect(c.container.querySelector('[data-screen="leaving"]')).not.toBeNull()
  })

  it('a normal run’s summary keeps its play button and never goes home', async () => {
    vi.useFakeTimers()
    const home = vi.fn()
    const { container } = render(<Summary over={{ score: 2, crystals: 0, best: false }} onAgain={() => {}} onHome={home} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(container.querySelector('[aria-label="play again"]')).not.toBeNull()
    expect(home).not.toHaveBeenCalled()
  })
})
