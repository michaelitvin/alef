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
  it('spells watermelon אֲבַטִּיחַ (avatiach: chataf patach, no dagesh in the bet)', () => {
    expect(PICTURE_WORDS.find((w) => w.key === 'watermelon')!.he.normalize('NFC')).toBe('אֲבַטִּיחַ'.normalize('NFC'))
  })
  it('every sound group has at least 2 words, silent exactly one', () => {
    for (const g of SOUND_GROUPS.filter((g) => g !== 'silent')) expect(wordsFor(g).length, g).toBeGreaterThanOrEqual(2)
    expect(wordsFor('silent').map((w) => w.key)).toEqual(['silent'])
  })
  it('keys are unique and retired ambiguous words are absent', () => {
    const keys = PICTURE_WORDS.map((w) => w.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const retired of ['ear', 'finger', 'blueberries']) expect(keys).not.toContain(retired)
  })
  it('no word whose first vowel is pronounced differently from how it is written (e.g. תְּמָנוּן: shva, said "ta")', () => {
    const keys = PICTURE_WORDS.map((w) => w.key)
    expect(keys).not.toContain('octopus')
    for (const w of PICTURE_WORDS.filter((w) => w.he)) expect(w.he.normalize('NFD')).not.toMatch(/^.\u05BC?\u05B0/) // no shva on the first letter
  })
  it('retires pictures he named with a different word (sheep, מכונית, סירה, woman, mouse)', () => {
    const keys = PICTURE_WORDS.map((w) => w.key)
    for (const retired of ['goat', 'o', 'ship', 'mom', 'hamster']) expect(keys).not.toContain(retired)
  })
  it('the Alef-Bet song words he kept are in, sorted by the vowel of their first syllable', () => {
    const groupOf = Object.fromEntries(PICTURE_WORDS.map((w) => [w.key, w.group]))
    expect(groupOf).toMatchObject({ house: 'a', camel: 'a', eye: 'a', butterfly: 'a', door: 'e', rose: 'e', book: 'e', monkey: 'o' })
    expect(wordsFor('o').map((w) => w.key).sort()).toEqual(['bicycle', 'bus', 'monkey', 'tent'])
    expect(wordsFor('e').map((w) => w.key).sort()).toEqual(['book', 'door', 'e', 'fire', 'rose', 'tree'])
  })
})
