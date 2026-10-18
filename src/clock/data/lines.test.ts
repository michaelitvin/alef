import { describe, expect, it } from 'vitest'
import { LINES, parseLine } from './lines'

describe('lines', () => {
  it('parses cues onto the following word', () => {
    expect(parseLine('The {short}short hand.')).toEqual({ words: ['The', 'short', 'hand.'], cues: [{ word: 1, cue: 'short' }], spoken: 'The short hand.' })
  })
  it('ids are unique and every line has both languages without "!"', () => {
    expect(new Set(LINES.map((l) => l.id)).size).toBe(LINES.length)
    for (const l of LINES) {
      expect(l.he.length).toBeGreaterThan(0)
      expect(l.en.length).toBeGreaterThan(0)
      expect(l.he + l.en).not.toContain('!')
    }
  })
  it('every explanation id from levels.ts has a line', async () => {
    const ids = ['hands', 'level-2', 'level-3', 'level-4', 'level-5', 'level-6', 'nonumbers', 'ex-find', 'ex-what', 'ex-set', 'ex-digital', 'seconds', 'fix-swap', 'fix-notAdvanced', 'fix-mirror', 'fix-numberAsMin', 'fix-hour1', 'fix-five']
    for (const id of ids) expect(LINES.some((l) => l.id === `exp-${id}`)).toBe(true)
  })
  it('{fives} sits on the first counted number, so the long hand steps on five, ten, fifteen, twenty', () => {
    const counted = { en: ['five', 'ten', 'fifteen', 'twenty'], he: ['חָמֵשׁ', 'עֶשֶׂר', 'חֲמֵשׁ־עֶשְׂרֵה', 'עֶשְׂרִים'] }
    for (const l of LINES)
      for (const lang of ['en', 'he'] as const) {
        const { words, cues } = parseLine(l[lang])
        const at = cues.find((c) => c.cue === 'fives')?.word
        if (at === undefined) continue
        expect(words.slice(at, at + 4).map((w) => w.replace(/[.,:]/g, '').toLowerCase()), `${l.id} ${lang}`).toEqual(counted[lang])
      }
  })
})
