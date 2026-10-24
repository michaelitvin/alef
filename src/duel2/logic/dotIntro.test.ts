import { describe, expect, it } from 'vitest'
import { dotIntroFor, dotIntroParts } from './dotIntro'
import { syllable } from './content'

describe('dotted-letter introduction', () => {
  it('ב/בּ: without a dot, then with a dot', () => {
    const d = dotIntroParts('bet')
    expect(d.parts.map((p) => p.id)).toEqual(['dot-without-1', syllable('vet', 'kamatz').soundId, 'dot-with-1', syllable('bet', 'kamatz').soundId])
    expect(d.right).toBe(syllable('vet', 'kamatz').text)
    expect(d.left).toBe(syllable('bet', 'kamatz').text)
  })
  it('שׁ/שׂ: the dot on the right, then the dot on the left (both have a dot; the parent: the difference is its side)', () => {
    const d = dotIntroParts('shin')
    expect(d.parts.map((p) => p.id)).toEqual(['dot-right-1', syllable('shin', 'kamatz').soundId, 'dot-left-1', syllable('sin', 'kamatz').soundId])
    expect(d.right).toBe(syllable('shin', 'kamatz').text)
    expect(d.left).toBe(syllable('sin', 'kamatz').text)
    expect(d.parts.map((p) => p.highlight)).toEqual(['right', 'right', 'left', 'left'])
  })
  it('after the first introduction only the two sounds play: the screen shows the difference (the parent)', () => {
    const d = dotIntroParts('kaf', false)
    expect(d.parts.map((p) => p.id)).toEqual([syllable('khaf', 'kamatz').soundId, syllable('kaf', 'kamatz').soundId])
    expect(d.parts.map((p) => p.highlight)).toEqual(['right', 'left'])
  })

  it('introduces a dotted pair only when the round asks about one of its letters (the parent: it showed ב, then asked another letter)', () => {
    expect(dotIntroFor('lamed', 3, [])).toBeNull()
    expect(dotIntroFor('vet', 3, [])).toBe('bet')
    expect(dotIntroFor('bet', 3, [])).toBe('bet')
    expect(dotIntroFor('sin', 3, [])).toBe('shin')
    expect(dotIntroFor('bet', 3, ['bet'])).toBeNull()
    expect(dotIntroFor('bet', 2, [])).toBeNull()
  })

})
