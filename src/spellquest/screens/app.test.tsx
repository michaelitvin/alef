// What SpellQuestApp does around its screens (the shell keeps all of it): the preload and the first duel's import on mount,
// the test-build addresses, the turn-the-phone picture, the screen check after the preload, the way home, the station
// link read once.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const { pre } = vi.hoisted(() => ({ pre: { p: Promise.resolve() as Promise<void>, open: () => {}, calls: 0 } }))
vi.mock('../assets/preload', () => ({ READY_MS: 8000, preloadSpellQuestAssets: () => { pre.calls++; return pre.p } }))
const { exits } = vi.hoisted(() => ({ exits: [] as (undefined | (() => void))[] }))
vi.mock('./Play', () => ({
  Play: ({ opts, onExit }: { opts: { session?: { screen: string } }; onExit?: () => void }) => {
    exits.push(onExit)
    return <div data-screen="play" data-session={opts.session?.screen} />
  },
}))
import SpellQuestApp from '../SpellQuestApp'
import { useSpellQuestStore } from '../store'
import { useProgressStore } from '../../stores/progressStore'
import { spellQuestTelemetry } from '../telemetry'
import { say, startMusic } from '../audio/spellQuestAudio'
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

describe('SpellQuestApp around its screens', () => {
  beforeEach(() => {
    pre.p = Promise.resolve()
    pre.calls = 0
    exits.length = 0
    useSpellQuestStore.getState().resetProgress()
    setGender('boy', 'parent')
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); clearGender(); at('/') })

  it('starts the preload on mount', () => {
    render(<SpellQuestApp goHome={() => {}} />)
    expect(pre.calls).toBeGreaterThan(0)
  })

  it('moves the first duel\'s progress over on mount', () => {
    const spy = vi.spyOn(useSpellQuestStore.getState(), 'importTower')
    render(<SpellQuestApp goHome={() => {}} />)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(useProgressStore.getState().tower)
  })

  it('the test-build addresses open their pages', () => {
    const cases: [string, string][] = [['#/glyphs', '[data-sheet]'], ['#/strokes', '[data-strokes-page]'], ['#/summary', '[data-screen="summary"]'], ['#/summary-session', '[data-screen="summary"]']]
    for (const [hash, sel] of cases) {
      at('/' + hash)
      const { container, unmount } = render(<SpellQuestApp goHome={() => {}} />)
      expect(container.querySelector(sel), hash).not.toBeNull()
      if (hash === '#/summary') expect(container.querySelector('[data-run-score]')!.textContent).toBe('37')
      if (hash === '#/summary-session') expect(container.querySelector('[aria-label="play again"]')).toBeNull()
      unmount()
    }
  })

  it('the turn-the-phone picture shows on the cover and in a run, never on the parent screens', async () => {
    vi.useFakeTimers()
    const { container } = render(<SpellQuestApp goHome={() => {}} />)
    expect(container.querySelector('.d2-rotate')).not.toBeNull()
    openParent(container)
    expect(container.querySelector('[data-parent-area="book2"]')).not.toBeNull()
    expect(container.querySelector('.d2-rotate')).toBeNull()
    vi.useRealTimers()
    at('/#/strokes')
    const s = render(<SpellQuestApp goHome={() => {}} />)
    expect(s.container.querySelector('[data-strokes-page]')).not.toBeNull()
    expect(s.container.querySelector('.d2-rotate')).toBeNull()
    s.unmount()
    at('/')
    const p = render(<SpellQuestApp goHome={() => {}} />)
    fireEvent.click(p.container.querySelector('[aria-label="play"]')!)
    await act(async () => { await pre.p })
    expect(p.container.querySelector('[data-screen="play"]')).not.toBeNull()
    expect(p.container.querySelector('.d2-rotate')).not.toBeNull()
  })

  it('a tap on play that left the cover before the preload ended starts no run', async () => {
    vi.useFakeTimers()
    pending()
    const { container } = render(<SpellQuestApp goHome={() => {}} />)
    fireEvent.click(container.querySelector('[aria-label="play"]')!)
    openParent(container)
    expect(container.querySelector('[data-parent-area="book2"]')).not.toBeNull()
    await act(async () => { pre.open(); await pre.p })
    expect(container.querySelector('[data-screen="play"]')).toBeNull()
    expect(container.querySelector('[data-parent-area="book2"]')).not.toBeNull()
  })

  it('the way home stops the voice and the music and writes the log, then goes home', async () => {
    const flush = vi.spyOn(spellQuestTelemetry, 'flush')
    const home = vi.fn()
    const { container } = render(<SpellQuestApp goHome={home} />)
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
    useSpellQuestStore.setState({ screensOpen: true, stage: { stage: 1, newAnswers: '' } })
    at('/?station=ghosts')
    const { container, rerender } = render(<SpellQuestApp goHome={() => {}} />)
    at('/')
    rerender(<SpellQuestApp goHome={() => {}} />)
    expect(container.querySelector('[data-screen="station"]')).not.toBeNull()
    fireEvent.pointerDown(container.querySelector('[data-station-play]')!)
    await act(async () => { await pre.p })
    expect(container.querySelector('[data-screen="play"]')!.getAttribute('data-session')).toBe('ghosts')
    // a path session has no way home of its own (it goes home by itself)
    expect(exits[exits.length - 1]).toBeUndefined()
  })

  it('the parent button opens the shared area at Book 2; its developer screens go back to the area, Close to the cover', async () => {
    vi.useFakeTimers()
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    const { container } = render(<SpellQuestApp goHome={() => {}} />)
    openParent(container)
    vi.useRealTimers()
    const area = () => container.querySelector('[data-parent-area="book2"]')
    expect(area()).not.toBeNull()
    expect(scroll.mock.contexts[scroll.mock.contexts.length - 1]).toBe(container.querySelector('[data-section="game"]'))
    expect(container.querySelector('a[data-alef-menu]')).not.toBeNull()
    fireEvent.click(await screen.findByText('Stroke review', {}, { timeout: 15000 }))
    expect(container.querySelector('[data-strokes-page]')).not.toBeNull()
    fireEvent.click(screen.getByText('Back'))
    expect(area()).not.toBeNull()
    expect(scroll.mock.contexts[scroll.mock.contexts.length - 1]).toBe(container.querySelector('[data-section="developer"]'))
    fireEvent.click(await screen.findByText('Screens (review each screen)', {}, { timeout: 15000 }))
    expect(container.querySelector('[data-entry]')).not.toBeNull()
    fireEvent.click(screen.getByText('Back'))
    fireEvent.click(container.querySelector('[data-parent-close]')!)
    expect(area()).toBeNull()
    expect(container.querySelector('[aria-label="play"]')).not.toBeNull()
  })
})
