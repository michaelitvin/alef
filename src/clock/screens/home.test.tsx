// The clock's way home (rule: a plain tap, no hold): the same house as Spell Quest, in the top-left corner of the door,
// the day summary and the pause cover (in a round and the bonus game that corner holds the pause button). A tap leaves at once to alef's
// home screen, the hub of all the games.
import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { state } = vi.hoisted(() => ({ state: { phase: 'enter', paused: false, exits: 0, pauses: 0, resumes: 0 } }))
vi.mock('../useWorkday', async () => {
  const { CUSTOMERS } = await import('../logic/workday')
  return {
    useWorkday: () => ({
      view: { phase: state.phase, plan: { exercise: 'find', scaffolds: {}, time: { h: 3, m: 0 } }, customer: CUSTOMERS[0], mood: 'idle',
        gearsToday: 4, fixedKinds: [], explain: null, burst: false, awaitNext: false },
      choose: () => {}, submit: () => {}, replay: () => {}, snap: () => {}, next: () => {}, explainAgain: () => {},
      bonusDone: () => {}, bonusTry: () => {}, again: () => {}, paused: state.paused, pause: () => { state.pauses++ }, resume: () => { state.resumes++ },
      exit: () => { state.exits++ },
    }),
  }
})
const { preload } = vi.hoisted(() => ({ preload: vi.fn(() => Promise.resolve()) }))
vi.mock('../assets/preload', () => ({ preloadClockAssets: preload }))
import ClockApp from '../ClockApp'
import { Workshop } from './Workshop'
import { Cover } from './Cover'
import { clockTelemetry } from '../telemetry'
import { setGender, clearGender } from '../../shared/player'
import { useClockStore } from '../store'
import { installFakeAudio } from '../../shared/gameAudio/fakePlayer'

installFakeAudio()
const HOME = '[aria-label="home"]'
const PAUSE = '[aria-label="pause"]'

describe('the clock\'s house', () => {
  beforeEach(() => { vi.useFakeTimers(); state.phase = 'enter'; state.paused = false; state.exits = 0; state.pauses = 0; state.resumes = 0 })
  afterEach(() => { vi.useRealTimers() })

  it('is Spell Quest\'s house: the shared plain button with the same glyph, no text, no link', () => {
    const { container } = render(<Cover onPlay={() => {}} onHome={() => {}} onParent={() => {}} />)
    const btn = container.querySelector(HOME)!
    expect(btn).not.toBeNull()
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.classList.contains('hold-btn')).toBe(false)
    expect(btn.classList.contains('home-btn')).toBe(true)
    expect(btn.querySelector('[data-icon="home"]')).not.toBeNull()
    expect(btn.textContent).toBe('')
  })

  it('in a round the corner holds the pause button, not the house: a tap pauses and does not leave', () => {
    const onExit = vi.fn()
    const { container } = render(<Workshop onExit={onExit} />)
    expect(container.querySelector(HOME)).toBeNull()
    const btn = container.querySelector(PAUSE)!
    expect(btn.classList.contains('home-btn')).toBe(true)
    expect(btn.querySelector('[data-icon="pause"]')).not.toBeNull()
    expect(btn.textContent).toBe('')
    fireEvent.click(btn)
    expect(state.pauses).toBe(1)
    expect(state.exits).toBe(0)
    expect(onExit).not.toHaveBeenCalled()
  })

  it('the pause cover: play resumes, the house ends the workday (its exit), then leaves', () => {
    state.paused = true
    const onExit = vi.fn(() => { expect(state.exits).toBe(1) })
    const { container } = render(<Workshop onExit={onExit} />)
    expect(container.querySelector(`.ck-workshop > ${PAUSE}`)).toBeNull()
    fireEvent.click(container.querySelector('.ck-pause [aria-label="play"]')!)
    expect(state.resumes).toBe(1)
    fireEvent.click(container.querySelector(`.ck-pause ${HOME}`)!)
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('the pause button is on a round and the bonus game; the day summary keeps the house', () => {
    for (const [phase, pause] of [['enter', true], ['bonus', true], ['summary', false]] as const) {
      state.phase = phase
      const onExit = vi.fn()
      const { container, unmount } = render(<Workshop onExit={onExit} />)
      expect(container.querySelector(PAUSE) !== null, phase).toBe(pause)
      if (!pause) {
        fireEvent.click(container.querySelector(HOME)!)
        expect(onExit).toHaveBeenCalledTimes(1)
      }
      unmount()
    }
  })

  it('on the door: a tap leaves; it replaces the plain link', () => {
    const onHome = vi.fn()
    const { container } = render(<Cover onPlay={() => {}} onParent={() => {}} onHome={onHome} />)
    expect(container.querySelector('a[href]')).toBeNull()
    const btn = container.querySelector(HOME)!
    fireEvent.click(btn)
    expect(onHome).toHaveBeenCalledTimes(1)
  })

  it('the corner: top left, 24 px from the edge, as in Spell Quest (the stylesheet)', async () => {
    const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: string, enc: string) => string }
    const css = fs.readFileSync('src/clock/clock.css', 'utf8').replace(/\s+/g, ' ')
    const rule = css.match(/\.ck-root \.home-btn \{([^}]*)\}/)![1]
    expect(rule).toMatch(/left: calc\(24px \+ env\(safe-area-inset-left\)\)/)
    expect(rule).toMatch(/top:/)
    expect(rule).not.toMatch(/right:/)
  })
})

describe('the clock leaves to alef\'s home, the way Spell Quest does', () => {
  beforeEach(() => { setGender('boy', 'parent'); useClockStore.setState({ welcomed: true }); state.phase = 'enter'; state.paused = false; state.exits = 0; state.pauses = 0; state.resumes = 0 })
  afterEach(() => { clearGender(); vi.useRealTimers() })

  it('from the workshop: pause, then the cover\'s house ends the workday, writes the log, and goes to alef\'s home (not the clock\'s door)', async () => {
    const flush = vi.spyOn(clockTelemetry, 'flush')
    const goHome = vi.fn()
    const { container, rerender } = render(<ClockApp goHome={goHome} />)
    fireEvent.click(container.querySelector('[aria-label="play"]')!)
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
    expect(container.querySelector('.ck-workshop')).not.toBeNull()
    fireEvent.click(container.querySelector(PAUSE)!)
    expect(state.pauses).toBe(1)
    expect(goHome).not.toHaveBeenCalled()
    state.paused = true
    rerender(<ClockApp goHome={goHome} />)
    fireEvent.click(container.querySelector(`.ck-pause ${HOME}`)!)
    expect(state.exits).toBe(1)
    expect(flush).toHaveBeenCalled()
    expect(goHome).toHaveBeenCalledTimes(1)
    // nothing of the game stays mounted while the page leaves; the door does not come back
    expect(container.querySelector('.ck-workshop')).toBeNull()
    expect(container.querySelector('.ck-cover')).toBeNull()
    expect(container.querySelector('[data-screen="leaving"]')).not.toBeNull()
    flush.mockRestore()
  })

  it('from the door: a tap goes to alef\'s home', () => {
    const goHome = vi.fn()
    const { container } = render(<ClockApp goHome={goHome} />)
    const btn = container.querySelector(`.ck-cover ${HOME}`)!
    fireEvent.click(btn)
    expect(goHome).toHaveBeenCalledTimes(1)
  })
})
