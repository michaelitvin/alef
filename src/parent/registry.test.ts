// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { GAMES, rawSave } from './registry'

// A save that waits for space is still under its old key: the parent area reads it there, as the home does.
describe('rawSave', () => {
  beforeEach(() => localStorage.clear())

  it.each([
    ['Hebrew Spell Quest', 'alef-spellquest-he', ['alef-duel2', 'alef-spellquest']],
    ['English Spell Quest', 'alef-spellquest-en', ['alef-english']],
  ])('%s: the new key, else the newest old key', (_n, key, olds) => {
    expect(GAMES.some((g) => g.saveKey === key)).toBe(true)
    expect(rawSave(key)).toBeNull()
    localStorage.setItem(olds[olds.length - 1]!, '{"old":1}')
    expect(rawSave(key)).toBe('{"old":1}')
    localStorage.setItem(key, '{"new":1}')
    expect(rawSave(key)).toBe('{"new":1}')
  })
})
