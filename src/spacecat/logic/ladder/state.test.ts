import { describe, expect, it } from 'vitest'
import { FIRST_JUMP, FIRST_PROBES, LADDER_START, WINDOW, mistakesIn, placementMode, pushWindow, rungOf, withRung } from './state'

describe('the ladder state', () => {
  it('the constants', () => {
    expect([FIRST_JUMP, FIRST_PROBES, WINDOW]).toEqual([8, 16, 6])
  })
  it('a fresh ladder starts the first placement from rung 1, jump 8, 16 probes', () => {
    expect(LADDER_START.mode).toEqual(placementMode('first', '1', 8, 16))
    expect(LADDER_START).toMatchObject({ rungs: {}, day: 0, checkedOn: 0, passes: [], strikeLeft: 0, guardLeft: 0, lastMarks: '', recheckDue: false })
    expect(LADDER_START.lastAt).toBeUndefined()
  })
  it('a missing rung is new; a rung that is new with nothing to remember is dropped', () => {
    expect(rungOf(LADDER_START, '5').status).toBe('new')
    const l = withRung(LADDER_START, '5', { recent: 'o' })
    expect(l.rungs['5']?.recent).toBe('o')
    expect(withRung(l, '5', { recent: '' }).rungs).toEqual({})
  })
  it('a time-out is half a mistake; the window keeps 6', () => {
    expect(mistakesIn('xto')).toBe(1.5)
    expect(pushWindow('oooooo', 'x')).toBe('ooooox')
  })
})
