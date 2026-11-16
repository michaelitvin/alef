// The settings page is a parent screen: the gate shows on every visit (the home gear only navigates here), and a wrong
// year goes back home with no message.
import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigate }))
import { SettingsPage } from './SettingsPage'
import { HOLD_MS } from '../../shared/HoldButton'
import { enterYear } from '../../shared/parentGate/testing'

const page = () => render(<MemoryRouter><SettingsPage /></MemoryRouter>)
const hold = (c: HTMLElement) => {
  fireEvent.pointerDown(c.querySelector('[aria-label="settings (hold)"]')!)
  act(() => { vi.advanceTimersByTime(HOLD_MS) })
}
const devToggle = () => [...document.querySelectorAll('button')].some((b) => /dev|מפתח/i.test(b.textContent ?? ''))

describe('the settings page behind the parent gate', () => {
  beforeEach(() => { vi.useFakeTimers(); navigate.mockClear(); sessionStorage.clear() })
  afterEach(() => vi.useRealTimers())

  it('shows the gate, not the settings; a right year opens them', () => {
    const { container } = page()
    expect(container.querySelector('[aria-label="settings (hold)"]')).not.toBeNull()
    const before = container.innerHTML
    hold(container)
    enterYear(new Date().getFullYear() - 40)
    expect(container.querySelector('[aria-label="settings (hold)"]')).toBeNull()
    expect(container.innerHTML).not.toBe(before)
    expect(devToggle() || container.textContent!.length > 0).toBe(true)
  })

  it('a wrong year goes back home (replacing the history entry), with no message', () => {
    const { container } = page()
    const text = container.textContent
    hold(container)
    enterYear(new Date().getFullYear() - 7)
    expect(navigate).toHaveBeenCalledWith('/', { replace: true })
    expect(container.textContent).toBe(text)
  })

  it('a hold shorter than 2 s does nothing; nothing is stored, so a new visit shows the gate again', () => {
    const { container, unmount } = page()
    const btn = container.querySelector('[aria-label="settings (hold)"]')!
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(HOLD_MS - 500) })
    fireEvent.pointerUp(btn)
    expect(document.querySelector('[data-year-pad]')).toBeNull()
    hold(container)
    enterYear(new Date().getFullYear() - 40)
    unmount()
    expect(sessionStorage.length).toBe(0)
    const again = page()
    expect(again.container.querySelector('[aria-label="settings (hold)"]')).not.toBeNull()
  })
})
