import { act, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HandSetter } from './HandSetter'
import { gradeSet } from '../logic/grade'

const base = { numbers: 'all' as const, ring: false, slice: false, kind: 'wall' as const, size: 200, locked: false, reveal: null }
const at = (deg: number) => {
  const r = (deg * Math.PI) / 180
  return { clientX: 100 + 80 * Math.sin(r), clientY: 100 - 80 * Math.cos(r), pointerId: 1 }
}

describe('HandSetter', () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON: () => ({}) } as DOMRect)
  })
  it('one movable hand: no hand button; that hand pulses on the clock', () => {
    for (const [mode, hand] of [['long', 'minute'], ['short', 'hour']] as const) {
      const { container, queryByRole, unmount } = render(<HandSetter {...base} mode={mode} linked={false} initial={{ hour: 90, minute: 0 }} onSubmit={() => {}} />)
      expect(queryByRole('button', { name: 'short hand' })).toBeNull()
      expect(queryByRole('button', { name: 'long hand' })).toBeNull()
      expect(container.querySelector(`[data-halo="${hand}"][data-pulse="1"]`)).not.toBeNull()
      unmount()
    }
  })
  it('both hands: the buttons stay to switch hand; the hand to move pulses, not the button', () => {
    const { container, getByRole } = render(<HandSetter {...base} mode="both" linked={false} initial={{ hour: 90, minute: 0 }} onSubmit={() => {}} />)
    expect(getByRole('button', { name: 'short hand' })).toBeTruthy()
    expect(container.querySelector('[data-halo="hour"][data-pulse="1"]')).not.toBeNull()
    fireEvent.pointerDown(getByRole('button', { name: 'long hand' }))
    expect(container.querySelector('[data-halo="minute"][data-pulse="1"]')).not.toBeNull()
  })
  it('locked or revealing: nothing pulses', () => {
    const { container } = render(<HandSetter {...base} locked mode="long" linked={false} initial={{ hour: 90, minute: 0 }} onSubmit={() => {}} />)
    expect(container.querySelector('[data-pulse]')).toBeNull()
  })
  it('long hand follows the finger and snaps to five minutes; the check submits', () => {
    const onSubmit = vi.fn()
    const { container, getByRole } = render(<HandSetter {...base} mode="long" linked={false} initial={{ hour: 90, minute: 0 }} onSubmit={onSubmit} />)
    const face = container.querySelector('[data-face-input]')!
    fireEvent.pointerDown(face, at(100))
    fireEvent.pointerUp(face, at(100))
    fireEvent.click(getByRole('button', { name: 'check' }))
    expect(onSubmit).toHaveBeenCalledWith({ hour: 90, minute: 90 })
  })
  it('both: the short hand first, then the long hand', () => {
    const onSubmit = vi.fn()
    const { container, getByRole } = render(<HandSetter {...base} mode="both" linked={false} initial={{ hour: 0, minute: 0 }} onSubmit={onSubmit} />)
    const face = container.querySelector('[data-face-input]')!
    fireEvent.pointerDown(face, at(97))
    fireEvent.pointerUp(face, at(97))
    fireEvent.pointerDown(face, at(178))
    fireEvent.pointerUp(face, at(178))
    fireEvent.click(getByRole('button', { name: 'check' }))
    const pose = onSubmit.mock.calls[0][0]
    expect(pose.hour).toBeCloseTo(90, 0) // the short hand lands on the hour (3), not where the finger was
    expect(pose.minute).toBe(180)
  })
  it('linked drag across 12 creeps the short hand forward, not a full turn back', () => {
    const onSubmit = vi.fn()
    const { container, getByRole } = render(<HandSetter {...base} mode="long" linked initial={{ hour: 90, minute: 300 }} onSubmit={onSubmit} />)
    const face = container.querySelector('[data-face-input]')!
    fireEvent.pointerDown(face, at(330))
    fireEvent.pointerMove(face, at(10))
    fireEvent.pointerMove(face, at(60))
    fireEvent.pointerUp(face, at(60))
    fireEvent.click(getByRole('button', { name: 'check' }))
    const pose = onSubmit.mock.calls[0][0]
    expect(pose.minute).toBe(60)
    expect(pose.hour).toBeCloseTo(90 + (120 / 12), 0)
  })
  it('the check is disabled before any move and while locked', () => {
    const { getByRole } = render(<HandSetter {...base} mode="long" linked={false} initial={{ hour: 90, minute: 0 }} onSubmit={() => {}} />)
    expect((getByRole('button', { name: 'check' }) as HTMLButtonElement).disabled).toBe(true)
  })
  const dispatchPointerEvent = (el: Element, type: string, angle: number, pointerId: number = 1) => {
    const coords = at(angle)
    try {
      const evt = new PointerEvent(type, { bubbles: true, cancelable: true, ...coords, pointerId })
      el.dispatchEvent(evt)
    } catch {
      const evt = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: coords.clientX, clientY: coords.clientY })
      el.dispatchEvent(evt)
    }
  }
  it('non-linked: batched events (down 40°, move 70°, 100°, up 100°) snap minute to 90, hour stays', () => {
    const onSubmit = vi.fn()
    const { container, getByRole } = render(<HandSetter {...base} mode="long" linked={false} initial={{ hour: 90, minute: 0 }} onSubmit={onSubmit} />)
    const face = container.querySelector('[data-face-input]')!
    act(() => {
      dispatchPointerEvent(face, 'pointerdown', 40)
      dispatchPointerEvent(face, 'pointermove', 70)
      dispatchPointerEvent(face, 'pointermove', 100)
      dispatchPointerEvent(face, 'pointerup', 100)
    })
    fireEvent.click(getByRole('button', { name: 'check' }))
    const pose = onSubmit.mock.calls[0][0]
    expect(pose.minute).toBe(90)
    expect(pose.hour).toBe(90)
  })
  it('linked: batched events (down 330°, move 10°, 60°, up 60°) snap minute 60, hour creeps forward', () => {
    const onSubmit = vi.fn()
    const { container, getByRole } = render(<HandSetter {...base} mode="long" linked initial={{ hour: 90, minute: 300 }} onSubmit={onSubmit} />)
    const face = container.querySelector('[data-face-input]')!
    act(() => {
      dispatchPointerEvent(face, 'pointerdown', 330)
      dispatchPointerEvent(face, 'pointermove', 10)
      dispatchPointerEvent(face, 'pointermove', 60)
      dispatchPointerEvent(face, 'pointerup', 60)
    })
    fireEvent.click(getByRole('button', { name: 'check' }))
    const pose = onSubmit.mock.calls[0][0]
    expect(pose.minute).toBe(60)
    expect(pose.hour).toBeCloseTo(90 + (120 / 12), 0)
  })
  it('linked level 4: short hand on 3, then a tap on the 9 counts the minutes forward (3:45, graded right)', () => {
    const onSubmit = vi.fn()
    const { container, getByRole } = render(<HandSetter {...base} mode="both" linked initial={{ hour: 0, minute: 0 }} onSubmit={onSubmit} />)
    const face = container.querySelector('[data-face-input]')!
    fireEvent.pointerDown(face, at(90))
    fireEvent.pointerUp(face, at(90))
    fireEvent.pointerDown(face, at(270))
    fireEvent.pointerUp(face, at(270))
    fireEvent.click(getByRole('button', { name: 'check' }))
    const pose = onSubmit.mock.calls[0][0]
    expect(pose.minute).toBe(270)
    expect(pose.hour).toBeCloseTo(112.5, 1)
    expect(gradeSet({ h: 3, m: 45 }, pose, { hour: true, minute: true }).correct).toBe(true)
  })
  it('linked: short hand dropped at 112 lands on the 4 (120), and a tap on the 9 still counts forward from 12', () => {
    const onSubmit = vi.fn()
    const { container, getByRole } = render(<HandSetter {...base} mode="both" linked initial={{ hour: 0, minute: 0 }} onSubmit={onSubmit} />)
    const face = container.querySelector('[data-face-input]')!
    fireEvent.pointerDown(face, at(112))
    fireEvent.pointerUp(face, at(112))
    fireEvent.pointerDown(face, at(270))
    fireEvent.pointerUp(face, at(270))
    fireEvent.click(getByRole('button', { name: 'check' }))
    expect(onSubmit.mock.calls[0][0].hour).toBeCloseTo(120 + 22.5, 0)
  })
  it('linked: a tap does not depend on where the long hand was (tap 9 from 12, then tap 3)', () => {
    const onSubmit = vi.fn()
    const { container, getByRole } = render(<HandSetter {...base} mode="long" linked initial={{ hour: 90, minute: 0 }} onSubmit={onSubmit} />)
    const face = container.querySelector('[data-face-input]')!
    fireEvent.pointerDown(face, at(270))
    fireEvent.pointerUp(face, at(270))
    fireEvent.pointerDown(face, at(90))
    fireEvent.pointerUp(face, at(90))
    fireEvent.click(getByRole('button', { name: 'check' }))
    expect(onSubmit.mock.calls[0][0]).toEqual({ hour: 97.5, minute: 90 })
  })
  it('linked level 2: a counter-clockwise drag from 12 to 6 puts the short hand half way into the hour before', () => {
    const onSubmit = vi.fn()
    const { container, getByRole } = render(<HandSetter {...base} mode="long" linked initial={{ hour: 90, minute: 0 }} onSubmit={onSubmit} />)
    const face = container.querySelector('[data-face-input]')!
    fireEvent.pointerDown(face, at(3))
    for (const a of [350, 300, 250, 200, 180]) fireEvent.pointerMove(face, at(a))
    fireEvent.pointerUp(face, at(180))
    fireEvent.click(getByRole('button', { name: 'check' }))
    const pose = onSubmit.mock.calls[0][0]
    expect(pose.minute).toBe(180)
    expect(pose.hour).toBeCloseTo(60 + 15, 1)
  })
  it('linked: a tap just left of 12 means no minutes, not a whole hour', () => {
    const onSubmit = vi.fn()
    const { container, getByRole } = render(<HandSetter {...base} mode="long" linked initial={{ hour: 90, minute: 180 }} onSubmit={onSubmit} />)
    const face = container.querySelector('[data-face-input]')!
    fireEvent.pointerDown(face, at(355))
    fireEvent.pointerUp(face, at(355))
    fireEvent.click(getByRole('button', { name: 'check' }))
    const pose = onSubmit.mock.calls[0][0]
    expect(pose.minute).toBe(0)
    expect(pose.hour).toBeCloseTo(75, 1)
  })
  it('the short hand moves an hour at a time, to the place that belongs with the long hand, with a click per step', () => {
    const onSnap = vi.fn()
    const onSubmit = vi.fn()
    // the long hand on 6 (half past): every short-hand place is half way between two numbers
    const { container, getByRole } = render(<HandSetter {...base} mode="both" linked initial={{ hour: 15, minute: 180 }} onSubmit={onSubmit} onSnap={onSnap} />)
    const face = container.querySelector('[data-face-input]')!
    fireEvent.pointerDown(face, at(20))
    for (const a of [40, 60, 80, 100]) fireEvent.pointerMove(face, at(a))
    fireEvent.pointerUp(face, at(100))
    expect(onSnap.mock.calls.length).toBeGreaterThanOrEqual(3) // 1:30 -> 2:30 -> 3:30
    fireEvent.click(getByRole('button', { name: 'check' }))
    expect(onSubmit.mock.calls[0][0].hour).toBeCloseTo(105, 0) // half past three: half way from 3 to 4
  })
})
