import { describe, it, expect } from 'vitest'
import { fixPronunciation } from './pronunciation'

describe('fixPronunciation', () => {
  it('respells standalone כָּל as כּוֹל', () => {
    expect(fixPronunciation('כָּל')).toBe('כּוֹל')
  })

  it('respells כָּל inside a sentence', () => {
    expect(fixPronunciation('כָּל הַחַיּוֹת פּוֹחֲדוֹת מִמֶּנּוּ.')).toBe(
      'כּוֹל הַחַיּוֹת פּוֹחֲדוֹת מִמֶּנּוּ.'
    )
  })

  it('respells the prefixed form וְכָל', () => {
    expect(fixPronunciation('וְכָל הַזְּאֵבִים יִלְּלוּ')).toBe(
      'וְכוֹל הַזְּאֵבִים יִלְּלוּ'
    )
  })

  it('respells כָּל before a maqaf', () => {
    expect(fixPronunciation('כָּל־הַחַיּוֹת')).toBe('כּוֹל־הַחַיּוֹת')
  })

  it('leaves regular-kamatz words alone', () => {
    expect(fixPronunciation('קָמָץ')).toBe('קָמָץ')
    expect(fixPronunciation('אַבָּא שָׂם גֶּרֶב')).toBe('אַבָּא שָׂם גֶּרֶב')
  })

  it('does not touch words that merely contain כל', () => {
    expect(fixPronunciation('הַכֶּלֶב')).toBe('הַכֶּלֶב')
    expect(fixPronunciation('אֹכֶל')).toBe('אֹכֶל')
  })

  it('passes non-Hebrew text through unchanged', () => {
    expect(fixPronunciation('hello')).toBe('hello')
  })

  it('marks penultimate stress on מוֹתֶק with an ole accent', () => {
    expect(fixPronunciation('מוֹתֶק')).toBe('מ֫וֹתֶק')
    expect(fixPronunciation('לְמוֹתֶק הַכֶּלֶב')).toBe('לְמ֫וֹתֶק הַכֶּלֶב')
  })
})
