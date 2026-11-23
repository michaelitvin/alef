// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { getNumberRange, NUMBER_RANGE_KEY, setNumberRange } from './numberRange'

const spellQuestSave = (range: unknown) => localStorage.setItem('alef-spellquest-he', JSON.stringify({ state: { settings: { range } }, version: 7 }))

describe('the number range', () => {
  beforeEach(() => localStorage.clear())

  it('a new player shops up to 100, and that is stored', () => {
    expect(getNumberRange()).toBe(100)
    expect(JSON.parse(localStorage.getItem(NUMBER_RANGE_KEY)!)).toEqual({ v: 1, range: 100 })
  })

  it('seeds from an old Spell Quest save once; a later change of Spell Quest\'s own field does not reach it', () => {
    spellQuestSave(10)
    expect(getNumberRange()).toBe(10)
    spellQuestSave(1000)
    expect(getNumberRange()).toBe(10)
  })

  it('a Spell Quest value that is no range seeds 100; a broken alef-range seeds again', () => {
    spellQuestSave(7)
    expect(getNumberRange()).toBe(100)
    localStorage.setItem(NUMBER_RANGE_KEY, '{not json')
    spellQuestSave(1000)
    expect(getNumberRange()).toBe(1000)
  })

  it('setNumberRange stores it', () => {
    setNumberRange(10)
    expect(JSON.parse(localStorage.getItem(NUMBER_RANGE_KEY)!)).toEqual({ v: 1, range: 10 })
    expect(getNumberRange()).toBe(10)
  })
})
