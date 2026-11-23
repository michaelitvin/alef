// The shared parent area's frame: its sections in order, every game's lines from the raw saves (no other game's store is
// created), only the open game's settings, reset and developer tools, and the changes logged as before.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ParentArea } from './ParentArea'
import { GAMES, gameParent } from './registry'
import { getDeviceSettings } from '../shared/deviceSettings'
import { clearGender, getGender } from '../shared/player'
import { resetPersistRequestForTest } from '../shared/saveStorage'

const sections = (c: HTMLElement) => [...c.querySelectorAll('[data-section]')].map((s) => s.getAttribute('data-section'))
/** a lazy section's first load transforms the game's modules: give it time */
const LAZY = { timeout: 15000 }
const save = (key: string, state: unknown, version = 1) => localStorage.setItem(key, JSON.stringify({ state, version }))

describe('the parent area', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => { vi.restoreAllMocks(); clearGender() })

  it('the sections in order: child, sound, progress, the open game, data, developer', () => {
    const { container } = render(<ParentArea game="clock" onClose={() => {}} />)
    expect(sections(container)).toEqual(['child', 'sound', 'progress', 'game', 'data', 'developer'])
    expect(container.querySelector('[data-section="game"] h2')!.textContent).toBe('Clock workshop')
  })

  it('asks the browser to keep the storage once, when the area opens (never on a child screen), and logs the answer in the open game\'s log', async () => {
    resetPersistRequestForTest()
    const persist = vi.fn(async () => true)
    vi.stubGlobal('navigator', { ...navigator, storage: { persisted: async () => false, persist } })
    const track = vi.fn()
    try {
      const first = render(<ParentArea game="clock" onClose={() => {}} track={track} />)
      await waitFor(() => expect(track).toHaveBeenCalledWith('storage-persist', { persisted: true }))
      first.unmount()
      render(<ParentArea game="clock" onClose={() => {}} track={track} />)
      await new Promise((r) => setTimeout(r, 0))
      expect(persist).toHaveBeenCalledTimes(1)
      expect(track.mock.calls.filter(([e]) => e === 'storage-persist')).toHaveLength(1)
    } finally { vi.unstubAllGlobals(); resetPersistRequestForTest() }
  })

  it('every game registers its part; the registry knows spellquest, the clock, Space Cat, the lessons and English', () => {
    expect(GAMES.map((g) => g.id)).toEqual(['spellquest', 'clock', 'spacecat', 'lessons', 'english'])
  })

  it('progress: each game\'s line and top mix-ups come from its raw save, and no other game\'s save is written', async () => {
    save('alef-spellquest', { stage: { stage: 2 }, runs: 4, bestRun: 9, crystals: 1, screensOpen: true, confusions: { letters: { 'l-bet': { 'l-kaf': 3 } }, vowels: {}, syllables: {} } }, 7)
    save('alef-clock', { progress: { level: 3 }, roundNo: 20, gears: 5, workdays: 2, bestStreak: 6, confusions: { '3:15': { '3:45': 2 } } })
    const writes: string[] = []
    const set = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) { writes.push(k); set.call(this, k, v) })
    const { container } = render(<ParentArea game="clock" onClose={() => {}} />)
    const line = (g: string) => container.querySelector(`[data-progress-game="${g}"] [data-summary]`)!.textContent
    expect(line('spellquest')).toBe('Stage 2 · runs 4 · best run 9 · crystals 1')
    expect(line('clock')).toBe('Level 3 · rounds 20 · gears 5 · workdays 2 · best streak 6')
    expect(line('lessons')).toBe('Not played yet.')
    expect(container.querySelector('[data-progress-game="clock"] [data-mixups]')!.textContent).toBe('3:15 → 3:45: 2')
    expect(container.querySelector('[data-progress-game="spellquest"] [data-mixups] li')!.textContent).toMatch(/→ .*: 3$/)
    await screen.findByText(/Hebrew: mix print and cursive/, {}, LAZY)
    expect(writes.filter((k) => k === 'alef-spellquest' || k === 'alef-progress')).toEqual([])
  })

  it('only the open game\'s settings show', async () => {
    const { container } = render(<ParentArea game="spellquest" onClose={() => {}} />)
    await screen.findByText(/Number range for shopping/, {}, LAZY)
    expect(container.querySelector('[data-spellquest-settings]')).not.toBeNull()
    expect(container.querySelector('[data-clock-settings]')).toBeNull()
    // the frame has the close, boy or girl and sound: the embedded game part does not repeat them
    expect(container.querySelectorAll('[data-parent-close]').length).toBe(1)
    expect(container.querySelectorAll('[data-alef-menu]').length).toBe(0)
    expect(screen.queryByText('Reset progress')).toBeNull()
  })

  it('reset asks, then resets only the open game', async () => {
    const reset = vi.spyOn(gameParent('clock'), 'reset').mockResolvedValue()
    const ask = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    render(<ParentArea game="clock" onClose={() => {}} />)
    const btn = document.querySelector('[data-parent-reset]')!
    expect(btn.textContent).toBe('Reset Clock workshop progress')
    fireEvent.click(btn)
    expect(reset).not.toHaveBeenCalled()
    fireEvent.click(btn)
    expect(ask).toHaveBeenCalledTimes(2)
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('a game\'s reset clears its own save', async () => {
    const { useClockStore } = await import('../clock/store')
    useClockStore.setState({ gears: 7, roundNo: 30 })
    await gameParent('clock').reset()
    expect(useClockStore.getState().gears).toBe(0)
  })

  it('boy or girl and sound are set here and logged by the open game', () => {
    const track = vi.fn()
    const { container } = render(<ParentArea game="spellquest" onClose={() => {}} track={track} />)
    fireEvent.click(screen.getByLabelText('Girl'))
    expect(getGender()).toBe('girl')
    expect(track).toHaveBeenCalledWith('player', { gender: 'girl', by: 'parent' })
    const music = container.querySelector('[data-sound-music]') as HTMLInputElement
    const was = getDeviceSettings().music
    fireEvent.click(music)
    expect(getDeviceSettings().music).toBe(!was)
    expect(track).toHaveBeenCalledWith('settings', { keys: ['music'], music: !was })
  })

  it('Close, the way home on a game\'s page, and the section links', () => {
    const onClose = vi.fn()
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    const { container } = render(<ParentArea game="spellquest" section="data" onClose={onClose} homeHref="/alef/" />)
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(scroll.mock.contexts[0]).toBe(container.querySelector('[data-section="data"]'))
    fireEvent.click(container.querySelector('[data-goto="sound"]')!)
    expect(scroll.mock.contexts[1]).toBe(container.querySelector('[data-section="sound"]'))
    expect(container.querySelector('a[data-alef-menu]')!.getAttribute('href')).toBe('/alef/')
    fireEvent.click(container.querySelector('[data-parent-close]')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('developer: the open game\'s tools only (Spell Quest\'s screens open through the page)', async () => {
    const openDev = vi.fn()
    const b2 = render(<ParentArea game="spellquest" onClose={() => {}} openDev={openDev} />)
    fireEvent.click(await screen.findByText('Stroke review', {}, LAZY))
    expect(openDev).toHaveBeenCalledWith('strokes')
    expect(b2.container.querySelector('[data-dev="dev-mode"]')).toBeNull()
    b2.unmount()
    const lessons = render(<ParentArea game="lessons" onClose={() => {}} />)
    await screen.findByText(/Dev mode/, {}, LAZY)
    expect(lessons.container.querySelector('a[data-dev="routes"]')!.getAttribute('href')).toBe('#/debug/routes')
    expect(lessons.container.querySelector('[data-dev="gallery"]')).toBeNull()
  })

  it('data: each log\'s event count', () => {
    localStorage.setItem('alef-clock-telemetry', JSON.stringify({ v: 1, events: [{ t: 1, s: 'a', run: 0, e: 'x' }, { t: 2, s: 'a', run: 0, e: 'y' }] }))
    const { container } = render(<ParentArea game="clock" onClose={() => {}} />)
    expect(container.querySelector('[data-log="alef-clock-telemetry"] [data-log-count]')!.textContent).toBe('2 events')
    expect(container.querySelector('[data-log="alef-tower-history-telemetry"]')).not.toBeNull()
  })

  // jsdom has no layout, so the width itself is checked by the /verify driver on an upright phone; here: the structure
  it('every table, in every game\'s area, sits in its own sideways-scrolling box (a phone upright never pans the page)', async () => {
    // the tower's history shows its tables only with marks played (the module is loaded here, not at the top: the
    // other tests check that the area creates no other game's store)
    const { useProgressStore } = await import('../stores/progressStore')
    const { INITIAL_PROGRESS_STATE } = await import('../types/progress')
    useProgressStore.setState({ ...INITIAL_PROGRESS_STATE, tower: { ...INITIAL_PROGRESS_STATE.tower,
      byMark: { kamatz: { seen: 3, correct: 2, wrong: 1, timeout: 0, twin: 0, mega: 0 } } } })
    for (const [game, lazyText] of [['lessons', /Dev mode/], ['spellquest', /Mark \(most misses first\)/], ['clock', /Predicted miss/], ['spacecat', /Sums he finds hard/]] as const) {
      const { container, unmount } = render(<ParentArea game={game} onClose={() => {}} />)
      await screen.findByText(lazyText, {}, LAZY)
      const tables = [...container.querySelectorAll('table')]
      expect(tables.length).toBeGreaterThan(game === 'lessons' ? 1 : 2)
      for (const t of tables) expect(t.parentElement!.classList.contains('pa-wide'), `${game}: ${t.outerHTML.slice(0, 60)}`).toBe(true)
      unmount()
    }
    useProgressStore.setState(INITIAL_PROGRESS_STATE)
  }, 60_000)
})
