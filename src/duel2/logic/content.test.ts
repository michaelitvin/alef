import { describe, expect, it } from 'vitest'
import { ITEMS, MARKS, GROUP_MARKS, SHAPE_GROUPS, isAllowed, itemsOfStage, syllable, syllablesOfStage, soundOfItem } from './content.ts'

describe('content', () => {
  it('26 items, 4 soft', () => {
    expect(ITEMS.length).toBe(26)
    expect(ITEMS.filter((i) => i.soft).map((i) => i.id)).toEqual(['vet', 'khaf', 'fe', 'sin'])
  })
  it('syllable text is NFC and ordered', () => {
    expect(syllable('bet', 'kamatz').text).toBe('בָּ'.normalize('NFC'))
    expect(syllable('shin', 'chirik').text).toBe('שִׁ'.normalize('NFC'))
    expect(syllable('lamed', 'shuruk').text).toBe('לוּ'.normalize('NFC'))
    expect(syllable('mem', 'cholam-male').text).toBe('מוֹ'.normalize('NFC'))
    expect(syllable('vet', 'segol').text).toBe('בֶ'.normalize('NFC'))
  })
  it('same-sound items share a sound id', () => {
    expect(syllable('tet', 'kamatz').soundId).toBe('syl-t-a')
    expect(syllable('tav', 'patach').soundId).toBe('syl-t-a')
    expect(syllable('vav', 'segol').soundId).toBe(syllable('vet', 'tsere').soundId)
    expect(syllable('alef', 'chirik').soundId).toBe('syl-0-i')
  })
  it('stage 2 has no soft items, stage 3 has all', () => {
    expect(syllablesOfStage(2).some((s) => s.item.soft)).toBe(false)
    expect(syllablesOfStage(3).length).toBe(26 * 9 - 2)
    expect(itemsOfStage(1).length).toBe(26)
  })
  it('ambiguous or misread syllables are left out', () => {
    // וֹ looks like the vowel cholam male "o"; יִ looks like an upside-down "!" (legibility sheet 2026-10-20)
    expect(isAllowed('vav', 'cholam')).toBe(false)
    expect(isAllowed('yod', 'chirik')).toBe(false)
    expect(isAllowed('vav', 'cholam-male')).toBe(true)
    expect(syllablesOfStage(3).some((s) => s.id === 'vav-cholam' || s.id === 'yod-chirik')).toBe(false)
  })
  it('99 distinct syllable sounds (yi is left out)', () => {
    expect(new Set(syllablesOfStage(3).map((s) => s.soundId)).size).toBe(99)
  })
  it('marks and groups', () => {
    expect(MARKS.length).toBe(9)
    expect(GROUP_MARKS.u).toEqual(['kubutz', 'shuruk'])
    expect(soundOfItem('qof')).toBe('k')
    expect(SHAPE_GROUPS.flat().every((id) => ITEMS.some((i) => i.id === id))).toBe(true)
  })
})
