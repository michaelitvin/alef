// The English flight bosses: their kinds open by stage and are scored by his English mix-ups; each throws its family's
// target and twin, two orbs a wave, under the shared rules.
import { describe, expect, it } from 'vitest'
import type { BossKind } from '../../../spellquest/logic/boss'
import { chooseBoss } from '../../../spellquest/logic/boss'
import type { RoundCtx } from '../../../spellquest/logic/rounds'
import { seeded } from '../../../spellquest/testing/runHarness'
import { HEBREW } from '../../../spellquest/course/hebrew'
import { unit } from '../../content/units'
import { word } from '../../content/words'
import { oneUnitApart } from './broom'
import { enBossKinds, enBossTarget, enBossWave } from './boss'

const ctxAt = (stage: number, seed = 1, letters: Record<string, Record<string, number>> = {}): RoundCtx =>
  ({ rng: seeded(seed), stage, tallies: {}, recent: {}, confusions: { letters, syllables: {} } })

const FAMILY: Record<Exclude<BossKind, 'dot'>, string[]> = { mimic: ['b', 'd', 'p', 'n', 'u', 'm', 'w', 'h'], bat: ['a', 'e', 'i', 'o', 'u'], shin: ['sh', 'ch', 'th'] }

describe('the English flight bosses', () => {
  it('open by stage: none at 1; mimic, bat and the dot thief at 2; the bird with the digraphs at 4', () => {
    expect(enBossKinds(1, { letters: {} }).open).toEqual([])
    expect(enBossKinds(2, { letters: {} }).open.sort()).toEqual(['bat', 'dot', 'mimic'])
    expect(enBossKinds(3, { letters: {} }).open).not.toContain('shin')
    expect(enBossKinds(4, { letters: {} }).open.sort()).toEqual(['bat', 'dot', 'mimic', 'shin'])
  })

  it('are scored by his English mix-ups, and the most-made one comes', () => {
    const k = enBossKinds(4, { letters: { b: { d: 3 }, ship: { chip: 2 }, sh: { ch: 1 }, i: { e: 4 } } })
    expect(k.scores).toEqual({ mimic: 3, bat: 4, shin: 1, dot: 2 })
    // beaten all, so no bonus decides: bat (4) is his most-made mix-up
    expect(chooseBoss({ stage: 4, confusions: { letters: {}, vowels: {} }, beaten: ['dot', 'shin', 'mimic', 'bat'], last: null, rng: seeded(1), kinds: k })).toBe('bat')
    // Spell Quest's course keeps its own gates and scores
    expect(HEBREW.rounds.bossKinds).toBeUndefined()
  })

  it('each kind throws its family: the target and its twin, two orbs, under the shared rules', () => {
    for (const stage of [2, 4, 6, 9]) {
      for (const kind of enBossKinds(stage, { letters: {} }).open) {
        for (let seed = 1; seed <= 60; seed++) {
          const ctx = ctxAt(stage, seed)
          const target = enBossTarget(ctx, kind)
          const wave = enBossWave(ctx, kind, target)
          expect(wave).toHaveLength(2)
          expect(wave).toContain(target)
          const twin = wave.find((c) => c !== target)!
          expect(twin.soundId).not.toBe(target.soundId)
          expect(twin.picture).toBeUndefined()
          if (kind === 'dot') {
            expect(target.kind).toBe('word')
            expect(oneUnitApart(word(target.id), [word(twin.id)])).toHaveLength(1)
            for (const c of wave) for (const u of word(c.id).units) expect(unit(u).stage).toBeLessThanOrEqual(stage)
          } else {
            for (const c of wave) {
              expect(FAMILY[kind]).toContain(c.id)
              expect(unit(c.id).stage).toBeLessThanOrEqual(stage)
            }
          }
          expect(wave.some((c) => c.text.includes('I')) && wave.some((c) => c.text.includes('l'))).toBe(false)
        }
      }
    }
  }, 60_000)

  it('asks a unit of his stage when its family has one, and his own mix-up is the twin', () => {
    for (let seed = 1; seed <= 40; seed++) expect(['w', 'h']).toContain(enBossTarget(ctxAt(3, seed), 'mimic').id)
    const b = { kind: 'unit' as const, id: 'b', text: 'b', soundId: 'snd-b', itemId: 'b' }
    for (let seed = 1; seed <= 20; seed++) expect(enBossWave(ctxAt(2, seed, { b: { p: 4, d: 1 } }), 'mimic', b).map((c) => c.id)).toContain('p')
    // the sound before is not asked again
    for (let seed = 1; seed <= 20; seed++) expect(enBossTarget(ctxAt(4, seed), 'shin', 'snd-sh').id).not.toBe('sh')
  })
})
