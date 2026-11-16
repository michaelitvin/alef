import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ParentGate } from './ParentGate'
import { HOLD_MS } from '../HoldButton'
import { enterYear } from './testing'
import { YEAR_QUESTION } from './YearPad'

const BTN = '[aria-label="parent (hold)"]'
const pad = () => document.querySelector('[data-year-pad]')
const year = (ago: number) => new Date().getFullYear() - ago

describe('the parent gate (rule: a 2 s hold, then the year of birth)', () => {
  let writes: string[]
  beforeEach(() => {
    vi.useFakeTimers()
    writes = []
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string) { writes.push(k) })
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
  const setup = () => {
    const onOpen = vi.fn()
    const onCancel = vi.fn()
    const r = render(<div data-child><ParentGate label="parent (hold)" className="x" onOpen={onOpen} onCancel={onCancel} /></div>)
    const hold = () => {
      fireEvent.pointerDown(r.container.querySelector(BTN)!)
      act(() => { vi.advanceTimersByTime(HOLD_MS) })
    }
    return { ...r, onOpen, onCancel, hold }
  }

  it('a hold shorter than 2 s does nothing', () => {
    const { container, onOpen } = setup()
    const btn = container.querySelector(BTN)!
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(HOLD_MS - 300) })
    fireEvent.pointerUp(btn)
    act(() => { vi.advanceTimersByTime(HOLD_MS * 2) })
    expect(pad()).toBeNull()
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('the hold opens a number pad: the digits, and one written question for the parent', () => {
    const { hold } = setup()
    hold()
    const p = pad()!
    expect(p).not.toBeNull()
    expect([...p.querySelectorAll('[data-digit]')].map((k) => k.getAttribute('data-digit')).sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
    const q = p.querySelector('[data-year-question]')!
    expect(q.textContent).toBe(YEAR_QUESTION)
    expect(q.textContent).toMatch(/שנת הלידה/)
    const rest = p.cloneNode(true) as HTMLElement
    rest.querySelector('[data-year-question]')!.remove()
    expect(rest.textContent!.replace(/[\d\s]/g, '')).toBe('')
  })

  it('a right year opens', () => {
    const { hold, onOpen, onCancel } = setup()
    hold()
    enterYear(year(40))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
    expect(pad()).toBeNull()
  })

  it('a wrong year goes back, with no message', () => {
    const { container, hold, onOpen, onCancel } = setup()
    for (const y of [year(5), year(101), year(-3)]) {
      hold()
      enterYear(y)
      expect(pad()).toBeNull()
    }
    expect(onOpen).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalledTimes(3)
    expect(document.body.textContent).toBe(container.textContent)
    expect(container.textContent).toBe('')
  })

  it('the delete key takes back a digit', () => {
    const { hold, onOpen } = setup()
    hold()
    enterYear('19')
    act(() => { fireEvent.click(document.querySelector('[data-pad-delete]')!) })
    enterYear('985')
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('a tap beside the pad cancels', () => {
    const { hold, onOpen, onCancel } = setup()
    hold()
    fireEvent.pointerDown(document.querySelector('[data-pad-backdrop]')!)
    expect(pad()).toBeNull()
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('stores nothing', () => {
    const { hold } = setup()
    hold()
    enterYear(year(40))
    hold()
    enterYear(year(3))
    expect(writes).toEqual([])
  })
})
