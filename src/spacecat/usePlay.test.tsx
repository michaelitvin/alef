import { act, fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { installFakeAudio } from '../shared/gameAudio/fakePlayer'
import { HOLD_MS } from '../shared/HoldButton'
import { PLAYTIME_KEY } from '../shared/playtime'
import type { Engine } from './canvas/engine'
import { memorySavePort } from './savePort'
import { Play } from './screens/Play'

installFakeAudio()

function engineStub() {
  const e = {
    made: 0, destroyed: 0,
    setScreen() {}, setShip() {}, setHud() {}, play() {}, freeze() {}, resume() {}, setInput() {},
    demoHand: () => Promise.resolve(), pulseRing() {}, restart() {}, onEnd: () => {}, destroy() { e.destroyed++ },
  }
  return e
}
const settle = async () => { for (let i = 0; i < 6; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)) }) }

function renderPlay(over: Partial<Parameters<typeof Play>[0]> = {}) {
  const stub = engineStub()
  const goHome = vi.fn()
  const r = render(<Play onEnd={() => {}} goHome={goHome} save={memorySavePort({ runs: 1, heard: { demo: 1 } })}
    makeEngine={() => { stub.made++; return stub as unknown as Engine }} {...over} />)
  return { ...r, stub, goHome }
}

describe('the play hook', () => {
  it('one controller per mount, destroyed on unmount', async () => {
    const { stub, unmount } = renderPlay()
    await settle()
    expect(stub.made).toBe(1)
    unmount()
    expect(stub.destroyed).toBe(1)
  })

  it('the view follows the controller', async () => {
    const { container } = renderPlay()
    await settle()
    expect(container.querySelector('[data-phase="flight"]')).not.toBeNull()
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    expect(container.querySelector('[data-paused]')).not.toBeNull()
    expect(container.querySelector('[data-screen-part="pause"]')).not.toBeNull()
    fireEvent.pointerDown(container.querySelector('.sc-pause [aria-label="play"]')!)
    expect(container.querySelector('[data-paused]')).toBeNull()
  })

  it('the play time runs only while the flight shows', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      localStorage.removeItem(PLAYTIME_KEY)
      const { container, unmount } = renderPlay()
      await settle()
      vi.setSystemTime(Date.now() + 60_000)
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
      act(() => { document.dispatchEvent(new Event('visibilitychange')) })
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
      act(() => { document.dispatchEvent(new Event('visibilitychange')) })
      expect(container.querySelector('[data-paused]')).not.toBeNull()
      // paused: these ten minutes do not count
      vi.setSystemTime(Date.now() + 600_000)
      unmount()
      const days = JSON.parse(localStorage.getItem(PLAYTIME_KEY)!).days as Record<string, { spacecat?: number }>
      const total = Object.values(days).reduce((n, d) => n + (d.spacecat ?? 0), 0)
      expect(total).toBeGreaterThanOrEqual(60_000)
      expect(total).toBeLessThan(120_000)
    } finally { vi.useRealTimers() }
  })
})

describe('the play screen', () => {
  it('the held house is the top bar\'s first item and is on the pause cover', async () => {
    const { container } = renderPlay()
    await settle()
    expect(container.querySelector('.sc-topbar')!.firstElementChild!.matches('.home-btn')).toBe(true)
    act(() => { window.dispatchEvent(new Event('pagehide')) })
    expect(container.querySelector('.sc-pause .home-btn')).not.toBeNull()
  })

  it('the held house leaves only after 2 s', async () => {
    const { container, goHome } = renderPlay()
    await settle()
    vi.useFakeTimers()
    try {
      const house = container.querySelector('.sc-topbar .home-btn')!
      fireEvent.pointerDown(house)
      act(() => { vi.advanceTimersByTime(HOLD_MS / 2) })
      fireEvent.pointerUp(house)
      expect(goHome).not.toHaveBeenCalled()
      fireEvent.pointerDown(house)
      act(() => { vi.advanceTimersByTime(HOLD_MS) })
      expect(goHome).toHaveBeenCalledTimes(1)
    } finally { vi.useRealTimers() }
  })
})
