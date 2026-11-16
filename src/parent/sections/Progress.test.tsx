import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ProgressSection } from './Progress'
import { addPlaytime } from '../../shared/playtime'

beforeEach(() => { localStorage.clear(); vi.useFakeTimers({ now: new Date('2026-11-16T12:00:00').getTime(), toFake: ['Date'] }) })
afterEach(() => vi.useRealTimers())

describe('the Progress section', () => {
  it('opens with a 7-day table of minutes per game, before the games\' lines', () => {
    addPlaytime('clock', new Date('2026-11-15T09:00:00').getTime(), new Date('2026-11-15T09:12:00').getTime())
    addPlaytime('book2', new Date('2026-11-16T09:00:00').getTime(), new Date('2026-11-16T09:00:20').getTime())
    const { container } = render(<ProgressSection />)
    const rows = container.querySelectorAll('[data-playtime] tbody tr')
    expect(rows).toHaveLength(7)
    expect(rows[5]!.querySelector('[data-game=clock]')!.textContent).toBe('12')
    expect(rows[6]!.querySelector('[data-game=book2]')!.textContent).toBe('<1')
    expect(rows[0]!.querySelector('[data-game=lessons]')!.textContent).toBe('0')
    const table = container.querySelector('[data-playtime]')!
    expect(table.compareDocumentPosition(container.querySelector('[data-progress-game]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
