import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
const { gate } = vi.hoisted(() => {
  let open: () => void = () => {}
  const p = new Promise<void>((r) => { open = r })
  return { gate: { p, open: () => open() } }
})
vi.mock('../assets/preload', () => ({ READY_MS: 8000, preloadDuel2Assets: () => gate.p }))
import { Cover } from './Cover'
import { PauseCover } from './PauseCover'
import { Summary } from './Summary'
import Duel2App from '../Duel2App'

const noText = (root: Element) => {
  const clone = root.cloneNode(true) as Element
  clone.querySelectorAll('[data-glyph]').forEach((e) => e.remove())
  return clone.textContent?.replace(/\s+/g, '') ?? ''
}

describe('shell', () => {
  afterEach(() => vi.useRealTimers())
  it('cover has no text', () => {
    const { container } = render(<Cover onPlay={() => {}} onParent={() => {}} />)
    expect(noText(container)).toBe('')
    expect(container.querySelectorAll('[data-glyph]').length).toBeGreaterThan(0)
  })
  it('parent button needs a 2 s hold', () => {
    vi.useFakeTimers()
    const onParent = vi.fn()
    render(<Cover onPlay={() => {}} onParent={onParent} />)
    const btn = screen.getByLabelText('parent settings (hold)')
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(500) })
    fireEvent.pointerUp(btn)
    expect(onParent).not.toHaveBeenCalled()
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(2000) })
    expect(onParent).toHaveBeenCalledTimes(1)
  })
  it('play waits for preload', async () => {
    const { container } = render(<Duel2App />)
    fireEvent.click(screen.getByLabelText('play'))
    expect(container.querySelector('[data-screen="cover"]')).not.toBeNull()
    await act(async () => { gate.open(); await gate.p })
    expect(container.querySelector('[data-screen="play"]')).not.toBeNull()
  })
  it('pause cover hides the game', () => {
    const onPlay = vi.fn()
    const { container } = render(<PauseCover onPlay={onPlay} />)
    expect(container.querySelector('.d2-pause')).not.toBeNull()
    expect(noText(container)).toBe('')
    fireEvent.click(screen.getByLabelText('play'))
    expect(onPlay).toHaveBeenCalled()
  })
  it('summary shows the crystals and has no text', () => {
    const { container } = render(<Summary over={{ score: 9, crystals: 2, best: true }} onAgain={() => {}} />)
    expect(container.querySelectorAll('[data-crystal-icon]').length).toBe(2)
    expect(container.querySelector('[data-best]')).not.toBeNull()
    expect(noText(container)).toBe('')
  })
})
