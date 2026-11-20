import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installFakeAudio } from '../../shared/gameAudio/fakePlayer'
import { HOLD_MS } from '../../shared/HoldButton'
import { enterYear } from '../../shared/parentGate/testing'
import { DEFAULT_SAVE } from '../saveFormat'
import { useSpaceCatStore } from '../store'
import { Cover } from './Cover'
import { End } from './End'
import { LevelDone } from './LevelDone'
import { TRIANGLE_PATH } from './PlayTriangle'

const { preload } = vi.hoisted(() => ({ preload: vi.fn(() => Promise.resolve()) }))
vi.mock('../assets/preload', () => ({ preloadSpaceCat: preload }))
const { default: SpaceCatApp } = await import('../SpaceCatApp')

const audio = installFakeAudio()
const initial = useSpaceCatStore.getState()
const settle = async (ms = 0) => { await act(async () => { await new Promise((r) => setTimeout(r, ms)) }) }
const year = new Date().getFullYear() - 35

beforeEach(() => { useSpaceCatStore.setState({ ...initial, ...DEFAULT_SAVE }, true) })
afterEach(() => { vi.useRealTimers() })

const cover = () => render(<Cover onPlay={() => {}} loading={false} onParent={() => {}} onHome={() => {}} />)

describe('the cover', () => {
  it('the cover shows no text but digits', () => {
    useSpaceCatStore.setState({ totalPoints: 123, best: 17 })
    const { container } = cover()
    expect(container.textContent).toMatch(/^[0-9\s]*$/)
    expect(container.textContent).toContain('123')
    expect(container.textContent).toContain('17')
  })

  it('the current ship shows once on the cover', () => {
    useSpaceCatStore.setState({ ships: [1, 2], ship: 2 })
    const { container } = cover()
    expect(container.querySelectorAll('[data-ship="2"]')).toHaveLength(1)
    expect(container.querySelector('.sc-ship-current [data-ship="2"]')).not.toBeNull()
    expect(container.querySelector('[data-ship="3"][data-locked]')).not.toBeNull()
    fireEvent.pointerDown(container.querySelector('[data-ship="1"]')!)
    expect(useSpaceCatStore.getState().ship).toBe(1)
  })

  it('a tap on a locked ship says how to get it, once for a burst', async () => {
    const { container } = cover()
    audio.holdUntil(/^info-/)
    const locked = container.querySelector('[data-ship="3"]')!
    fireEvent.pointerDown(locked); fireEvent.pointerDown(locked); fireEvent.pointerDown(locked)
    await settle()
    expect(audio.said()).toEqual(['info-ship-locked-1'])
    expect(useSpaceCatStore.getState().ship).toBe(1)
    audio.release()
  })

  it('the held house is on the cover and the end screen', () => {
    expect(cover().container.querySelector('.home-btn')).not.toBeNull()
    const { container } = render(<End info={{ points: 5, newBest: false, best: 9, level: 1 }} onAgain={() => {}} onHome={() => {}} />)
    expect(container.querySelector('.home-btn')).not.toBeNull()
  })

  it('every play triangle points right', () => {
    const xs = TRIANGLE_PATH.match(/-?\d+(\.\d+)?/g)!.map(Number).filter((_, i) => i % 2 === 0)
    const ys = TRIANGLE_PATH.match(/-?\d+(\.\d+)?/g)!.map(Number).filter((_, i) => i % 2 === 1)
    const tip = xs.indexOf(Math.max(...xs))
    expect(xs.filter((x) => x === xs[tip])).toHaveLength(1)
    expect(ys[tip]).toBe(50)
    for (const c of [cover().container, render(<LevelDone info={{ level: 1, points: 7, newShips: [] }} onNext={() => {}} />).container]) {
      for (const p of c.querySelectorAll('[data-triangle]')) expect(p.getAttribute('d')).toBe(TRIANGLE_PATH)
    }
  })
})

describe('the way into the parent area', () => {
  it('the parent area opens only after the 2 s hold and a right year', () => {
    vi.useFakeTimers()
    const { container } = render(<SpaceCatApp goHome={() => {}} />)
    const btn = container.querySelector('.sc-parent-btn')!
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(HOLD_MS - 300) })
    fireEvent.pointerUp(btn)
    expect(document.querySelector('[data-year-pad]')).toBeNull()
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(HOLD_MS) })
    enterYear(year)
    expect(container.querySelector('[data-screen="parent"]')).not.toBeNull()
  })

  it('a wrong year goes back to the cover and stores nothing', () => {
    vi.useFakeTimers()
    const before = { ...localStorage }
    const { container } = render(<SpaceCatApp goHome={() => {}} />)
    fireEvent.pointerDown(container.querySelector('.sc-parent-btn')!)
    act(() => { vi.advanceTimersByTime(HOLD_MS) })
    enterYear(new Date().getFullYear() - 3)
    expect(document.querySelector('[data-year-pad]')).toBeNull()
    expect(container.querySelector('[data-screen="cover"]')).not.toBeNull()
    expect({ ...localStorage }).toEqual(before)
  })

  it('the cover waits for the preload', async () => {
    let open: () => void = () => {}
    preload.mockImplementation(() => new Promise<void>((r) => { open = r }))
    const { container } = render(<SpaceCatApp goHome={() => {}} />)
    fireEvent.pointerDown(container.querySelector('.sc-play')!)
    await settle()
    expect(container.querySelector('[data-screen="cover"][data-loading]')).not.toBeNull()
    await act(async () => { open() })
    await settle()
    expect(container.querySelector('[data-screen="play"]')).not.toBeNull()
    preload.mockImplementation(() => Promise.resolve())
  })
})

describe('level done and the end', () => {
  it('level done: the new ship takes the cat\'s place', () => {
    const a = render(<LevelDone info={{ level: 3, points: 21, newShips: [2] }} onNext={() => {}} />)
    expect(a.container.querySelector('[data-cat]')).toBeNull()
    expect(a.container.querySelectorAll('[data-ship="2"]')).toHaveLength(1)
    a.unmount()
    const b = render(<LevelDone info={{ level: 1, points: 7, newShips: [] }} onNext={() => {}} />)
    expect(b.container.querySelector('[data-cat]')).not.toBeNull()
    expect(b.container.textContent).toMatch(/^[0-9\s]*$/)
  })

  it('level-done line only the first two times', async () => {
    for (let i = 0; i < 3; i++) {
      const r = render(<LevelDone info={{ level: 1, points: 7, newShips: [] }} onNext={() => {}} />)
      await settle(900)
      r.unmount()
    }
    expect(audio.said().filter((s) => s.startsWith('level-done'))).toHaveLength(2)
    expect(audio.log().filter((e) => e.id === 'level')).toHaveLength(3)
  })

  it('level done: the fanfare, the line, then the new ship\'s sound and line', async () => {
    render(<LevelDone info={{ level: 3, points: 21, newShips: [2] }} onNext={() => {}} />)
    await settle(1500)
    expect(audio.log().filter((e) => e.kind !== 'music').map((e) => e.id)).toEqual(['level', 'level-done-1', 'ship', 'new-ship-1'].map((x) => (x.startsWith('level-done') ? audio.said()[0] : x)))
  })

  it('the end screen marks a new best', async () => {
    const { container } = render(<End info={{ points: 30, newBest: true, best: 30, level: 4 }} onAgain={() => {}} onHome={() => {}} />)
    expect(container.querySelector('[data-new-best]')).not.toBeNull()
    expect(container.textContent).toMatch(/^[0-9\s]*$/)
    await settle(2000)
    expect(audio.said()).toEqual(['out-1', 'new-best-1'])
    const plain = render(<End info={{ points: 3, newBest: false, best: 30, level: 1 }} onAgain={() => {}} onHome={() => {}} />)
    expect(plain.container.querySelector('[data-new-best]')).toBeNull()
  })
})
