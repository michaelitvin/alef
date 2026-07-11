import { describe, it, expect, vi, afterEach } from 'vitest'
import { decodeWord, stripPunctuation } from './decodeWord'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('stripPunctuation', () => {
  it('keeps Hebrew letters and niqqud, drops punctuation', () => {
    expect(stripPunctuation('אַבָּא!')).toBe('אַבָּא')
    expect(stripPunctuation('שֶׁר־חָאן')).toBe('שֶׁרחָאן')
  })
})

describe('decodeWord', () => {
  it('decodes אַבָּא (patach, dagesh+kamatz, bare final alef)', () => {
    expect(decodeWord('אַבָּא')).toBe(
      'אָלֶף עִם פַּתָח, בֵּית עִם דָּגֵשׁ וְקָמָץ, אָלֶף - אַבָּא'
    )
  })

  it('decodes יַלְדָּה (shva, final he)', () => {
    expect(decodeWord('יַלְדָּה')).toBe(
      'יוֹד עִם פַּתָח, לָמֶד עִם שְׁוָא, דָּלֶת עִם דָּגֵשׁ וְקָמָץ, הֵא - יַלְדָּה'
    )
  })

  it('decodes שֻׁלְחָן (shin dot, kubutz, final nun)', () => {
    expect(decodeWord('שֻׁלְחָן')).toBe(
      'שִׁין עִם קֻבּוּץ, לָמֶד עִם שְׁוָא, חֵית עִם קָמָץ, נוּן סוֹפִית - שֻׁלְחָן'
    )
  })

  it('decodes דּוֹב with holam male', () => {
    expect(decodeWord('דּוֹב')).toBe('דָּלֶת עִם דָּגֵשׁ, חוֹלָם מָלֵא, בֵּית - דּוֹב')
  })

  it('decodes שׁוּב with shuruk', () => {
    expect(decodeWord('שׁוּב')).toBe('שִׁין, שׁוּרוּק, בֵּית - שׁוּב')
  })

  it('decodes שָׂם with sin (left dot)', () => {
    expect(decodeWord('שָׂם')).toBe('שִׁין שְׂמָאלִית עִם קָמָץ, מֵם סוֹפִית - שָׂם')
  })

  it('decodes חֲתוּל with chataf-patach', () => {
    expect(decodeWord('חֲתוּל')).toBe('חֵית עִם חֲטַף פַּתָח, תָּו, שׁוּרוּק, לָמֶד - חֲתוּל')
  })

  it('treats consonant vav with shva normally (not shuruk)', () => {
    expect(decodeWord('וְגַם')).toBe('וָו עִם שְׁוָא, גִּימֶל עִם פַּתָח, מֵם סוֹפִית - וְגַם')
  })

  it('ignores punctuation and decodes the bare word', () => {
    expect(decodeWord('אַבָּא!')).toBe(
      'אָלֶף עִם פַּתָח, בֵּית עִם דָּגֵשׁ וְקָמָץ, אָלֶף - אַבָּא'
    )
  })

  it('falls back to the word itself for undecodable input, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(decodeWord('hello')).toBe('hello')
    expect(warn).toHaveBeenCalled()
  })
})
