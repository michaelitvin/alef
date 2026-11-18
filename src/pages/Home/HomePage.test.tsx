import { act, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigate }))
import { HomePage } from './HomePage'
import { useProgressStore } from '../../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../../types/progress'
import { HOLD_MS } from '../../shared/HoldButton'
import { enterYear } from '../../shared/parentGate/testing'
import { hasGatePass, takeGatePass } from '../../parent/gateToken'

const page = () => render(<MemoryRouter><HomePage /></MemoryRouter>).container

describe('the home page (spec: one duel, Part 4)', () => {
  beforeEach(() => {
    localStorage.clear()
    navigate.mockClear()
    useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
  })

  it('the home page: duel card, path, separator, clock card, separator, Space Cat card, separator, shelf — and none of the old cards', () => {
    const c = page()
    const parts = [...c.querySelectorAll('[data-home] > [data-home-part]')].map((e) => e.getAttribute('data-home-part'))
    expect(parts).toEqual(['duel', 'path', 'separator', 'clock', 'separator', 'spacecat', 'separator', 'shelf'])
    // one duel card (the old duel and Book 2 cards are gone), one clock card, no big level cards
    expect(c.querySelectorAll('a[href$="duel2/"]').length).toBe(1)
    expect(c.querySelectorAll('[aria-label="clock"]').length).toBe(1)
    expect(c.querySelector('a[href$="clock/"]')).not.toBeNull()
    expect(c.querySelectorAll('h3').length).toBe(0)
    // the settings button stays (the parent gate: see below)
    expect(c.querySelector('[data-home-settings] [aria-label="settings (hold)"]')).not.toBeNull()
  })

  it('the clock card: its art, three small faces 3:00 3:30 3:15, the brass play button and its parent line', () => {
    const c = page()
    const clk = c.querySelector('[data-home-part="clock"]')!
    expect([...clk.querySelectorAll('.home-faces [data-face]')].map((e) => e.getAttribute('data-face'))).toEqual(['3:00', '3:30', '3:15'])
    expect(clk.querySelector('.home-cface [data-face="10:10"]')).not.toBeNull()
    expect(clk.querySelector('[data-play="clock"]')).not.toBeNull()
    expect(clk.querySelectorAll('img').length).toBe(3)
    expect(clk.querySelector('[data-learn="clock"]')!.textContent).toBe('מה לומדים: לקרוא שעון מחוגים: שעות שלמות, חצאים ורבעים, ואחר כך כל חמש דקות. בעברית ובאנגלית.')
  })

  it('the space cat card: its art, three planets 3 4 7, its play button, its parent line and its credit line', () => {
    const c = page()
    const sc = c.querySelector('[data-home-part="spacecat"]')!
    expect(sc.querySelector('a[href$="spacecat/"]')).not.toBeNull()
    expect([...sc.querySelectorAll('[data-planet]')].map((e) => e.getAttribute('data-planet'))).toEqual(['3', '4', '7'])
    expect(sc.querySelector('[data-play="spacecat"]')).not.toBeNull()
    expect(sc.querySelector('[data-learn="spacecat"]')!.textContent).toBe('מה לומדים: חיבור וחיסור עד 10, מספר חסר בתרגיל, ואחר כך חיבור וחיסור עד 20. המשחק מתאים את עצמו לילד, גם במהירות.')
    expect(sc.querySelector('[data-credit="spacecat"]')!.textContent).toBe('קרדיט: איגור אבא של ריי')
    // the credit is its own line, below the learn line
    expect(sc.querySelector('[data-learn="spacecat"]')!.nextElementSibling).toBe(sc.querySelector('[data-credit="spacecat"]'))
  })

  it('the card follows the saved ship', () => {
    localStorage.setItem('alef-spacecat', JSON.stringify({ state: { ship: 3 }, version: 1 }))
    expect(page().querySelector('[data-home-part="spacecat"] [data-ship]')!.getAttribute('data-ship')).toBe('3')
  })

  it('the home never writes the Space Cat save', () => {
    const writes: string[] = []
    const set = Storage.prototype.setItem
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) { writes.push(k); set.call(this, k, v) })
    try {
      page()
      expect(writes.filter((k) => k.includes('spacecat'))).toEqual([])
      expect(localStorage.getItem('alef-spacecat')).toBeNull()
    } finally { spy.mockRestore() }
  })

  it('the shelf opens an unlocked level and ignores a locked one', () => {
    const c = page()
    expect(c.querySelector('.home-shelfh')!.textContent).toBe('פעילויות נוספות')
    expect(c.querySelectorAll('[data-level]').length).toBe(6)
    const stories = c.querySelector('[data-level="stories"]')!
    expect(stories.getAttribute('data-open')).toBe('true')
    fireEvent.click(stories)
    expect(navigate).toHaveBeenLastCalledWith('/stories')
    const locked = [...c.querySelectorAll('[data-level][data-open="false"]')]
    expect(locked.length).toBeGreaterThan(0)
    navigate.mockClear()
    for (const l of locked) {
      expect(l.querySelector('[data-lock]')).not.toBeNull()
      fireEvent.click(l)
    }
    expect(navigate).not.toHaveBeenCalled()
    const letters = c.querySelector('[data-level="letters"]')!
    if (letters.getAttribute('data-open') === 'true') { fireEvent.click(letters); expect(navigate).toHaveBeenLastCalledWith('/letters') }
  })

  it('the path never scrolls vertically', () => {
    // jsdom does not apply CSS files: the class carries the rule (overflow-y: hidden); the real check runs in the browser QA
    const c = page()
    expect(c.querySelector('[data-path]')!.classList.contains('home-path')).toBe(true)
  })

  it('the home page shows no emoji', () => {
    const c = page()
    const main = c.querySelector('[data-home]')!
    expect(main.textContent ?? '').not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('the whole rendered home (the settings button too) has no emoji, before and after the first attempts', () => {
    for (const stats of [{}, { totalAttempts: 12, lettersLearned: 3, accuracy: 0.75 }]) {
      useProgressStore.setState({ ...INITIAL_PROGRESS_STATE, stats: { ...INITIAL_PROGRESS_STATE.stats, ...stats } })
      const { container, unmount } = render(<MemoryRouter><HomePage /></MemoryRouter>)
      expect(container.innerHTML).not.toMatch(/\p{Extended_Pictographic}/u)
      unmount()
    }
  })

  it('the home shows no stats text and no progress link (the stats are the parent\'s, in the parent area)', () => {
    useProgressStore.setState({ ...INITIAL_PROGRESS_STATE, stats: { ...INITIAL_PROGRESS_STATE.stats, totalAttempts: 12, lettersLearned: 3, accuracy: 0.75 } })
    const c = page()
    expect(c.querySelector('[data-home-stats]')).toBeNull()
    expect(c.textContent).not.toContain('אותיות נלמדו')
    expect(c.textContent).not.toContain('דיוק')
    expect(c.textContent).not.toContain('צפה בהתקדמות')
    expect(c.querySelector('[data-home-settings] svg')).not.toBeNull()
    for (const el of c.querySelectorAll('button, a, [role="button"]')) fireEvent.click(el)
    expect(navigate).not.toHaveBeenCalledWith('/progress')
  })

  it('the settings gear is the parent gate: a tap does nothing; a 2 s hold and the year of birth open the area at once', () => {
    vi.useFakeTimers()
    try {
      const c = page()
      const gear = c.querySelector('[data-home-settings] [aria-label="settings (hold)"]')!
      fireEvent.click(gear)
      fireEvent.pointerDown(gear)
      act(() => { vi.advanceTimersByTime(HOLD_MS - 500) })
      fireEvent.pointerUp(gear)
      expect(document.querySelector('[data-year-pad]')).toBeNull()
      expect(navigate).not.toHaveBeenCalled()
      // a wrong year: no area, no message, still home
      fireEvent.pointerDown(gear)
      act(() => { vi.advanceTimersByTime(HOLD_MS) })
      enterYear(new Date().getFullYear() - 6)
      expect(navigate).not.toHaveBeenCalled()
      expect(hasGatePass()).toBe(false)
      fireEvent.pointerDown(gear)
      act(() => { vi.advanceTimersByTime(HOLD_MS) })
      enterYear(new Date().getFullYear() - 40)
      expect(navigate).toHaveBeenCalledWith('/settings')
      expect(hasGatePass()).toBe(true)
    } finally {
      takeGatePass()
      vi.useRealTimers()
    }
  })
})
