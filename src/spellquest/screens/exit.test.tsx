// The way home from a full run (the parent, 2026-11-14: "there is no way out of the game and back to the main menu"):
// a plain tap (the parent: "If the kid wants out don't stop him."): the house on the pause cover and on the summary, and in the
// top bar's left corner the pause button, which shows the pause cover.
import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { View } from '../controller'

const { state } = vi.hoisted(() => ({ state: { view: null as unknown, exit: [] as number[], paused: [] as number[], resumed: [] as number[] } }))
vi.mock('../useRun', () => ({
  useRun: () => ({ view: state.view, clock: () => 0, onGesture: () => {}, onNext: () => {}, onReplay: () => {}, onHint: () => {}, resume: () => { state.resumed.push(1) }, pause: () => { state.paused.push(1) },
    towerAnswer: () => {}, towerDone: () => {}, towerWaveEnd: () => {}, exit: () => { state.exit.push(1) } }),
}))
import { Play } from './Play'
import { Summary } from './Summary'
import { Cover } from './Cover'

const base: View = { course: { id: 'he', dir: 'rtl' }, phase: 'answer', hearts: 3, screen: { screen: 'ghosts', signs: [], target: { id: 'x', soundId: 'x' } as never }, overlay: null, needNext: false, hintAvailable: false, paused: false, over: null, score: 0, mult: 1 }
const HOME = '[aria-label="home"]'
const PAUSE = '[aria-label="pause"]'

function setSize(w: number, h: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: h })
}

describe('the pause button and the house (rule: a tap leaves at once from the pause cover)', () => {
  beforeEach(() => { vi.useFakeTimers(); state.view = base; state.exit.length = 0; state.paused.length = 0; state.resumed.length = 0; setSize(1180, 820) })
  afterEach(() => { vi.useRealTimers() })

  it('in a full run: the bar has the pause button, not the house; a tap pauses the run and does not leave', () => {
    const onExit = vi.fn()
    const { container } = render(<Play opts={{}} onOver={() => {}} onExit={onExit} />)
    expect(container.querySelector(`.d2-topbar ${HOME}`)).toBeNull()
    const btn = container.querySelector(`.d2-topbar ${PAUSE}`)!
    expect(btn).not.toBeNull()
    expect(btn.classList.contains('home-btn')).toBe(true)
    fireEvent.click(btn)
    expect(state.paused.length).toBe(1)
    expect(state.exit.length).toBe(0)
    expect(onExit).not.toHaveBeenCalled()
  })

  it('the pause button is the first item in the bar\'s left group, before the speaker; the counts are not with it', () => {
    state.view = { ...base, screen: { screen: 'ghosts', signs: [], target: { id: 'x', soundId: 'x' } } as never }
    const { container } = render(<Play opts={{}} onOver={() => {}} onExit={() => {}} />)
    const bar = container.querySelector('.d2-topbar')!
    const leftGroup = bar.firstElementChild!
    expect(leftGroup.classList.contains('d2-topbar-side')).toBe(true)
    expect(leftGroup.firstElementChild!.matches(PAUSE)).toBe(true)
    expect(bar.querySelector(`.d2-hearts ${PAUSE}`)).toBeNull()
    expect(bar.lastElementChild!.classList.contains('d2-hearts')).toBe(true)
  })

  it('on the pause cover and the summary it is in the left corner, 24 px from the edge (the stylesheet)', async () => {
    const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: string, enc: string) => string }
    const css = fs.readFileSync('src/spellquest/spellquest.css', 'utf8').replace(/\s+/g, ' ')
    for (const where of ['pause', 'summary']) {
      const rule = css.match(new RegExp(`\\.d2-${where} \\.d2-home-btn \\{([^}]*)\\}`))![1]
      expect(rule, where).toMatch(/left: 24px;/)
      expect(rule, where).not.toMatch(/right:/)
    }
  })

  it('on the pause cover: the house stops the run (its exit), then leaves; play resumes', () => {
    state.view = { ...base, paused: true }
    const onExit = vi.fn(() => { expect(state.exit.length).toBe(1) })
    const { container } = render(<Play opts={{}} onOver={() => {}} onExit={onExit} />)
    fireEvent.click(container.querySelector('.d2-pause [aria-label="play"]')!)
    expect(state.resumed.length).toBe(1)
    const btn = container.querySelector(`.d2-pause ${HOME}`)!
    expect(btn).not.toBeNull()
    fireEvent.click(btn)
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(state.exit.length).toBe(1)
  })

  it('there is no pause button or house in a path session (it goes home by itself) or in the gallery', () => {
    const s = render(<Play opts={{ session: { screen: 'ghosts' } }} onOver={() => {}} onExit={() => {}} />)
    expect(s.container.querySelector(HOME)).toBeNull()
    expect(s.container.querySelector(PAUSE)).toBeNull()
    s.unmount()
    state.view = { ...base, paused: true }
    const p = render(<Play opts={{ session: { screen: 'ghosts' } }} onOver={() => {}} onExit={() => {}} />)
    expect(p.container.querySelector(HOME)).toBeNull()
    p.unmount()
    const g = render(<Play opts={{ sandbox: true }} onOver={() => {}} onExit={() => {}} />)
    expect(g.container.querySelector(HOME)).toBeNull()
    expect(g.container.querySelector(PAUSE)).toBeNull()
  })

  it('a phone on its side: not in the bar where the content rises into the band (the doors), there on the other screens', () => {
    setSize(780, 360)
    state.view = { ...base, screen: { screen: 'doors', word: { id: 'w', text: 'w' }, lit: 0, keys: [], target: { id: 'w' } } as never }
    const d = render(<Play opts={{}} onOver={() => {}} onExit={() => {}} />)
    expect(d.container.querySelector(PAUSE)).toBeNull()
    d.unmount()
    state.view = base
    const g = render(<Play opts={{}} onOver={() => {}} onExit={() => {}} />)
    expect(g.container.querySelector(PAUSE)).not.toBeNull()
  })

  it('the summary of a full run: a tap leaves; a session\'s summary has none', () => {
    const onExit = vi.fn()
    const { container } = render(<Summary over={{ score: 5, crystals: 0, best: false }} onAgain={() => {}} onExit={onExit} />)
    const btn = container.querySelector(HOME)!
    fireEvent.click(btn)
    expect(onExit).toHaveBeenCalledTimes(1)
    const s = render(<Summary over={{ score: 5, crystals: 0, best: false, session: true }} onAgain={() => {}} onHome={() => {}} onExit={onExit} />)
    expect(s.container.querySelector(HOME)).toBeNull()
  })

  it('on the cover too, in the same corner as in the clock: a tap leaves', () => {
    const onHome = vi.fn()
    const { container } = render(<Cover onPlay={() => {}} onParent={() => {}} onHome={onHome} />)
    const btn = container.querySelector(`.d2-cover ${HOME}`)!
    expect(btn.classList.contains('home-btn')).toBe(true)
    fireEvent.click(btn)
    expect(onHome).toHaveBeenCalledTimes(1)
  })
})
