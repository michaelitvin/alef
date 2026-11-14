import { describe, expect, it } from 'vitest'
import { WORDS } from '../data/words'
import { strokesOf, type Pt } from '../data/strokes'
import { drawFeature, drawWords, marksFor, needsDemo, scriptOf, splitWord } from './draw'
import { drawLayout } from './drawLayout'
import { judgeMarks, markTargets, type Box, type MarkSpec } from './recognizer'

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

describe('drawing marks in any order (the parent: שׁוּעָל, פַּרְפַּר)', () => {
  const perms = <T,>(a: T[]): T[][] => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])))
  const boxOf = (ps: Pt[]): Box => ({ left: Math.min(...ps.map((p) => p[0])), right: Math.max(...ps.map((p) => p[0])), top: Math.min(...ps.map((p) => p[1])), bottom: Math.max(...ps.map((p) => p[1])) })
  /** the bare vav's box as the fonts have it (Sigalit 0.55 wide, Dana Yad 0.44), where the layout puts it */
  const vavOf = (id: string, script: 'print' | 'hand') => {
    const w = word(id)
    const sp = splitWord(w, script)
    const marks = marksFor(w, 3)
    const L = drawLayout({ ...sp, script, def: strokesOf(sp.letter, script), marksAbove: marks.some((m) => m.zone.startsWith('above') || m.zone === 'vav-above'), marksUnder: marks.some((m) => m.zone === 'under') })
    if (!L.vav) return undefined
    const r = L.vav.box.right
    return { ...L.vav.box, left: r - (script === 'print' ? 0.55 : 0.44) }
  }
  // every drawing word whose first syllable has more than one mark: the ש dot and the shuruk on the next letter, the
  // dagesh and the vowel under the same letter (בּ כּ פּ with patach, segol, kamatz)
  const multi = WORDS.filter((w) => marksFor(w, 3).length > 1)
  it('the words with more than one mark are known', () => {
    expect(multi.map((w) => w.id).sort()).toEqual(['ball', 'banana', 'butterfly', 'dog', 'fox', 'house'])
  })
  for (const script of ['print', 'hand'] as const) {
    it(`${script}: every part of every mark in every order passes, on his own letter (each form of it), drawn a bit off the hand's place`, () => {
      for (const w of multi) {
        const sp = splitWord(w, script)
        const specs = marksFor(w, 3)
        const vav = vavOf(w.id, script)
        for (const [vi, v] of strokesOf(sp.letter, script).variants.entries()) for (const [dy, k] of [[0, 1], [-0.15, 0.85], [0.2, 1.1]] as const) {
          const letter = boxOf(v.flatMap((st) => st.pts).map(([x, y]): Pt => [x * k, y * k + dy]))
          const boxes = { letter, vav }
          for (const [ox, oy] of [[0, 0], [0.05, -0.04], [-0.05, 0.05]] as const) {
            const parts = markTargets(specs, boxes).map((st) => st.map(([x, y]): Pt => [x + ox, y + oy]))
            for (const o of perms(parts)) {
              const strokes = o.map((st) => (st.length === 1 ? [st[0], [st[0][0] + 0.02, st[0][1] + 0.02] as Pt] : st))
              expect(judgeMarks(strokes, specs, boxes).state, `${w.id} ${script} v${vi + 1} ${dy} ${k} ${ox}`).toBe('ok')
              // not all of them yet: never wrong, he goes on
              expect(judgeMarks(strokes.slice(0, -1), specs, boxes).state, `${w.id} ${script} part`).toBe('more')
            }
          }
        }
      }
    })
  }
  it('שׁוּעָל: the ש dot and the shuruk, either first, in print and handwriting', () => {
    for (const script of ['print', 'hand'] as const) {
      const specs = marksFor(word('fox'), 3)
      const letter = boxOf(strokesOf('ש', script).variants[0].flatMap((st) => st.pts))
      const boxes = { letter, vav: vavOf('fox', script) }
      const [dot, shuruk] = markTargets(specs, boxes)
      expect(judgeMarks([dot, shuruk], specs, boxes).state, script).toBe('ok')
      expect(judgeMarks([shuruk, dot], specs, boxes).state, script).toBe('ok')
      expect(judgeMarks([shuruk], specs, boxes).state, script).toBe('more')
      expect(judgeMarks([dot], specs, boxes).state, script).toBe('more')
      // really wrong stays wrong: the ש dot on the left (a sin), a dot under the ש, two dots by the vav
      expect(judgeMarks([[[letter.left + 0.05, letter.top - 0.2]], shuruk], specs, boxes).state, script).toBe('wrong')
      expect(judgeMarks([shuruk, [[(letter.left + letter.right) / 2, letter.bottom + 0.3]]], specs, boxes).state, script).toBe('wrong')
      expect(judgeMarks([shuruk, [[shuruk[0][0] - 0.1, shuruk[0][1] + 0.1]]], specs, boxes).state, script).toBe('wrong')
    }
  })
  it('פַּרְפַּר: the dagesh and the patach (or a kamatz), either first, on a פ in two strokes or in one from the centre', () => {
    for (const script of ['print', 'hand'] as const) for (const v of strokesOf('פ', script).variants) {
      const letter = boxOf(v.flatMap((st) => st.pts))
      for (const vowel of [{ zone: 'under', shape: 'bar' }, { zone: 'under', shape: 'T' }] as MarkSpec[]) {
        const specs: MarkSpec[] = [{ zone: 'inside', shape: 'dot' }, vowel]
        const parts = markTargets(specs, { letter })
        for (const o of perms(parts)) expect(judgeMarks(o, specs, { letter }).state, `${script} ${vowel.shape} ${v.length}`).toBe('ok')
        // the dagesh under the letter (a second vowel part) and the vowel inside it are wrong
        expect(judgeMarks([parts[1], [[(letter.left + letter.right) / 2, letter.bottom + 0.6]]], specs, { letter }).state).not.toBe('ok')
      }
    }
    expect(marksFor(word('butterfly'), 3)).toEqual([{ zone: 'inside', shape: 'dot' }, { zone: 'under', shape: 'bar' }])
  })
  it('a part that fits two places goes to the nearest one still owed, so the order never matters (שׂ with וֹ)', () => {
    // the sin dot (above the ש's left) and the cholam male (above the next vav) can share some room between them
    const letter: Box = { left: 0, right: 1, top: 0, bottom: 1 }
    const vav: Box = { left: -0.6, right: -0.35, top: 0, bottom: 1 }
    const specs: MarkSpec[] = [{ zone: 'above-left', shape: 'dot' }, { zone: 'vav-above', shape: 'dot' }]
    const between: Pt[] = [[-0.33, -0.2]]
    const sin: Pt[] = [[0.2, -0.2]]
    const cholam: Pt[] = [[-0.5, -0.2]]
    expect(judgeMarks([between, sin], specs, { letter, vav }).state).toBe('ok')
    expect(judgeMarks([sin, between], specs, { letter, vav }).state).toBe('ok')
    expect(judgeMarks([cholam, between], specs, { letter, vav }).state).toBe('ok')
    expect(judgeMarks([between, cholam], specs, { letter, vav }).state).toBe('ok')
    // a third dot is one too many
    expect(judgeMarks([sin, between, cholam], specs, { letter, vav }).state).toBe('wrong')
  })
})
