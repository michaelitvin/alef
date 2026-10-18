import { describe, expect, it } from 'vitest'
import { HOURS, MINUTES } from './time'
import { phrase, phraseText, stripNikkud } from './phrases'

const all = HOURS.flatMap((h) => MINUTES.map((m) => ({ h, m })))

describe('phrases', () => {
  it('Hebrew examples', () => {
    expect(phraseText({ h: 3, m: 0 }, 'he')).toBe('שָׁלוֹשׁ')
    expect(phraseText({ h: 3, m: 15 }, 'he')).toBe('שָׁלוֹשׁ וָרֶבַע')
    expect(phraseText({ h: 3, m: 25 }, 'he')).toBe('שָׁלוֹשׁ עֶשְׂרִים וְחָמֵשׁ')
    expect(phraseText({ h: 3, m: 45 }, 'he')).toBe('רֶבַע לְאַרְבַּע')
    expect(phraseText({ h: 12, m: 45 }, 'he')).toBe('רֶבַע לְאַחַת')
    expect(phraseText({ h: 1, m: 50 }, 'he')).toBe('עֲשָׂרָה לִשְׁתַּיִם')
  })
  it('English examples', () => {
    expect(phraseText({ h: 3, m: 0 }, 'en')).toBe("three o'clock")
    expect(phraseText({ h: 3, m: 25 }, 'en')).toBe('twenty-five past three')
    expect(phraseText({ h: 12, m: 45 }, 'en')).toBe('quarter to one')
    expect(phraseText({ h: 11, m: 50 }, 'en')).toBe('ten to twelve')
  })
  it('144 distinct phrases per language, English all small letters', () => {
    for (const lang of ['he', 'en'] as const) {
      const texts = new Set(all.map((t) => phraseText(t, lang)))
      expect(texts.size).toBe(144)
    }
    for (const t of all) expect(phraseText(t, 'en')).toBe(phraseText(t, 'en').toLowerCase())
  })
  it('Hebrew uses only Hebrew letters, nikkud, maqaf and spaces', () => {
    for (const t of all) expect(phraseText(t, 'he')).toMatch(/^[֑-ׇא-ת ]+$/)
  })
  it('phrase ids, words and audio ids', () => {
    const p = phrase({ h: 11, m: 35 }, 'he')
    expect(p.id).toBe('he-11-35')
    expect(p.audioId).toBe('ph-he-11-35')
    expect(p.words).toEqual(['אַחַת־עֶשְׂרֵה', 'שְׁלוֹשִׁים', 'וְחָמֵשׁ'])
  })
  // the parent's review 2026-10-16: nobody says "twenty-five to seven"; :40 also as "one forty"
  it(':35 reads as digits; :40 has "twenty to" and a digital form with its own voice file', () => {
    expect(phraseText({ h: 6, m: 35 }, 'he')).toBe('שֵׁשׁ שְׁלוֹשִׁים וְחָמֵשׁ')
    expect(phraseText({ h: 7, m: 35 }, 'en')).toBe('seven thirty-five')
    expect(phraseText({ h: 1, m: 40 }, 'en')).toBe('twenty to two')
    expect(phraseText({ h: 1, m: 40 }, 'en', true)).toBe('one forty')
    expect(phraseText({ h: 1, m: 40 }, 'he', true)).toBe('אַחַת אַרְבָּעִים')
    expect(phrase({ h: 1, m: 40 }, 'he', true).audioId).toBe('ph-he-1-40d')
    expect(phrase({ h: 1, m: 35 }, 'he', true).audioId).toBe('ph-he-1-35') // only :40 has a second file
  })
  it('stripNikkud keeps the maqaf', () => expect(stripNikkud('אַחַת־עֶשְׂרֵה')).toBe('אחת־עשרה'))
})
