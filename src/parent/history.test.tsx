// No way past the gate by history (plan Task 14): the area is a route in the main app, so the gate must show again when
// the child comes back to it with Back or Forward.
import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useNavigate, type NavigateFunction } from 'react-router-dom'
import { HomePage } from '../pages/Home/HomePage'
import { ParentPage } from '../pages/Parent/ParentPage'
import { HOLD_MS } from '../shared/HoldButton'
import { enterYear } from '../shared/parentGate/testing'
import { takeGatePass } from './gateToken'

let go: NavigateFunction
function Nav() { go = useNavigate(); return null }
const app = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Nav />
    <Routes><Route path="/" element={<HomePage />} /><Route path="/settings" element={<ParentPage />} /></Routes>
  </MemoryRouter>,
)
const area = () => document.querySelector('[data-parent-area]')
const home = () => document.querySelector('[data-home]')
const routeGate = () => document.querySelector('.settings-gate')
const openFromHome = () => {
  fireEvent.pointerDown(document.querySelector('[data-home-settings] [aria-label="settings (hold)"]')!)
  act(() => { vi.advanceTimersByTime(HOLD_MS) })
  enterYear(new Date().getFullYear() - 40)
}

// The whole home page and the whole area render here (about 0.7 s and 0.3 s each in jsdom, alone): a busy machine runs
// several times slower, so these tests get more than the default 5 s.
describe('the parent area and the browser history', { timeout: 20_000 }, () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); takeGatePass() })
  afterEach(() => vi.useRealTimers())

  it('open through the home gear\'s gate, Back, then Forward: the gate, not the area', () => {
    app()
    openFromHome()
    expect(area()).not.toBeNull()
    act(() => { go(-1) })
    expect(home()).not.toBeNull()
    act(() => { go(1) })
    expect(area()).toBeNull()
    expect(routeGate()).not.toBeNull()
  })

  it('open, Close: home, and neither Back nor Forward reaches the area', () => {
    app()
    openFromHome()
    fireEvent.click(document.querySelector('[data-parent-close]')!)
    expect(home()).not.toBeNull()
    act(() => { go(-1) })
    expect(area()).toBeNull()
    act(() => { go(1) })
    expect(area()).toBeNull()
  })
})
