// The hint's blend (design Part 5): the plan of a word by the method in use, lightsOnNormalWord (PROVISIONAL, until the
// parent picks the method by ear): the units light in turn while the normal word plays.
import { describe, expect, it } from 'vitest'
import { BLEND_METHOD, FALLBACK_WORD_MS, blendOf, blendParts, lightsOnNormalWord } from './blend'
import { WORDS, word } from '../content/words'

describe('the blend of a word', () => {
  it('with no timing, fish lights f, i, sh evenly over the clip', () => {
    const p = lightsOnNormalWord(word('fish'), null)
    expect(p.lights.map((l) => l.unit)).toEqual([0, 1, 2])
    expect(p.lights.map((l) => l.atMs)).toEqual([0, Math.round(FALLBACK_WORD_MS / 3), Math.round((2 * FALLBACK_WORD_MS) / 3)])
    expect(p.totalMs).toBe(FALLBACK_WORD_MS)
    expect(p.audio).toEqual(['w-fish'])
  })

  it('with a timing, the lights follow it', () => {
    const t = { units: [{ startMs: 0, endMs: 120 }, { startMs: 120, endMs: 300 }, { startMs: 300, endMs: 520 }], durationMs: 520 }
    const p = lightsOnNormalWord(word('fish'), t)
    expect(p.lights.map((l) => l.atMs)).toEqual([0, 120, 300])
    expect(p.totalMs).toBe(520)
  })

  it('a timing that does not fit the word\'s units is not used', () => {
    const t = { units: [{ startMs: 0, endMs: 100 }, { startMs: 100, endMs: 300 }], durationMs: 300 }
    expect(lightsOnNormalWord(word('fish'), t)).toEqual(lightsOnNormalWord(word('fish'), null))
  })

  it('the method in use is lightsOnNormalWord, and a word with no timing yet gets its fallback', () => {
    expect(BLEND_METHOD).toBe(lightsOnNormalWord)
    expect(blendOf(word('fish'))).toEqual(lightsOnNormalWord(word('fish'), null))
  })

  it('the pieces: a two-letter unit is one piece, a silent e lights with its vowel, a heart word is whole', () => {
    expect(blendParts(word('fish'))).toEqual([{ text: 'f', unit: 0 }, { text: 'i', unit: 1 }, { text: 'sh', unit: 2 }])
    expect(blendParts(word('cake'))).toEqual([{ text: 'c', unit: 0 }, { text: 'a', unit: 1 }, { text: 'k', unit: 2 }, { text: 'e', unit: 1 }])
    expect(blendParts(word('jumped')).map((p) => p.text)).toEqual(['j', 'u', 'm', 'p', 'ed'])
    expect(blendParts(word('a'))).toEqual([{ text: 'a', unit: 0 }])
    const heart = lightsOnNormalWord(word('a'), null)
    expect(heart.audio).toEqual(['hw-a'])
    expect(heart.lights).toEqual([{ unit: 0, atMs: 0 }])
  })

  it('every word\'s pieces spell it, and each of its units lights once', () => {
    for (const w of WORDS) {
      const p = blendOf(w)
      expect(p.parts.map((x) => x.text).join(''), w.id).toBe(w.text)
      expect(p.lights.map((l) => l.unit), w.id).toEqual(Array.from({ length: Math.max(1, w.units.length) }, (_, i) => i))
      if (w.units.length) expect(new Set(p.parts.map((x) => x.unit)).size, w.id).toBe(w.units.length)
      for (const l of p.lights) expect(l.atMs).toBeLessThan(p.totalMs)
    }
  })
})
