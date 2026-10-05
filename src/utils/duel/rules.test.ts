import { describe, it, expect } from 'vitest'
import { markById } from './marks'
import { wordsFor } from './words'
import {
  bossFor, isCorrect, isTwin, keyOf, newMonsterAt, padSize, pickEffect, points, screenTypesFor, unlockedMonsters, walkMs,
} from './rules'
import type { Round } from '../../types/duel'

const round = (type: Round['type'], targetId: string): Round => ({
  id: 1, type, target: markById(targetId), runes: [], word: wordsFor(markById(targetId).group)[0], padWords: [],
  monster: 'fuzzy', boss: false, walkMs: 9000,
})
const rune = (id: string) => ({ kind: 'rune' as const, mark: markById(id) })

describe('rules', () => {
  it('A/B/D accept any mark of the sound; C only the named one', () => {
    expect(isCorrect(round('A', 'kamatz'), rune('patach'))).toBe(true)
    expect(isCorrect(round('B', 'cholam'), rune('holam-male'))).toBe(true)
    expect(isCorrect(round('C', 'kamatz'), rune('patach'))).toBe(false)
    expect(isCorrect(round('C', 'kamatz'), rune('kamatz'))).toBe(true)
    expect(isCorrect(round('D', 'shva'), { kind: 'sound', group: 'silent' })).toBe(true)
    expect(isCorrect(round('D', 'shva'), { kind: 'sound', group: 'a' })).toBe(false)
  })
  it('a twin is a same-sound look-alike rune on C only', () => {
    expect(isTwin(round('C', 'kamatz'), rune('patach'))).toBe(true)
    expect(isTwin(round('C', 'kamatz'), rune('segol'))).toBe(false)
    expect(isTwin(round('A', 'kamatz'), rune('patach'))).toBe(false)
    expect(isTwin(round('C', 'cholam'), rune('holam-male'))).toBe(false)
  })
  it('keys distinguish runes and sounds', () => {
    expect(keyOf(rune('kamatz'))).toBe('kamatz')
    expect(keyOf({ kind: 'sound', group: 'a' })).toBe('g-a')
  })
  it('waves: speed floor, screen types, pad sizes', () => {
    expect(walkMs(1, false)).toBe(9000)
    expect(walkMs(2, false)).toBe(8350)
    expect(walkMs(30, false)).toBe(3500)
    expect(walkMs(1, true)).toBeCloseTo(12600)
    expect(screenTypesFor(1)).toEqual(['A']) // D (pick a picture) dropped after playtesting
    expect(screenTypesFor(3)).toEqual(['A', 'B', 'C'])
    expect(padSize(2)).toBe(4)
    expect(padSize(3)).toBe(6)
  })
  it('roster unlocks progressively; bosses alternate', () => {
    expect(unlockedMonsters(1)).toEqual(['fuzzy', 'blob'])
    expect(unlockedMonsters(4)).toEqual(['fuzzy', 'blob', 'imp', 'ghost', 'bat'])
    expect(unlockedMonsters(8)).toHaveLength(8)
    expect(newMonsterAt(1)).toBeNull()
    expect(newMonsterAt(2)).toBe('imp')
    expect(newMonsterAt(5)).toBeNull()
    expect(bossFor(5)).toBe('dragon')
    expect(bossFor(10)).toBe('troll')
    expect(bossFor(15)).toBe('dragon')
  })
  it('points and effects', () => {
    expect(points(0, false)).toBe(100)
    expect(points(3, false)).toBe(160)
    expect(points(0, true)).toBe(300)
    expect(pickEffect(() => 0.1, { final: true, mega: false })).toBe('gentle')
    expect(pickEffect(() => 0.5, { final: true, mega: false })).toBe('boom')
    expect(pickEffect(() => 0.9, { final: true, mega: false })).toBe('mega')
    expect(pickEffect(() => 0.1, { final: true, mega: true })).toBe('mega')
    expect(pickEffect(() => 0.1, { final: true, mega: false, boss: true })).toBe('mega')
    expect(pickEffect(() => 0.1, { final: false, mega: false, boss: true })).toBe('gentle')
  })
})
