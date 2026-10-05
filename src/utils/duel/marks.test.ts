import { describe, it, expect } from 'vitest'
import { DUEL_MARKS, SOUND_GROUPS, markById, twinOf } from './marks'
import { PICTURE_WORDS, wordsFor } from './words'

describe('duel marks', () => {
  it('has the 10 marks from nikkud.yaml with groups', () => {
    expect(DUEL_MARKS.map((m) => m.id)).toEqual(['kamatz', 'patach', 'tzeire', 'segol', 'chirik', 'cholam', 'kubutz', 'shva', 'holam-male', 'shuruk'])
    expect(markById('shva').group).toBe('silent')
    expect(markById('holam-male').vav).toBe('holam')
    expect(markById('shuruk').vav).toBe('shuruk')
    expect(markById('cholam').vav).toBeUndefined()
  })
  it('twins share a sound group', () => {
    expect(twinOf(markById('kamatz'))!.id).toBe('patach')
    expect(twinOf(markById('tzeire'))!.id).toBe('segol')
    expect(twinOf(markById('chirik'))).toBeUndefined()
    expect(twinOf(markById('shva'))).toBeUndefined()
  })
})

describe('picture words', () => {
  it('every sound group has at least 2 words, silent exactly one', () => {
    for (const g of SOUND_GROUPS.filter((g) => g !== 'silent')) expect(wordsFor(g).length, g).toBeGreaterThanOrEqual(2)
    expect(wordsFor('silent').map((w) => w.key)).toEqual(['silent'])
  })
  it('keys are unique and retired ambiguous words are absent', () => {
    const keys = PICTURE_WORDS.map((w) => w.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const retired of ['ear', 'finger', 'blueberries']) expect(keys).not.toContain(retired)
  })
})
