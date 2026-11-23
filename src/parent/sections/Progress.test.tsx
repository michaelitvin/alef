import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ProgressSection } from './Progress'
import { addPlaytime } from '../../shared/playtime'

beforeEach(() => { localStorage.clear(); vi.useFakeTimers({ now: new Date('2026-11-16T12:00:00').getTime(), toFake: ['Date'] }) })
afterEach(() => vi.useRealTimers())

describe('the Progress section', () => {
  it('opens with a 7-day table of minutes per game, before the games\' lines', () => {
    addPlaytime('clock', new Date('2026-11-15T09:00:00').getTime(), new Date('2026-11-15T09:12:00').getTime())
    addPlaytime('spellquest-he', new Date('2026-11-16T09:00:00').getTime(), new Date('2026-11-16T09:00:20').getTime())
    const { container } = render(<ProgressSection />)
    const rows = container.querySelectorAll('[data-playtime] tbody tr')
    expect(rows).toHaveLength(7)
    expect(rows[5]!.querySelector('[data-game=clock]')!.textContent).toBe('12')
    expect(rows[6]!.querySelector('[data-game=spellquest-he]')!.textContent).toBe('<1')
    expect(rows[0]!.querySelector('[data-game=lessons]')!.textContent).toBe('0')
    const table = container.querySelector('[data-playtime]')!
    expect(table.compareDocumentPosition(container.querySelector('[data-progress-game]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('the lessons\' part of the Progress section (the old child progress page, moved here for the parent)', () => {
  const lessons = (state: unknown) => {
    localStorage.setItem('alef-progress', JSON.stringify({ state, version: 1 }))
    return render(<ProgressSection />).container.querySelector('[data-progress-game="lessons"]')!
  }
  const stats = { lettersLearned: 6, totalAttempts: 40, totalCorrect: 30, accuracy: 0.75, sessionCount: 3, bestStreak: 8 }
  const levels = { nikkud: { nodesMastered: 2 }, words: { nodesMastered: 0 }, sentences: { nodesMastered: 0 } }

  it('the summary line: letters learned, answers, accuracy, sessions', () => {
    const p = lessons({ stats, levels })
    expect(p.querySelector('[data-summary]')!.textContent).toBe('Letters learned 6 · answers 40 · accuracy 75% · sessions 3')
  })

  it('the per-level progress: learned out of the level\'s total, with a percent', () => {
    const p = lessons({ stats, levels })
    expect([...p.querySelectorAll('[data-detail="levels"] li')].map((li) => li.textContent)).toEqual([
      'Letters: 6 of 27 (22%)', 'Nikkud: 2 of 8 (25%)', 'Words: 0 of 8 (0%)', 'Sentences: 0 of 6 (0%)',
    ])
  })

  it('the achievements as a compact list: the earned ones say done, the others how far the child is', () => {
    const p = lessons({ stats, levels })
    const d = p.querySelector('[data-detail="achievements"]')!
    expect(d.querySelector('h5')!.textContent).toBe('Achievements: 4 of 10')
    const items = [...d.querySelectorAll('li')].map((li) => li.textContent)
    expect(items).toHaveLength(10)
    expect(items).toContain('1 letter: done')
    expect(items).toContain('5 letters: done')
    expect(items).toContain('10 letters: 6 of 10')
    expect(items).toContain('1 nikkud mark: done')
    expect(items).toContain('90% accuracy: now 75%')
    expect(items).toContain('3 sessions: done')
    expect(d.innerHTML).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('no save yet: the line says not played, and no lists show', () => {
    const p = render(<ProgressSection />).container.querySelector('[data-progress-game="lessons"]')!
    expect(p.querySelector('[data-summary]')!.textContent).toBe('Not played yet.')
    expect(p.querySelector('[data-detail]')).toBeNull()
  })
})
