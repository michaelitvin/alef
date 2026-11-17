// The clock's way home (rule: a way out of the game on a child screen needs a 2 s hold): the same held house as Book 2,
// in the top-left corner of the door, the workshop (also during the bonus game and on the day summary) and the pause
// cover. A tap never leaves; a 2 s hold leaves to alef's home screen, the hub of all the games.
import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { state } = vi.hoisted(() => ({ state: { phase: 'enter', paused: false, exits: 0 } }))
vi.mock('../useWorkday', async () => {
  const { CUSTOMERS } = await import('../logic/workday')
  return {
    useWorkday: () => ({
      view: { phase: state.phase, plan: { exercise: 'find', scaffolds: {}, time: { h: 3, m: 0 } }, customer: CUSTOMERS[0], mood: 'idle',
        gearsToday: 4, fixedKinds: [], explain: null, burst: false, awaitNext: false },
      choose: () => {}, submit: () => {}, replay: () => {}, snap: () => {}, next: () => {}, explainAgain: () => {},
      bonusDone: () => {}, bonusTry: () => {}, again: () => {}, paused: state.paused, resume: () => {},
      exit: () => { state.exits++ },
    }),
  }
})
const { preload } = vi.hoisted(() => ({ preload: vi.fn(() => Promise.resolve()) }))
vi.mock('../assets/preload', () => ({ preloadClockAssets: preload }))
import ClockApp from '../ClockApp'
import { Workshop } from './Workshop'
import { Cover } from './Cover'
import { HOLD_MS } from '../../shared/HoldButton'
import { clockTelemetry } from '../telemetry'
import { setGender, clearGender } from '../../shared/player'
import { useClockStore } from '../store'
import { installFakeAudio } from '../../shared/gameAudio/fakePlayer'

installFakeAudio()
const HOME = '[aria-label="home (hold)"]'

/** a press of `ms` on the button, then the finger goes up */
function press(btn: Element, ms: number) {
  fireEvent.pointerDown(btn)
  act(() => { vi.advanceTimersByTime(ms) })
  fireEvent.pointerUp(btn)
}

describe('the clock\'s held house', () => {
  beforeEach(() => { vi.useFakeTimers(); state.phase = 'enter'; state.paused = false; state.exits = 0 })
  afterEach(() => { vi.useRealTimers() })

  it('is Book 2\'s house: the shared held button with the same glyph, no text, no link', () => {
    const { container } = render(<Workshop onExit={() => {}} />)
    const btn = container.querySelector(HOME)!
    expect(btn).not.toBeNull()
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.classList.contains('hold-btn')).toBe(true)
    expect(btn.classList.contains('home-btn')).toBe(true)
    expect(btn.querySelector('[data-icon="home"]')).not.toBeNull()
    expect(btn.textContent).toBe('')
    // the old plain home button is gone
    expect(container.querySelector('[aria-label="home"]')).toBeNull()
  })

  it('in the workshop: a tap or a short press only shows the hint and never leaves', () => {
    const onExit = vi.fn()
    const { container } = render(<Workshop onExit={onExit} />)
    const btn = container.querySelector(HOME)!
    press(btn, 300)
    expect(btn.getAttribute('data-hold')).toBe('hint')
    act(() => { vi.advanceTimersByTime(HOLD_MS * 2) })
    fireEvent.click(btn)
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(HOLD_MS - 100) })
    fireEvent.pointerLeave(btn)
    act(() => { vi.advanceTimersByTime(HOLD_MS) })
    expect(onExit).not.toHaveBeenCalled()
    expect(state.exits).toBe(0)
  })

  it('in the workshop: a 2 s hold ends the workday (its exit), then leaves', () => {
    const onExit = vi.fn(() => { expect(state.exits).toBe(1) })
    const { container } = render(<Workshop onExit={onExit} />)
    fireEvent.pointerDown(container.querySelector(HOME)!)
    act(() => { vi.advanceTimersByTime(HOLD_MS) })
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('it is on every child screen of the workday: a round, the bonus game, the day summary and the pause cover', () => {
    for (const [phase, paused] of [['enter', false], ['bonus', false], ['summary', false], ['enter', true]] as const) {
      state.phase = phase
      state.paused = paused
      const onExit = vi.fn()
      const { container, unmount } = render(<Workshop onExit={onExit} />)
      const homes = container.querySelectorAll(HOME)
      // one house only: on the pause cover it is the cover's own (the workshop's is under the opaque cover)
      const btn = paused ? container.querySelector(`.ck-pause ${HOME}`) : homes[0]
      expect(btn, `${phase}${paused ? ' paused' : ''}`).not.toBeNull()
      fireEvent.pointerDown(btn!)
      act(() => { vi.advanceTimersByTime(HOLD_MS) })
      expect(onExit, `${phase}${paused ? ' paused' : ''}`).toHaveBeenCalledTimes(1)
      unmount()
    }
  })

  it('on the door: a tap does not leave, a 2 s hold does; it replaces the plain link', () => {
    const onHome = vi.fn()
    const { container } = render(<Cover onPlay={() => {}} onParent={() => {}} onHome={onHome} />)
    expect(container.querySelector('a[href]')).toBeNull()
    const btn = container.querySelector(HOME)!
    press(btn, 300)
    fireEvent.click(btn)
    expect(onHome).not.toHaveBeenCalled()
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(HOLD_MS) })
    expect(onHome).toHaveBeenCalledTimes(1)
  })

  it('the corner: top left, 24 px from the edge, as in Book 2 (the stylesheet)', async () => {
    const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: string, enc: string) => string }
    const css = fs.readFileSync('src/clock/clock.css', 'utf8').replace(/\s+/g, ' ')
    const rule = css.match(/\.ck-root \.home-btn \{([^}]*)\}/)![1]
    expect(rule).toMatch(/left: calc\(24px \+ env\(safe-area-inset-left\)\)/)
    expect(rule).toMatch(/top:/)
    expect(rule).not.toMatch(/right:/)
  })
})

describe('the clock leaves to alef\'s home, the way Book 2 does', () => {
  beforeEach(() => { setGender('boy', 'parent'); useClockStore.setState({ welcomed: true }); state.phase = 'enter'; state.paused = false; state.exits = 0 })
  afterEach(() => { clearGender(); vi.useRealTimers() })

  it('from the workshop: the hold ends the workday, writes the log, and goes to alef\'s home (not the clock\'s door)', async () => {
    const flush = vi.spyOn(clockTelemetry, 'flush')
    const goHome = vi.fn()
    const { container } = render(<ClockApp goHome={goHome} />)
    fireEvent.click(container.querySelector('[aria-label="play"]')!)
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
    expect(container.querySelector('.ck-workshop')).not.toBeNull()
    vi.useFakeTimers()
    fireEvent.pointerDown(container.querySelector(HOME)!)
    act(() => { vi.advanceTimersByTime(HOLD_MS) })
    expect(state.exits).toBe(1)
    expect(flush).toHaveBeenCalled()
    expect(goHome).toHaveBeenCalledTimes(1)
    // nothing of the game stays mounted while the page leaves; the door does not come back
    expect(container.querySelector('.ck-workshop')).toBeNull()
    expect(container.querySelector('.ck-cover')).toBeNull()
    expect(container.querySelector('[data-screen="leaving"]')).not.toBeNull()
    flush.mockRestore()
  })

  it('from the door: the hold goes to alef\'s home; a tap does not', () => {
    vi.useFakeTimers()
    const goHome = vi.fn()
    const { container } = render(<ClockApp goHome={goHome} />)
    const btn = container.querySelector(`.ck-cover ${HOME}`)!
    press(btn, 300)
    expect(goHome).not.toHaveBeenCalled()
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(HOLD_MS) })
    expect(goHome).toHaveBeenCalledTimes(1)
  })
})
