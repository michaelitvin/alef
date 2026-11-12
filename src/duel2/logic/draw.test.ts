import { describe, expect, it } from 'vitest'
import { WORDS } from '../data/words'
import { drawFeature, drawWords, marksFor, needsDemo, scriptOf, splitWord } from './draw'

const word = (id: string) => WORDS.find((w) => w.id === id)!
function seeded(seed: number) {
  let a = seed >>> 0
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 }
}

describe('drawing rounds', () => {
  it('3 words a visit, each with another first letter', () => {
    for (let s = 1; s < 30; s++) {
      const ws = drawWords({ rng: seeded(s), tallies: {}, recent: {}, confusions: {} })
      expect(ws.length).toBe(3)
      const letters = ws.map((w) => splitWord(w, 'print').letter)
      expect(new Set(letters).size).toBe(3)
    }
  })
  it('prefers words whose first letter he mixes up or drew wrong', () => {
    const count = (ctx: Omit<Parameters<typeof drawWords>[0], 'rng'>) => {
      let n = 0
      for (let s = 1; s < 200; s++) n += drawWords({ ...ctx, rng: seeded(s) }).filter((w) => splitWord(w, 'print').letter === 'ד').length
      return n
    }
    const plain = count({ tallies: {}, recent: {}, confusions: {} })
    expect(count({ tallies: {}, recent: {}, confusions: { dalet: { resh: 6 } } })).toBeGreaterThan(plain * 1.4)
    expect(count({ tallies: { [drawFeature('ד', 'print')]: { seen: 4, wrong: 3 } }, recent: { [drawFeature('ד', 'print')]: 'xxo' }, confusions: {} })).toBeGreaterThan(plain * 1.4)
  })
  it('scriptOf: the print screen draws in print, the handwriting screen in handwriting', () => {
    expect(scriptOf('draw')).toBe('print')
    expect(scriptOf('draw-hand')).toBe('hand')
  })
  it('splits the word: the slot letter, a bare vav when the vowel sits on it, the rest', () => {
    expect(splitWord(word('camel'), 'print')).toEqual({ letter: 'ג', vav: false, rest: 'מָל'.normalize('NFC') })
    expect(splitWord(word('fox'), 'print')).toEqual({ letter: 'ש', vav: true, rest: 'עָל'.normalize('NFC') })
    expect(splitWord(word('bus'), 'print').vav).toBe(true)
    // the handwriting font has no nikkud: the rest shows its letters only
    expect(splitWord(word('camel'), 'hand')).toEqual({ letter: 'ג', vav: false, rest: 'מל' })
  })
  it('marks: none at stage 1; then the dagesh, the ש dot, then the vowel', () => {
    expect(marksFor(word('ball'), 1)).toEqual([])
    expect(marksFor(word('ball'), 2)).toEqual([{ zone: 'inside', shape: 'dot' }, { zone: 'under', shape: 'bar' }])
    expect(marksFor(word('fox'), 2)).toEqual([{ zone: 'above-right', shape: 'dot' }, { zone: 'vav-left', shape: 'dot' }])
    expect(marksFor(word('camel'), 2)).toEqual([{ zone: 'under', shape: 'T' }])
    expect(marksFor(word('carrot'), 2)).toEqual([{ zone: 'under', shape: 'dots3-tri' }])
    expect(marksFor(word('book'), 2)).toEqual([{ zone: 'under', shape: 'dots2' }])
    expect(marksFor(word('tent'), 2)).toEqual([{ zone: 'above-left', shape: 'dot' }])
    expect(marksFor(word('bus'), 2)).toEqual([{ zone: 'vav-above', shape: 'dot' }])
    expect(marksFor(word('lemon'), 2)).toEqual([{ zone: 'under', shape: 'dot' }])
    // the game shows no dagesh in ד (only בּ כּ פּ change their sound)
    expect(marksFor(word('door'), 2)).toEqual([{ zone: 'under', shape: 'dots3-tri' }])
  })
  it('the demo plays for a letter not drawn yet in that script, or drawn wrong recently', () => {
    expect(needsDemo('ד', 'print', {}, {})).toBe(true)
    const f = drawFeature('ד', 'print')
    expect(needsDemo('ד', 'print', { [f]: { seen: 3, wrong: 0 } }, { [f]: 'ooo' })).toBe(false)
    expect(needsDemo('ד', 'print', { [f]: { seen: 3, wrong: 1 } }, { [f]: 'oxo' })).toBe(true)
    expect(needsDemo('ד', 'hand', { [f]: { seen: 3, wrong: 0 } }, { [f]: 'ooo' })).toBe(true)
  })
})
