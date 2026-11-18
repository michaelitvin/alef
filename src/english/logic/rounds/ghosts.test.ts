// The English ghosts' rounds (design Part 5, "look-alikes"): one look-alike set per visit, opened when all its letters are
// (b d p and n u at stage 2, m w and h n at stage 3), then his own mix-ups; later the look-alike words (top · pot). He
// hears the sound (or the word) and picks. The shared rules of every English screen's rounds.
import { describe, expect, it } from 'vitest'
import type { Choice, Kind, RoundCtx } from '../../../duel2/logic/rounds'
import { seeded } from '../../../duel2/testing/runHarness'
import { GHOST_WORD_SETS, LOOKALIKE_LETTERS } from '../../content/sets'
import { unit } from '../../content/units'
import { WORDS, word } from '../../content/words'
import { unitChoice } from '../pick'
import { enGhostExplanation, enGhostRound, ghostSets } from './ghosts'

type Conf = Record<string, Record<string, number>>
const ctxAt = (stage: number, seed = 1, letters: Conf = {}): RoundCtx =>
  ({ rng: seeded(seed), stage, tallies: {}, recent: {}, confusions: { letters, syllables: {} } })

/** `n` first rounds of a visit at `stage` */
function rounds(stage: number, kind: Kind, n = 300, letters: Conf = {}) {
  return Array.from({ length: n }, (_, i) => enGhostRound(ctxAt(stage, i + 1, letters), kind))
}
const ids = (cs: Choice[]) => cs.map((c) => c.id)
const has = (cs: Choice[], ...want: string[]) => want.every((id) => ids(cs).includes(id))
const iAndL = (a: string, b: string) => (a.includes('I') && b.includes('l')) || (a.includes('l') && b.includes('I'))

describe('the English ghosts', () => {
  it('b d p opens at stage 2', () => {
    expect(ghostSets(1, 'letter')).toEqual([])
    expect(ghostSets(2, 'letter')).toContainEqual(['b', 'd', 'p'])
    const all = rounds(2, 'letter')
    // a b d p round shows the whole set (three ghosts), and asks one of them
    const bdp = all.filter((r) => ['b', 'd', 'p'].includes(r.target.id))
    expect(bdp.length).toBeGreaterThan(0)
    for (const r of bdp) expect(ids(r.signs).sort()).toEqual(['b', 'd', 'p'])
    // n u is the other stage-2 set: n and u together, with a third ghost
    const nu = all.filter((r) => ['n', 'u'].includes(r.target.id))
    expect(nu.length).toBeGreaterThan(0)
    for (const r of nu) { expect(has(r.signs, 'n', 'u')).toBe(true); expect(r.signs).toHaveLength(3) }
  })

  it('m w waits for stage 3', () => {
    expect(ghostSets(2, 'letter').flat()).not.toContain('m')
    for (const r of rounds(2, 'letter')) {
      expect(has(r.signs, 'm', 'w')).toBe(false)
      for (const c of r.signs) expect(unit(c.id).stage).toBeLessThanOrEqual(2)
    }
    expect(ghostSets(3, 'letter')).toContainEqual(['m', 'w'])
    expect(rounds(3, 'letter').some((r) => has(r.signs, 'm', 'w') && ['m', 'w'].includes(r.target.id))).toBe(true)
  })

  it('his own mix-up becomes a set', () => {
    // s and f are in no look-alike set; he tapped f for s three times (CONFUSION_GROUP_MIN)
    const mine = { s: { f: 3 } }
    const firsts = rounds(2, 'letter', 300, mine)
    expect(firsts.some((r) => r.target.id === 's' && has(r.signs, 's', 'f'))).toBe(true)
    // the visit keeps it: the round after s asks f, with s among the ghosts
    for (let seed = 1; seed <= 50; seed++) {
      const r = enGhostRound(ctxAt(2, seed, mine), 'letter', 'snd-s')
      expect(r.target.id).toBe('f')
      expect(has(r.signs, 's', 'f')).toBe(true)
    }
    // twice is not yet a mix-up: s is in no set, so the visit after s takes a set of the table
    for (let seed = 1; seed <= 50; seed++) {
      const r = enGhostRound(ctxAt(2, seed, { s: { f: 2 } }), 'letter', 'snd-s')
      expect(r.target.id).not.toBe('s')
      expect(LOOKALIKE_LETTERS.some((l) => l.letters.includes(r.target.id))).toBe(true)
    }
  })

  it('never I and l together', () => {
    // he mixes the heart word I up with words that have an l (and back): the round never shows both
    const mixed: Conf = { I: { lip: 5, lap: 4, log: 3 }, lip: { I: 5 }, lap: { I: 4 } }
    for (let stage = 2; stage <= 9; stage++) {
      for (const r of [...rounds(stage, 'syllable', 150, mixed), ...rounds(stage, 'letter', 50, mixed)]) {
        for (const a of r.signs) for (const b of r.signs) expect(iAndL(a.text, b.text)).toBe(false)
      }
      for (const prev of ['hw-I', 'w-lip']) {
        const r = enGhostRound(ctxAt(stage, 3, mixed), 'syllable', prev)
        for (const a of r.signs) for (const b of r.signs) expect(iAndL(a.text, b.text)).toBe(false)
      }
    }
  })

  it('a visit keeps its set', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const ctx = ctxAt(2, seed)
      const first = enGhostRound(ctx, 'letter')
      const set = LOOKALIKE_LETTERS.filter((l) => l.letters.includes(first.target.id))
      const next = enGhostRound(ctx, 'letter', first.target.soundId)
      expect(next.target.id).not.toBe(first.target.id)
      // the next target is in the set of the first (n is in two sets: either one)
      expect(set.some((l) => l.letters.includes(next.target.id))).toBe(true)
    }
  })

  it('look-alike words from stage 2: top · pot', () => {
    expect(ghostSets(2, 'syllable')).toContainEqual(['top', 'pot'])
    expect(ghostSets(4, 'syllable').flat()).not.toContain('stop')
    expect(ghostSets(5, 'syllable')).toContainEqual(['stop', 'spot'])
    expect(ghostSets(8, 'syllable').flat()).not.toContain('was')
    expect(ghostSets(9, 'syllable')).toContainEqual(['was', 'saw'])
    const all = rounds(2, 'syllable')
    for (const r of all) {
      expect(r.target.kind).toBe('word')
      const set = GHOST_WORD_SETS.filter((s) => s.stage <= 2 && s.words.includes(r.target.id))
      expect(set.length).toBe(1)
      expect(has(r.signs, ...set[0].words)).toBe(true)
    }
    expect(new Set(all.map((r) => r.target.id)).size).toBeGreaterThan(8)
  })

  it('the shared rules at every stage', () => {
    for (let stage = 2; stage <= 9; stage++) {
      for (const kind of ['letter', 'syllable'] as Kind[]) {
        for (const r of rounds(stage, kind, 120, { m: { n: 4 }, sat: { sit: 3 } })) {
          expect(r.signs).toHaveLength(3)
          expect(ids(r.signs).filter((id) => id === r.target.id)).toHaveLength(1)
          expect(new Set(r.signs.map((c) => c.soundId)).size).toBe(3)
          for (const c of r.signs) {
            expect(c.picture).toBeUndefined()
            if (c.kind === 'unit') expect(unit(c.id).stage).toBeLessThanOrEqual(stage)
            else {
              const w = word(c.id)
              expect(WORDS).toContain(w)
              expect(['real', 'heart']).toContain(w.kind)
              expect(w.stage).toBeLessThanOrEqual(stage)
            }
            expect(c.kind).toBe(kind === 'letter' ? 'unit' : 'word')
          }
        }
      }
    }
  })

  it('the look-alike explanation names the letter, then says its sound', () => {
    const b = unitChoice(unit('b'))
    expect(enGhostExplanation(b, 'ghosts')).toEqual({
      feature: 'b',
      parts: [{ line: 'explain-letter', highlight: 'none' }, { id: 'ln-b', highlight: 'letter' }, { id: 'snd-b', highlight: 'all' }],
    })
    // a letter of no look-alike set has no name to say; other screens explain nothing
    expect(enGhostExplanation(unitChoice(unit('s')), 'ghosts')).toBeNull()
    expect(enGhostExplanation(b, 'broom')).toBeNull()
  })
})
