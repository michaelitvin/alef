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
import { useDuel2Store } from '../store'
import Duel2App from '../Duel2App'

const noText = (root: Element) => {
  const clone = root.cloneNode(true) as Element
  // digits (points, data-num) are the one text a child screen shows on purpose
  clone.querySelectorAll('[data-glyph],[data-num]').forEach((e) => e.remove())
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
  it('the end screen shows the points of this run and his best, and only play again (no way out by mistake)', () => {
    useDuel2Store.setState({ bestRun: 14 })
    const { container } = render(<Summary over={{ score: 9, crystals: 0, best: false }} onAgain={() => {}} />)
    expect(container.querySelector('[data-run-score]')!.textContent).toBe('9')
    expect(container.querySelector('[data-best-score]')!.textContent).toBe('14')
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelectorAll('button').length).toBe(1)
  })
  it('the cover shows his coins (one for every 10 stars, kept between plays), and has no link out', () => {
    useDuel2Store.setState({ totalStars: 57 })
    const { container } = render(<Cover onPlay={() => {}} onParent={() => {}} />)
    expect(container.querySelector('[data-coins]')!.textContent).toBe('5')
    expect(container.querySelector('a')).toBeNull()
  })

  it('the cover shows every crystal he has won, by kind (the parent: if he hoards them he should see them)', () => {
    useDuel2Store.setState({ crystals: 0 })
    const none = render(<Cover onPlay={() => {}} onParent={() => {}} />)
    expect(none.container.querySelector('[data-crystal-shelf]')).toBeNull()
    useDuel2Store.setState({ crystals: 6 })
    const { container } = render(<Cover onPlay={() => {}} onParent={() => {}} />)
    const kinds = [...container.querySelectorAll('[data-crystal-kind]')]
    expect(kinds.length).toBe(4)
    expect(kinds.reduce((n, k) => n + Number(k.getAttribute('data-count')), 0)).toBe(6)
  })

})
