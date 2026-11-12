import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => navigate }))
import { HomePage } from './HomePage'
import { useProgressStore } from '../../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../../types/progress'

const page = () => render(<MemoryRouter><HomePage /></MemoryRouter>).container

describe('the home page (spec: one duel, Part 4)', () => {
  beforeEach(() => {
    localStorage.clear()
    navigate.mockClear()
    useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
  })

  it('the home page: duel card, path, separator, clock card, separator, shelf — and none of the old cards', () => {
    const c = page()
    const parts = [...c.querySelectorAll('[data-home] > [data-home-part]')].map((e) => e.getAttribute('data-home-part'))
    expect(parts).toEqual(['duel', 'path', 'separator', 'clock', 'separator', 'shelf'])
    // one duel card (the old duel and Book 2 cards are gone), one clock card, no big level cards
    expect(c.querySelectorAll('a[href$="duel2/"]').length).toBe(1)
    expect(c.querySelectorAll('[aria-label="clock"]').length).toBe(1)
    expect(c.querySelector('a[href$="clock/"]')).not.toBeNull()
    expect(c.querySelectorAll('h3').length).toBe(0)
    // the settings button stays
    fireEvent.click(c.querySelector('button')!)
    expect(navigate).toHaveBeenCalledWith('/settings')
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

  it('the whole rendered home (settings button and stats link too) has no emoji, before and after the first attempts', () => {
    for (const stats of [{}, { totalAttempts: 12, lettersLearned: 3, accuracy: 0.75 }]) {
      useProgressStore.setState({ ...INITIAL_PROGRESS_STATE, stats: { ...INITIAL_PROGRESS_STATE.stats, ...stats } })
      const { container, unmount } = render(<MemoryRouter><HomePage /></MemoryRouter>)
      expect(container.innerHTML).not.toMatch(/\p{Extended_Pictographic}/u)
      unmount()
    }
  })

  it('the settings button and the stats link draw SVG icons, keep their actions, and the stats link keeps its text', () => {
    useProgressStore.setState({ ...INITIAL_PROGRESS_STATE, stats: { ...INITIAL_PROGRESS_STATE.stats, totalAttempts: 12, lettersLearned: 3, accuracy: 0.75 } })
    const c = page()
    const settings = c.querySelector('[data-home-settings]')!
    expect(settings.querySelector('svg')).not.toBeNull()
    fireEvent.click(settings)
    expect(navigate).toHaveBeenLastCalledWith('/settings')
    const stats = c.querySelector('[data-home-stats]')!
    expect(stats.querySelectorAll('svg').length).toBe(2)
    expect(stats.textContent).toContain('3 אותיות נלמדו')
    expect(stats.textContent).toContain('75% דיוק')
    expect(stats.textContent).toContain('לחץ לצפייה בהישגים')
    fireEvent.click(stats)
    expect(navigate).toHaveBeenLastCalledWith('/progress')
  })
})
