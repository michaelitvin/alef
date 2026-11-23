// The English broom's rounds (design Part 5): a unit's sound at stage 1, then words one unit apart and heart words; the
// shared rules of every English screen's rounds.
import { describe, expect, it } from 'vitest'
import type { Choice, RoundCtx } from '../../../logic/rounds'
import { seeded } from '../../../testing/runHarness'
import { unit } from '../../content/units'
import { WORDS, word } from '../../content/words'
import { enBroomTarget, enBroomWave, oneUnitApart, wordChoice } from './broom'

const ctxAt = (stage: number, seed = 1, letters: Record<string, Record<string, number>> = {}): RoundCtx =>
  ({ rng: seeded(seed), stage, tallies: {}, recent: {}, confusions: { letters, syllables: {} } })

/** the units a choice is made of */
const unitsOf = (c: Choice): string[] => (c.kind === 'unit' ? [c.id] : word(c.id).units)

/** `n` targets and a wave for each, at `stage` */
function flights(stage: number, n = 300): { target: Choice; wave: Choice[] }[] {
  const out: { target: Choice; wave: Choice[] }[] = []
  for (let seed = 1; seed <= n; seed++) {
    const ctx = ctxAt(stage, seed)
    const target = enBroomTarget(ctx, 'syllable')
    out.push({ target, wave: enBroomWave(ctx, target, 'syllable') })
  }
  return out
}

describe('the English broom', () => {
  it('stage 1 targets are sounds of stage-1 units', () => {
    const all = flights(1)
    for (const { target, wave } of all) {
      expect(target.kind).toBe('unit')
      expect(unit(target.id).stage).toBe(1)
      expect(target.soundId).toBe(`snd-${unit(target.id).sound}`)
      for (const c of wave) expect(unit(c.id).stage).toBe(1)
    }
    expect(new Set(all.map((f) => f.target.id)).size).toBe(8)
  })

  it('a word wave differs from its target in one unit', () => {
    let words = 0
    for (const stage of [2, 3, 4, 5, 6, 8, 9]) {
      for (const { target, wave } of flights(stage, 200)) {
        if (target.kind !== 'word' || target.heart) continue
        words++
        const w = word(target.id)
        expect(wave).toHaveLength(3)
        const others = wave.filter((c) => c.id !== target.id)
        for (const c of others) expect(oneUnitApart(w, [word(c.id)])).toHaveLength(1)
      }
    }
    expect(words).toBeGreaterThan(300)
    // ship · chip · shop
    const ship = wordChoice(word('ship'))
    const wave = enBroomWave(ctxAt(4, 3), ship, 'syllable')
    expect(wave.map((c) => c.id)).toContain('ship')
    for (const c of wave.filter((x) => x.id !== 'ship')) expect(word(c.id).units.filter((u, i) => u !== word('ship').units[i])).toHaveLength(1)
  })

  it('a heart word wave has no picture', () => {
    let hearts = 0
    for (const stage of [2, 4, 6, 9]) {
      for (const { target, wave } of flights(stage, 300)) {
        if (!target.heart) continue
        hearts++
        expect(word(target.id).kind).toBe('heart')
        expect(target.soundId).toBe(`hw-${target.text}`)
        for (const c of wave) {
          expect(c.picture).toBeUndefined()
          expect(['heart', 'real']).toContain(word(c.id).kind)
        }
      }
    }
    expect(hearts).toBeGreaterThan(20)
  })

  it('later stages bring words, and stage 1 none', () => {
    const share = (stage: number) => flights(stage).filter((f) => f.target.kind === 'word').length / 300
    expect(share(1)).toBe(0)
    expect(share(4)).toBeGreaterThan(0.3)
    expect(share(6)).toBeGreaterThan(share(3))
  })

  it('keeps the shared rules: opened units only, no two sounds alike, never I against l, no picture, every word in WORDS', () => {
    const texts = new Set(WORDS.map((w) => w.text))
    for (const stage of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      for (const { target, wave } of flights(stage, 150)) {
        expect(wave).toContain(target)
        expect(new Set(wave.map((c) => c.soundId)).size).toBe(wave.length)
        expect(new Set(wave.map((c) => c.text)).size).toBe(wave.length)
        for (const c of wave) {
          expect(c.picture).toBeUndefined()
          for (const u of unitsOf(c)) expect(unit(u).stage).toBeLessThanOrEqual(stage)
          if (c.kind === 'word') expect(texts.has(c.text)).toBe(true)
        }
        const t = wave.map((c) => c.text)
        expect(t.some((x) => x.includes('I')) && t.some((x) => x.includes('l'))).toBe(false)
        if (target.kind === 'unit') for (const c of wave) expect(c.kind).toBe('unit')
      }
    }
    // the words that sound alike never meet
    const four = enBroomWave(ctxAt(8, 2), wordChoice(word('four')), 'syllable')
    expect(four.map((c) => c.text)).not.toContain('for')
  })

  it('a unit wave has his mix-up, never the same sound twice, and the target is never the sound before', () => {
    const ctx = ctxAt(3, 4, { b: { d: 3 } })
    const b = enBroomWave(ctx, { kind: 'unit', id: 'b', text: 'b', soundId: 'snd-b', itemId: 'b' }, 'letter')
    expect(b.map((c) => c.id)).toContain('d')
    for (let seed = 1; seed < 100; seed++) {
      const c = enBroomWave(ctxAt(4, seed), { kind: 'unit', id: 'c', text: 'c', soundId: 'snd-k', itemId: 'c' }, 'letter')
      expect(c.map((x) => x.id).filter((id) => ['c', 'k', 'ck'].includes(id))).toEqual(['c'])
      expect(enBroomTarget(ctxAt(1, seed), 'letter', 'snd-m').soundId).not.toBe('snd-m')
    }
  })

  it('a target whose voice file is there is chosen first', () => {
    for (let seed = 1; seed < 50; seed++) expect(enBroomTarget(ctxAt(1, seed), 'letter', undefined, 'broom', (id) => id === 'snd-f').id).toBe('f')
  })
})
