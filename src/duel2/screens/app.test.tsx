// What Duel2App does around its screens (the shell keeps all of it): the preload and the first duel's import on mount,
// the test-build addresses, the turn-the-phone picture, the screen check after the preload, the way home, the station
// link read once.
import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const { pre } = vi.hoisted(() => ({ pre: { p: Promise.resolve() as Promise<void>, open: () => {}, calls: 0 } }))
vi.mock('../assets/preload', () => ({ READY_MS: 8000, preloadDuel2Assets: () => { pre.calls++; return pre.p } }))
const { exits } = vi.hoisted(() => ({ exits: [] as (undefined | (() => void))[] }))
vi.mock('./Play', () => ({
  Play: ({ opts, onExit }: { opts: { session?: { screen: string } }; onExit?: () => void }) => {
    exits.push(onExit)
    return <div data-screen="play" data-session={opts.session?.screen} />
  },
}))
import Duel2App from '../Duel2App'
import { useDuel2Store } from '../store'
import { useProgressStore } from '../../stores/progressStore'
import { duel2Telemetry } from '../telemetry'
import { say, startMusic } from '../audio/duel2Audio'
import { installFakeAudio } from '../../shared/gameAudio/fakePlayer'
import { clearGender, setGender } from '../../shared/player'
import { HOLD_MS } from '../../shared/HoldButton'
import { enterYear } from '../../shared/parentGate/testing'
const fakeAudio = installFakeAudio()

const pending = () => { pre.p = new Promise<void>((r) => { pre.open = r }) }
const at = (url: string) => history.replaceState(null, '', url)
const openParent = (c: HTMLElement) => {
  fireEvent.pointerDown(c.querySelector('[aria-label="parent settings (hold)"]')!)
  act(() => { vi.advanceTimersByTime(HOLD_MS) })
  enterYear(new Date().getFullYear() - 40)
}

describe('Duel2App around its screens', () => {
  beforeEach(() => {
    pre.p = Promise.resolve()
    pre.calls = 0
    exits.length = 0
    useDuel2Store.getState().resetProgress()
    setGender('boy', 'parent')
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); clearGender(); at('/') })

  it('starts the preload on mount', () => {
    render(<Duel2App goHome={() => {}} />)
    expect(pre.calls).toBeGreaterThan(0)
  })

  it('moves the first duel\'s progress over on mount', () => {
    const spy = vi.spyOn(useDuel2Store.getState(), 'importFirstDuel')
    render(<Duel2App goHome={() => {}} />)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(useProgressStore.getState().duel)
  })

  it('the test-build addresses open their pages', () => {
    const cases: [string, string][] = [['#/glyphs', '[data-sheet]'], ['#/strokes', '[data-strokes-page]'], ['#/summary', '[data-screen="summary"]'], ['#/summary-session', '[data-screen="summary"]']]
    for (const [hash, sel] of cases) {
      at('/' + hash)
      const { container, unmount } = render(<Duel2App goHome={() => {}} />)
      expect(container.querySelector(sel), hash).not.toBeNull()
      if (hash === '#/summary') expect(container.querySelector('[data-run-score]')!.textContent).toBe('37')
      if (hash === '#/summary-session') expect(container.querySelector('[aria-label="play again"]')).toBeNull()
      unmount()
    }
  })

  it('the turn-the-phone picture shows on the cover and in a run, never on the parent screens', async () => {
    vi.useFakeTimers()
    const { container } = render(<Duel2App goHome={() => {}} />)
    expect(container.querySelector('.d2-rotate')).not.toBeNull()
    openParent(container)
    expect(container.querySelector('.d2-parent')).not.toBeNull()
    expect(container.querySelector('.d2-rotate')).toBeNull()
    vi.useRealTimers()
    at('/#/strokes')
    const s = render(<Duel2App goHome={() => {}} />)
    expect(s.container.querySelector('[data-strokes-page]')).not.toBeNull()
    expect(s.container.querySelector('.d2-rotate')).toBeNull()
    s.unmount()
    at('/')
    const p = render(<Duel2App goHome={() => {}} />)
    fireEvent.click(p.container.querySelector('[aria-label="play"]')!)
    await act(async () => { await pre.p })
    expect(p.container.querySelector('[data-screen="play"]')).not.toBeNull()
    expect(p.container.querySelector('.d2-rotate')).not.toBeNull()
  })

  it('a tap on play that left the cover before the preload ended starts no run', async () => {
    vi.useFakeTimers()
    pending()
    const { container } = render(<Duel2App goHome={() => {}} />)
    fireEvent.click(container.querySelector('[aria-label="play"]')!)
    openParent(container)
    expect(container.querySelector('.d2-parent')).not.toBeNull()
    await act(async () => { pre.open(); await pre.p })
    expect(container.querySelector('[data-screen="play"]')).toBeNull()
    expect(container.querySelector('.d2-parent')).not.toBeNull()
  })

  it('the way home stops the voice and the music and writes the log, then goes home', async () => {
    const flush = vi.spyOn(duel2Telemetry, 'flush')
    const home = vi.fn()
    const { container } = render(<Duel2App goHome={home} />)
    fireEvent.click(container.querySelector('[aria-label="play"]')!)
    await act(async () => { await pre.p })
    fakeAudio.holdUntil(/./)
    say(['info-coins-1'])
    startMusic('flight')
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    expect(fakeAudio.live().length).toBeGreaterThan(0)
    act(() => exits[exits.length - 1]!())
    // the voice stops at once; the music fades out
    expect(fakeAudio.live().filter((e) => e.kind === 'voice')).toEqual([])
    expect(fakeAudio.live().filter((e) => e.kind === 'music').map((e) => e.volume)).toEqual([0])
    expect(flush).toHaveBeenCalled()
    expect(home).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-screen="leaving"]')).not.toBeNull()
  })

  it('reads the station link once, at mount', async () => {
    useDuel2Store.setState({ bookOpen: true, stage: { stage: 1, newAnswers: '' } })
    at('/?station=ghosts')
    const { container, rerender } = render(<Duel2App goHome={() => {}} />)
    at('/')
    rerender(<Duel2App goHome={() => {}} />)
    expect(container.querySelector('[data-screen="station"]')).not.toBeNull()
    fireEvent.pointerDown(container.querySelector('[data-station-play]')!)
    await act(async () => { await pre.p })
    expect(container.querySelector('[data-screen="play"]')!.getAttribute('data-session')).toBe('ghosts')
    // a path session has no way home of its own (it goes home by itself)
    expect(exits[exits.length - 1]).toBeUndefined()
  })
})
