// The parent route (#/settings) is a parent screen: the gate shows on every mount unless the home gear's gate has just
// passed, a wrong year goes back home with no message, and Close goes home replacing the route's history entry.
import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigate }))
import { ParentPage } from './ParentPage'
import { HOLD_MS } from '../../shared/HoldButton'
import { enterYear } from '../../shared/parentGate/testing'
import { hasGatePass, passGate, takeGatePass } from '../../parent/gateToken'

const page = () => render(<MemoryRouter><ParentPage /></MemoryRouter>)
const GATE = '[aria-label="settings (hold)"]'
const hold = (c: HTMLElement) => {
  fireEvent.pointerDown(c.querySelector(GATE)!)
  act(() => { vi.advanceTimersByTime(HOLD_MS) })
}

describe('the parent route behind the parent gate', () => {
  beforeEach(() => { vi.useFakeTimers(); navigate.mockClear(); sessionStorage.clear(); takeGatePass() })
  afterEach(() => vi.useRealTimers())

  it('shows the gate, not the area; a right year opens the area at the lessons', () => {
    const { container } = page()
    expect(container.querySelector(GATE)).not.toBeNull()
    expect(document.querySelector('[data-parent-area]')).toBeNull()
    hold(container)
    enterYear(new Date().getFullYear() - 40)
    expect(container.querySelector(GATE)).toBeNull()
    expect(document.querySelector('[data-parent-area="lessons"]')).not.toBeNull()
  })

  it('a wrong year goes back home (replacing the history entry), with no message', () => {
    const { container } = page()
    const text = container.textContent
    hold(container)
    enterYear(new Date().getFullYear() - 7)
    expect(navigate).toHaveBeenCalledWith('/', { replace: true })
    expect(container.textContent).toBe(text)
    expect(document.querySelector('[data-parent-area]')).toBeNull()
  })

  it('a hold shorter than 2 s does nothing; nothing is stored, so a new visit shows the gate again', () => {
    const { container, unmount } = page()
    const btn = container.querySelector(GATE)!
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(HOLD_MS - 500) })
    fireEvent.pointerUp(btn)
    expect(document.querySelector('[data-year-pad]')).toBeNull()
    hold(container)
    enterYear(new Date().getFullYear() - 40)
    unmount()
    expect(sessionStorage.length).toBe(0)
    const again = page()
    expect(again.container.querySelector(GATE)).not.toBeNull()
  })

  it('after the home gear\'s gate the area opens at once, once: the next mount asks again', () => {
    passGate()
    const first = page()
    expect(document.querySelector('[data-parent-area="lessons"]')).not.toBeNull()
    expect(hasGatePass()).toBe(false)
    first.unmount()
    const again = page()
    expect(again.container.querySelector(GATE)).not.toBeNull()
  })

  it('Close goes home and replaces the route\'s history entry', () => {
    passGate()
    page()
    fireEvent.click(document.querySelector('[data-parent-close]')!)
    expect(navigate).toHaveBeenCalledWith('/', { replace: true })
  })
})
