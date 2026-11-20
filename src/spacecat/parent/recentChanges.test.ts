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
  it('one placement\'s placed rungs are one row: their count and the top rung, at the newest one\'s time', () => {
    const placed = (t: number, rung: string, by = 'placement') => ev(t, 'ladder', { rung, change: 'placed', by })
    const events = [
      ev(1, 'placement', { phase: 'start', kind: 'first' }),
      placed(10, '1'), ev(11, 'round', {}), placed(20, '2'), placed(20, '3'), placed(30, '5'), placed(30, '4'),
      ev(31, 'placement', { phase: 'end', kind: 'first' }),
      ev(40, 'ladder', { rung: '6', change: 'strike' }),
      ev(50, 'placement', { phase: 'start', kind: 'migration' }),
      placed(60, '7', 'migration'), placed(61, '8', 'migration'),
      placed(62, '9', 'placement'),
    ]
    expect(recentChanges(events, 10)).toEqual([
      { t: 62, rung: '9', change: 'placed', by: 'placement' },
      { t: 61, rung: '8', change: 'placed', by: 'migration', count: 2 },
      { t: 40, rung: '6', change: 'strike' },
      { t: 30, rung: '5', change: 'placed', by: 'placement', count: 5 },
    ])
  })
  it('placed rungs of two placements are two rows, and n counts rows', () => {
    const placed = (t: number, rung: string) => ev(t, 'ladder', { rung, change: 'placed', by: 'placement' })
    const events = [
      ev(1, 'placement', { phase: 'start', kind: 'first' }), placed(2, '1'), placed(3, '2'),
      ev(4, 'placement', { phase: 'start', kind: 'parent' }), placed(5, '1'), placed(6, '2'), placed(7, '3'),
    ]
    expect(recentChanges(events, 1)).toEqual([{ t: 7, rung: '3', change: 'placed', by: 'placement', count: 3 }])
    expect(recentChanges(events, 5)).toHaveLength(2)
  })
})
