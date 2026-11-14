// The way home from a full run (the parent, 2026-11-14: "there is no way out of the game and back to the main menu"):
// a home button that needs a 2 s hold, in the top bar's left corner (the parent: "the home button belongs on the left"),
// on the pause cover and on the summary; a tap never leaves.
import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { View } from '../controller'

const { state } = vi.hoisted(() => ({ state: { view: null as unknown, exit: [] as number[] } }))
vi.mock('../useRun', () => ({
  useRun: () => ({ view: state.view, clock: () => 0, onGesture: () => {}, onNext: () => {}, onReplay: () => {}, onHint: () => {}, resume: () => {},
    towerAnswer: () => {}, towerDone: () => {}, towerWaveEnd: () => {}, exit: () => { state.exit.push(1) } }),
}))
import { Play } from './Play'
import { Summary } from './Summary'
import { HOLD_MS } from '../components/HoldButton'

const base: View = { phase: 'answer', hearts: 3, screen: { screen: 'ghosts', signs: [], target: { id: 'x', soundId: 'x' } as never }, overlay: null, needNext: false, hintAvailable: false, paused: false, over: null, score: 0, mult: 1 }
const HOME = '[aria-label="home (hold)"]'

function setSize(w: number, h: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: h })
}

describe('the held home button (rule: a way out on a child screen needs a 2 s hold)', () => {
  beforeEach(() => { vi.useFakeTimers(); state.view = base; state.exit.length = 0; setSize(1180, 820) })
  afterEach(() => { vi.useRealTimers() })

  it('in a full run: a tap or a short press only shows the hint, never leaves', () => {
    const onExit = vi.fn()
    const { container } = render(<Play opts={{}} onOver={() => {}} onExit={onExit} />)
    const btn = container.querySelector(`.d2-topbar ${HOME}`)!
    expect(btn).not.toBeNull()
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(300) })
    fireEvent.pointerUp(btn)
    expect(btn.getAttribute('data-hold')).toBe('hint')
    act(() => { vi.advanceTimersByTime(HOLD_MS * 2) })
    expect(btn.getAttribute('data-hold')).toBe('idle')
    // a press that slides off the button is no hold either
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(HOLD_MS - 100) })
    fireEvent.pointerLeave(btn)
    act(() => { vi.advanceTimersByTime(HOLD_MS) })
    expect(onExit).not.toHaveBeenCalled()
    expect(state.exit.length).toBe(0)
  })

  it('it is the first item in the bar\'s left group, before the speaker; the counts are not with it', () => {
    state.view = { ...base, screen: { screen: 'ghosts', signs: [], target: { id: 'x', soundId: 'x' } } as never }
    const { container } = render(<Play opts={{}} onOver={() => {}} onExit={() => {}} />)
    const bar = container.querySelector('.d2-topbar')!
    const leftGroup = bar.firstElementChild!
    expect(leftGroup.classList.contains('d2-topbar-side')).toBe(true)
    expect(leftGroup.firstElementChild!.matches(HOME)).toBe(true)
    expect(bar.querySelector(`.d2-hearts ${HOME}`)).toBeNull()
    expect(bar.lastElementChild!.classList.contains('d2-hearts')).toBe(true)
  })

  it('on the pause cover and the summary it is in the left corner, 24 px from the edge (the stylesheet)', async () => {
    const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: string, enc: string) => string }
    const css = fs.readFileSync('src/duel2/duel2.css', 'utf8').replace(/\s+/g, ' ')
    for (const where of ['pause', 'summary']) {
      const rule = css.match(new RegExp(`\\.d2-${where} \\.d2-home-btn \\{([^}]*)\\}`))![1]
      expect(rule, where).toMatch(/left: 24px;/)
      expect(rule, where).not.toMatch(/right:/)
    }
  })

  it('a 2 s hold stops the run (its exit), then leaves', () => {
    const onExit = vi.fn(() => { expect(state.exit.length).toBe(1) })
    const { container } = render(<Play opts={{}} onOver={() => {}} onExit={onExit} />)
    fireEvent.pointerDown(container.querySelector(HOME)!)
    act(() => { vi.advanceTimersByTime(HOLD_MS) })
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(state.exit.length).toBe(1)
  })

  it('it works on the pause cover too', () => {
    state.view = { ...base, paused: true }
    const onExit = vi.fn()
    const { container } = render(<Play opts={{}} onOver={() => {}} onExit={onExit} />)
    const btn = container.querySelector(`.d2-pause ${HOME}`)!
    expect(btn).not.toBeNull()
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(HOLD_MS) })
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('there is none in a path session (it goes home by itself) or in the gallery', () => {
    const s = render(<Play opts={{ session: { screen: 'ghosts' } }} onOver={() => {}} onExit={() => {}} />)
    expect(s.container.querySelector(HOME)).toBeNull()
    s.unmount()
    state.view = { ...base, paused: true }
    const p = render(<Play opts={{ session: { screen: 'ghosts' } }} onOver={() => {}} onExit={() => {}} />)
    expect(p.container.querySelector(HOME)).toBeNull()
    p.unmount()
    const g = render(<Play opts={{ sandbox: true }} onOver={() => {}} onExit={() => {}} />)
    expect(g.container.querySelector(HOME)).toBeNull()
  })

  it('a phone on its side: not in the bar where the content rises into the band (the doors), there on the other screens', () => {
    setSize(780, 360)
    state.view = { ...base, screen: { screen: 'doors', word: { id: 'w', text: 'w' }, lit: 0, keys: [], target: { id: 'w' } } as never }
    const d = render(<Play opts={{}} onOver={() => {}} onExit={() => {}} />)
    expect(d.container.querySelector(HOME)).toBeNull()
    d.unmount()
    state.view = base
    const g = render(<Play opts={{}} onOver={() => {}} onExit={() => {}} />)
    expect(g.container.querySelector(HOME)).not.toBeNull()
  })

  it('the summary of a full run: a tap does not leave, a 2 s hold does; a session\'s summary has none', () => {
    const onExit = vi.fn()
    const { container } = render(<Summary over={{ score: 5, crystals: 0, best: false }} onAgain={() => {}} onExit={onExit} />)
    const btn = container.querySelector(HOME)!
    fireEvent.pointerDown(btn)
    fireEvent.pointerUp(btn)
    act(() => { vi.advanceTimersByTime(HOLD_MS * 2) })
    expect(onExit).not.toHaveBeenCalled()
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(HOLD_MS) })
    expect(onExit).toHaveBeenCalledTimes(1)
    const s = render(<Summary over={{ score: 5, crystals: 0, best: false, session: true }} onAgain={() => {}} onHome={() => {}} onExit={onExit} />)
    expect(s.container.querySelector(HOME)).toBeNull()
  })
})
