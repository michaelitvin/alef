// The Hebrew spell book's rounds (design Part 7): the door words, one box per consonant-vowel syllable, the closing letter
// printed faint; the wrong tiles differ in sound from every box (never a same-sound spelling: ת/ט, כּ/ק, ח/כ, ס/שׂ, א/ע,
// kamatz/patach). It opens with the doors (stage 4), after them.
import { describe, expect, it } from 'vitest'
import type { SpellBox } from '../policies/spell'
import { seeded } from '../testing/runHarness'
import { WORDS } from '../data/words'
import { item, mark, type MarkId } from './content'
import type { RoundCtx } from './rounds'
import { cycleOf } from './run'
import { screensOfStage } from './stages'
import { heSpellRound } from './spell'

const ctxAt = (seed: number, stage = 4): RoundCtx => ({ rng: seeded(seed), stage, tallies: {}, recent: {}, confusions: { letters: {}, syllables: {} } })
/** a context whose round spells `id` (the first seed that picks it) */
function ctxFor(id: string): RoundCtx {
  for (let seed = 1; seed < 2000; seed++) if (heSpellRound(ctxAt(seed))?.word === id) return ctxAt(seed)
  throw new Error(`no seed picks ${id}`)
}
const DOOR_WORDS_AT_4 = WORDS.filter((w) => w.door)
/** a syllable tile's letter and mark, from its unit id `<item>-<mark>` (the mark ids hold one hyphen at most: cholam-male) */
const parts = (b: SpellBox) => {
  const m = /^([a-z]+)-(.+)$/.exec(b.unit)!
  return { item: item(m[1]), mark: mark(m[2] as MarkId) }
}
/** two syllables sound the same: their consonants' sounds and their vowel groups match (worked out apart from soundId) */
const sameSoundSyl = (a: SpellBox, b: SpellBox) => {
  const x = parts(a)
  const y = parts(b)
  return x.item.sound === y.item.sound && x.mark.group === y.mark.group
}

describe('the Hebrew spell book', () => {
  it('בַּיִת: two boxes, ת faint', () => expect(heSpellRound(ctxFor('house'))).toMatchObject({ boxes: [{ text: 'בַּ' }, { text: 'יִ' }], tail: 'ת' }))
  it('a same-sound syllable is never a wrong tile', () => {
    for (const w of DOOR_WORDS_AT_4) for (const t of heSpellRound(ctxFor(w.id))!.tiles) for (const b of heSpellRound(ctxFor(w.id))!.boxes)
      if (t.unit !== b.unit) expect(sameSoundSyl(t, b)).toBe(false)
  })
  it('the spell book opens with the doors (stage 4), after them', () => { expect(screensOfStage(3)).not.toContain('spell'); expect(cycleOf(4, true)).toEqual(['tower', 'broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'spell', 'draw', 'draw-hand']) })

  it('every door word: its syllables as boxes, each tile once, the word\'s voice and picture, the answers on its syllables', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 300; seed++) {
      const r = heSpellRound(ctxAt(seed), (k) => `file:${k}`)!
      const w = WORDS.find((x) => x.id === r.word)!
      seen.add(w.id)
      expect(w.door).toBe(true)
      expect(r.mode).toBe('tiles')
      expect(r.wordVoice).toBe(`w-${w.id}`)
      expect(r.picture).toBe(`file:${w.picture}`)
      expect(r.boxes.map((b) => b.unit)).toEqual(w.syllables!.map((s) => `${s.item}-${s.mark}`))
      expect(r.boxes.map((b) => b.text).join('') + (r.tail ?? '')).toBe(w.text)
      expect(r.tail).toBe(w.syllables![w.syllables!.length - 1].tail)
      // each box's answer counts on its syllable (the Hebrew counting rules)
      for (const b of r.boxes) expect(b.choice).toMatchObject({ kind: 'syllable', id: b.unit, soundId: b.soundId })
      // every box's tile is there, every tile once; 3 wrong ones, that sound like no box and like no other tile
      for (const b of r.boxes) expect(r.tiles.filter((t) => t.unit === b.unit)).toHaveLength(1)
      expect(new Set(r.tiles.map((t) => t.unit)).size).toBe(r.tiles.length)
      const wrong = r.tiles.filter((t) => !r.boxes.some((b) => b.unit === t.unit))
      expect(wrong).toHaveLength(3)
      for (const t of wrong) for (const o of r.tiles) if (o !== t) expect(sameSoundSyl(t, o), `${w.id}: ${t.unit} ~ ${o.unit}`).toBe(false)
      expect(r.near).toBeUndefined()
      // never the closing letter as a tile
      expect(r.tiles.map((t) => t.text)).not.toContain(r.tail)
    }
    expect([...seen].sort()).toEqual(DOOR_WORDS_AT_4.map((w) => w.id).sort())
  })

  it('no picture when its file is not there; the same seed gives the same round', () => {
    expect(heSpellRound(ctxAt(5))!.picture).toBeUndefined()
    expect(heSpellRound(ctxAt(5))).toEqual(heSpellRound(ctxAt(5)))
  })
})
