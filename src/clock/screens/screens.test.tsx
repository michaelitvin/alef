import { act, fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
const { playVoice } = vi.hoisted(() => ({ playVoice: vi.fn(() => Promise.resolve()) }))
vi.mock('../audio/clockAudio', () => ({
  playVoice, playSfx: () => Promise.resolve(), stopVoices: () => {}, startMusic: () => {}, stopMusic: () => {},
  preloadVoices: () => {}, configureClockAudio: () => {}, unlockClockAudio: () => {}, muteClockAudio: () => {},
}))
import { Bonus } from './Bonus'
import { Cover } from './Cover'
import { useClockStore } from '../store'

const handAngle = (c: HTMLElement) => Number(/rotate\(([^)]+)\)/.exec(c.querySelector('line[stroke="#e67e22"]')!.getAttribute('transform')!)![1])

// advance 50 ms frames until the hand is within `tol` degrees of `target`, then tap stop
function stopNear(getByRole: (r: string, o: object) => HTMLElement, container: HTMLElement, target: number, tol: number) {
  for (let i = 0; i < 1000; i++) {
    const d = Math.abs(((handAngle(container) - target + 540) % 360) - 180)
    if (d <= tol) break
    act(() => { vi.advanceTimersByTime(50) })
  }
  fireEvent.pointerDown(getByRole('button', { name: 'stop' }))
  act(() => { vi.advanceTimersByTime(1100) })
}

describe('Bonus', { timeout: 30000 }, () => {
  it('stops near 12 score 9 gears over three tries', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    const { getByRole, container } = render(<Bonus onDone={onDone} />)
    for (let i = 0; i < 3; i++) stopNear(getByRole, container, 0, 8)
    act(() => { vi.advanceTimersByTime(2000) })
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledWith(9)
    vi.useRealTimers()
  })
  it('stops far from 12 score 0', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    const { getByRole, container } = render(<Bonus onDone={onDone} />)
    for (let i = 0; i < 3; i++) stopNear(getByRole, container, 180, 8)
    act(() => { vi.advanceTimersByTime(2000) })
    expect(onDone).toHaveBeenCalledWith(0)
    vi.useRealTimers()
  })
  it('does not call onDone after unmount', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    const { getByRole, container, unmount } = render(<Bonus onDone={onDone} />)
    for (let i = 0; i < 2; i++) stopNear(getByRole, container, 0, 8)
    fireEvent.pointerDown(getByRole('button', { name: 'stop' }))
    unmount()
    act(() => { vi.advanceTimersByTime(5000) })
    expect(onDone).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
  it('plays the intro line only when it has not been explained', () => {
    playVoice.mockClear()
    useClockStore.setState({ bonusExplained: true })
    render(<Bonus onDone={() => {}} />).unmount()
    expect(playVoice).not.toHaveBeenCalled()
    useClockStore.setState({ bonusExplained: false })
    render(<Bonus onDone={() => {}} />).unmount()
    expect(playVoice).toHaveBeenCalledTimes(1)
    expect(useClockStore.getState().bonusExplained).toBe(true)
  })
})

describe('Cover', () => {
  it('has an SVG home button to alef, with no text', () => {
    const { getByLabelText } = render(<Cover onPlay={() => {}} onParent={() => {}} />)
    const home = getByLabelText('alef')
    expect(home.getAttribute('href')).toBe(import.meta.env.BASE_URL)
    expect(home.querySelector('svg')).not.toBeNull()
    expect(home.textContent).toBe('')
  })
  it('a 2-second press on the gear opens the parent area; a tap does not', () => {
    vi.useFakeTimers()
    const onParent = vi.fn()
    const { getByLabelText, getByTestId } = render(<Cover onPlay={() => {}} onParent={onParent} />)
    const gear = getByLabelText('parent settings (hold)')
    const ring = getByTestId('parent-ring')
    expect(ring.getAttribute('data-state')).toBe('idle')
    fireEvent.pointerDown(gear)
    expect(ring.getAttribute('data-state')).toBe('holding')
    act(() => { vi.advanceTimersByTime(500) })
    fireEvent.pointerUp(gear)
    expect(ring.getAttribute('data-state')).toBe('hint')
    act(() => { vi.advanceTimersByTime(3000) })
    expect(onParent).not.toHaveBeenCalled()
    expect(ring.getAttribute('data-state')).toBe('idle')
    fireEvent.pointerDown(gear)
    act(() => { vi.advanceTimersByTime(2100) })
    expect(onParent).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
