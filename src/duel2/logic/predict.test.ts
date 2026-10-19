import { describe, expect, it } from 'vitest'
import { item, mark, syllable } from './content.ts'
import { features, pickTarget, predict } from './predict'

describe('predict', () => {
  it('syllable features combine letter, vowel and syllable', () => {
    expect(features({ item: item('bet'), mark: mark('kamatz') }, 'ladder')).toEqual(['l:bet', 'v:a', 's:bet-a', 'sc:ladder'])
  })
  it('letter and word features', () => {
    expect(features({ item: item('dalet') }, 'ghosts')).toEqual(['l:dalet', 'sc:ghosts'])
    expect(features({ wordId: 'tent' }, 'doors')).toEqual(['w:tent', 'sc:doors'])
  })
  it('a letter weak in history raises its syllables', () => {
    const tallies = { 'l:dalet': { seen: 10, wrong: 6 } }
    const d = syllable('dalet', 'kamatz')
    const l = syllable('lamed', 'kamatz')
    expect(predict(features(d, 'broom'), tallies, {})).toBeGreaterThan(predict(features(l, 'broom'), tallies, {}))
  })
  it('pickTarget prefers the candidate nearest one mistake in five', () => {
    const tallies = { 'l:dalet': { seen: 10, wrong: 2 }, 'l:lamed': { seen: 40, wrong: 0 } }
    const cands = ['dalet', 'lamed']
    let dalet = 0
    for (let i = 0; i < 200; i++) {
      const r = (((i * 9301 + 49297) % 233280) / 233280)
      if (pickTarget(() => r, cands, (c) => [`l:${c}`], tallies, {}) === 'dalet') dalet++
    }
    expect(dalet).toBeGreaterThan(120)
  })
})
