// The English cauldron's rounds (design Part 5, "the missing sound"): he hears a word, sees it with one empty box and
// puts the missing unit in; later the missing pair (`_ip` → sh, ch, th); at stage 6 he throws an `e` in after a short
// word (`kit` → `kite`). The shared rules of every English screen's rounds.
import { describe, expect, it } from 'vitest'
import type { CauldronRound } from '../../../spellquest/course/types'
import type { RoundCtx } from '../../../spellquest/logic/rounds'
import { seeded } from '../../../spellquest/testing/runHarness'
import { unit } from '../../content/units'
import { WORDS, word } from '../../content/words'
import { PAIR_SHARE, enCauldronRound, type CauldronDeps } from './cauldron'

const ctxAt = (stage: number, seed = 1, letters: Record<string, Record<string, number>> = {}): RoundCtx =>
  ({ rng: seeded(seed), stage, tallies: {}, recent: {}, confusions: { letters, syllables: {} } })

/** every picture key counts as having its file */
const allFiles: CauldronDeps = { picture: (key: string) => `file:${key}` }

function rounds(stage: number, n = 300, deps: CauldronDeps = allFiles): CauldronRound[] {
  const out: CauldronRound[] = []
  for (let seed = 1; seed <= n; seed++) out.push(enCauldronRound(ctxAt(stage, seed), undefined, deps))
  return out
}

/** the right tile of a round: the part in its empty box */
const rightOf = (r: CauldronRound) => r.boxes[r.gap]

describe('the English cauldron', () => {
  it('c_t asks a', () => {
    const cat = rounds(2, 3000).filter((r) => r.target.id === 'cat' && r.gap === 1)
    expect(cat.length).toBeGreaterThan(0)
    for (const r of cat) {
      expect(r.boxes.map((b) => b.text)).toEqual(['c', 'a', 't'])
      expect(rightOf(r).id).toBe('a')
      expect(r.target.soundId).toBe('w-cat')
      expect(r.orbs).toHaveLength(4)
      expect(r.orbs.filter((o) => o.id === 'a')).toHaveLength(1)
      // the other tiles never sound like a (and are not the a again)
      for (const o of r.orbs.filter((x) => x.id !== 'a')) expect(o.soundId).not.toBe('snd-ae')
      expect(r.becomes).toBeUndefined()
    }
  })

  it('stage 4 asks a digraph as one box', () => {
    const pairs = rounds(4, 400).filter((r) => ['sh', 'ch', 'th', 'th:2'].includes(rightOf(r).id))
    expect(pairs.length).toBeGreaterThan(20)
    for (const r of pairs) {
      // one box holds the two letters; the word's parts are its units
      expect(r.boxes.map((b) => b.id)).toEqual(word(r.target.id).units)
      expect(rightOf(r).text.length).toBe(2)
      // the other tiles are pairs too where they can be (sh ch th first)
      expect(r.orbs.filter((o) => o.text.length === 2).length).toBeGreaterThanOrEqual(3)
    }
    // _ip → sh, ch, th
    const ship = pairs.find((r) => r.target.id === 'ship' || r.target.id === 'chip')
    expect(ship).toBeDefined()
  })

  it('the pair share holds through stage 5, then tapers', () => {
    expect(PAIR_SHARE[4]).toBe(0.4)
    expect(PAIR_SHARE[5]).toBe(0.4)
    for (let s = 6; s <= 9; s++) expect(PAIR_SHARE[s]).toBeLessThanOrEqual(PAIR_SHARE[s - 1])
    expect(PAIR_SHARE[6]).toBeLessThan(PAIR_SHARE[5])
    // measured: the rounds with a missing pair (not the throws) are fewer at stage 8 than at stage 5
    const pairShare = (stage: number) => {
      const rs = rounds(stage, 600).filter((r) => !r.becomes)
      return rs.filter((r) => rightOf(r).text.length === 2 && ['digraph', 'double'].includes(unit(rightOf(r).id).kind)).length / rs.length
    }
    expect(pairShare(8)).toBeLessThan(pairShare(5))
  })

  it('a thrown e never counts towards the stage; the other rounds do', () => {
    const rs = rounds(6, 300)
    expect(rs.some((r) => r.becomes)).toBe(true)
    for (const r of rs) expect(r.noStage).toBe(r.becomes ? true : undefined)
  })

  it('stage 6 throws e after cap and the word becomes cape', () => {
    const throws = rounds(6, 600).filter((r) => r.becomes)
    expect(throws.length).toBeGreaterThan(30)
    const cap = throws.find((r) => r.target.id === 'cap')
    expect(cap).toBeDefined()
    expect(cap!.boxes.map((b) => b.text)).toEqual(['c', 'a', 'p', 'e'])
    expect(cap!.gap).toBe(3)
    expect(rightOf(cap!).text).toBe('e')
    // the e counts for the silent e it makes (a_e), heard in the word it makes
    expect(rightOf(cap!).id).toBe('a_e')
    expect(cap!.becomes!.id).toBe('cape')
    expect(cap!.becomes!.soundId).toBe('w-cape')
    for (const r of throws) {
      expect(r.becomes!.text).toBe(r.target.text + 'e')
      expect(word(r.becomes!.id).units).toContain(rightOf(r).id)
      expect(r.orbs.filter((o) => o.text === 'e')).toHaveLength(1)
      expect(r.gap).toBe(r.boxes.length - 1)
    }
    // the pairs of the asset plan: tap → tape, cap → cape, kit → kite, slid → slide, hop → hope, not → note
    expect(new Set(throws.map((r) => `${r.target.id}>${r.becomes!.id}`))).toEqual(new Set(['tap>tape', 'cap>cape', 'kit>kite', 'slid>slide', 'hop>hope', 'not>note']))
    // never before stage 6
    expect(rounds(5, 300).some((r) => r.becomes)).toBe(false)
  })

  it('cap → cape is word-only (no picture)', () => {
    const throws = rounds(6, 600).filter((r) => r.becomes)
    const cap = throws.find((r) => r.target.id === 'cap')!
    expect(cap.target.picture).toBeUndefined()
    expect(cap.becomes!.picture).toBeUndefined()
    // kit → kite: the picture comes with the e (its file)
    const kit = throws.find((r) => r.target.id === 'kit')!
    expect(kit.target.picture).toBeUndefined()
    expect(kit.becomes!.picture).toBe('file:kite')
    // a picture with no file is no picture
    const none = rounds(6, 600, { picture: () => undefined }).filter((r) => r.becomes)
    for (const r of none) expect(r.becomes!.picture).toBeUndefined()
  })

  it('keeps the shared rules at every stage', () => {
    for (let stage = 1; stage <= 9; stage++) {
      for (const r of rounds(stage, 150)) {
        const w = word(r.target.id)
        expect(w.kind).toBe('real')
        expect(w.stage).toBeLessThanOrEqual(stage)
        expect(WORDS).toContain(w)
        expect(r.gap).toBeGreaterThanOrEqual(0)
        expect(r.gap).toBeLessThan(r.boxes.length)
        expect(r.orbs).toHaveLength(4)
        // the right tile once, among tiles that never sound alike, never look alike, never I against l
        expect(r.orbs.filter((o) => o.soundId === rightOf(r).soundId)).toHaveLength(1)
        expect(new Set(r.orbs.map((o) => o.soundId)).size).toBe(4)
        expect(new Set(r.orbs.map((o) => o.text)).size).toBe(4)
        const texts = r.orbs.map((o) => o.text).join(' ')
        expect(texts.includes('I') && texts.includes('l')).toBe(false)
        // wrong tiles only from opened units
        for (const o of r.orbs) expect(unit(o.id).stage).toBeLessThanOrEqual(stage)
        // no picture on a word that has none
        if (r.target.picture) expect(w.picture).toBeDefined()
        if (r.becomes?.picture) expect(word(r.becomes.id).picture).toBeDefined()
        // a box shows a unit's letters (no hyphen of an ending)
        for (const b of r.boxes) expect(b.text).not.toMatch(/^-/)
      }
    }
  })

  it('never the word heard the round before, and his mix-up comes in', () => {
    for (let seed = 1; seed <= 100; seed++) expect(enCauldronRound(ctxAt(1, seed), 'w-sat', allFiles).target.soundId).not.toBe('w-sat')
    // he took e for a: when a is missing, e is a tile
    let asked = 0
    for (let seed = 1; seed <= 400; seed++) {
      const r = enCauldronRound(ctxAt(2, seed, { a: { e: 3 } }), undefined, allFiles)
      if (rightOf(r).id !== 'a') continue
      asked++
      expect(r.orbs.map((o) => o.id)).toContain('e')
    }
    expect(asked).toBeGreaterThan(5)
  })
})
