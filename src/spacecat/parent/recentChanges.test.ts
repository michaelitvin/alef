import { describe, expect, it } from 'vitest'
import { recentChanges } from './recentChanges'

const ev = (t: number, e: string, f: Record<string, unknown> = {}) => ({ t, s: 'a', run: 0, e, ...f })

describe('recentChanges', () => {
  it('keeps only ladder events, newest first, at most n', () => {
    const events = [
      ev(1, 'ladder', { rung: '1', change: 'passed', by: 'fast' }),
      ev(2, 'round', { item: 'x' }),
      ev(3, 'ladder', { rung: '2', change: 'held', days: 2 }),
      ev(4, 'ladder', { rung: '3', change: 'strike' }),
    ]
    expect(recentChanges(events, 2)).toEqual([
      { t: 4, rung: '3', change: 'strike' },
      { t: 3, rung: '2', change: 'held', days: 2 },
    ])
    expect(recentChanges(events, 10)).toHaveLength(3)
  })
  it('skips a ladder event without a rung or change, and gives nothing for an empty log', () => {
    expect(recentChanges([ev(1, 'ladder', { rung: '1' }), ev(2, 'ladder', { change: 'free' })], 5)).toEqual([])
    expect(recentChanges([], 5)).toEqual([])
  })
})
