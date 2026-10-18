import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ClockFace, angleFromPointer, caseImgStyle } from './ClockFace'

describe('ClockFace', () => {
  it('draws 12 numbers, or 4, or none', () => {
    const count = (n: 'all' | 'quarters' | 'none') =>
      render(<ClockFace pose={{ hour: 90, minute: 0 }} numbers={n} size={200} />).container.querySelectorAll('[data-num]').length
    expect(count('all')).toBe(12)
    expect(count('quarters')).toBe(4)
    expect(count('none')).toBe(0)
  })
  it('rotates the hands to the pose', () => {
    const { container } = render(<ClockFace pose={{ hour: 105, minute: 180 }} size={200} />)
    expect(container.querySelector('[data-hand="hour"]')!.getAttribute('style')).toContain('rotate(105deg)')
    expect(container.querySelector('[data-hand="minute"]')!.getAttribute('style')).toContain('rotate(180deg)')
  })
  it('draws the ring and the seconds hand only when asked', () => {
    const plain = render(<ClockFace pose={{ hour: 0, minute: 0 }} size={200} />).container
    expect(plain.querySelector('[data-ring]')).toBeNull()
    expect(plain.querySelector('[data-hand="second"]')).toBeNull()
    const full = render(<ClockFace pose={{ hour: 0, minute: 0 }} ring secondsFrom={30} size={200} />).container
    expect(full.querySelector('[data-ring]')).not.toBeNull()
    expect(full.querySelector('[data-hand="second"]')).not.toBeNull()
  })
  it('angleFromPointer: 12 is 0°, 3 is 90°', () => {
    const rect = { left: 0, top: 0, width: 200, height: 200 } as DOMRect
    expect(angleFromPointer(100, 0, rect)).toBeCloseTo(0)
    expect(angleFromPointer(200, 100, rect)).toBeCloseTo(90)
    expect(angleFromPointer(0, 100, rect)).toBeCloseTo(270)
  })
  it('caseImgStyle puts the case disc exactly under the SVG face', () => {
    // face radius is 92/110 of half the size: 0.418 x size
    const s = caseImgStyle({ cx: 0.4, cy: 0.6, r: 0.3 }, 200)
    expect(s.width).toBeCloseTo((0.418181 * 200) / 0.3, 2)
    expect(s.left).toBe(100)
    expect(s.top).toBe(100)
    expect(s.transform).toBe('translate(-40%, -60%)')
  })
  it('uses the positioned case image for a kind with a disc, the CSS one otherwise', () => {
    const { container } = render(<ClockFace pose={{ hour: 0, minute: 0 }} kind="wall" size={200} testCase={{ url: 'x.webp', disc: { cx: 0.5, cy: 0.5, r: 0.4 } }} />)
    const img = container.querySelector('img')!
    expect(img.style.width).not.toBe('')
    expect(img.className).toBe('ck-case')
    expect(img.style.pointerEvents).toBe('none')
    const none = render(<ClockFace pose={{ hour: 0, minute: 0 }} kind="wall" size={200} testCase={{ url: 'x.webp', disc: undefined }} />).container.querySelector('img')!
    expect(none.style.width).toBe('')
    expect(none.style.pointerEvents).toBe('none')
  })
  it('a frozen seconds hand waits at its start, then ticks from there', () => {
    vi.useFakeTimers()
    const sec = (c: HTMLElement) => c.querySelector('[data-hand="second"]')!.getAttribute('style')
    const { container, rerender } = render(<ClockFace pose={{ hour: 0, minute: 0 }} size={200} secondsFrom={120} secondsFrozen />)
    act(() => { vi.advanceTimersByTime(3000) })
    expect(sec(container)).toContain('rotate(120deg)')
    rerender(<ClockFace pose={{ hour: 0, minute: 0 }} size={200} secondsFrom={120} secondsFrozen={false} />)
    expect(sec(container)).toContain('rotate(120deg)')
    act(() => { vi.advanceTimersByTime(2000) })
    expect(sec(container)).toContain('rotate(132deg)')
    vi.useRealTimers()
  })
})
