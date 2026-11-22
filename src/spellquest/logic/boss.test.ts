import { describe, expect, it } from 'vitest'
import type { Stage } from './content.ts'
import { item } from './content.ts'
import { BOSS_KINDS, bossOpen, bossScores, bossTarget, bossWave, chooseBoss, isBossVisit, type BossKind } from './boss'
import { sameSound, type RoundCtx } from './rounds'

function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const ctx = (stage: Stage, seed = 1, extra: Partial<RoundCtx> = {}): RoundCtx => ({
  rng: seeded(seed), stage, tallies: {}, recent: {}, confusions: { letters: {}, syllables: {} }, ...extra,
})
const none = { letters: {}, vowels: {} }

describe('boss', () => {
  it('comes on every second broom visit, never on the first', () => {
    expect([1, 2, 3, 4, 5, 6].map(isBossVisit)).toEqual([false, true, false, true, false, true])
  })
  it('stage gates: dot and shin need stage 3, mimic and bat stage 2, none at stage 1', () => {
    expect(BOSS_KINDS.filter((k) => bossOpen(k, 2))).toEqual(['mimic', 'bat'])
    expect(BOSS_KINDS.filter((k) => bossOpen(k, 3))).toEqual(BOSS_KINDS)
    expect(chooseBoss({ stage: 1, confusions: none, beaten: [], last: null, rng: () => 0 })).toBeNull()
  })
  it('scores his real mix-ups per kind', () => {
    const s = bossScores({ letters: { pe: { fe: 4 }, fe: { pe: 1 }, shin: { sin: 2 }, dalet: { resh: 3 } }, vowels: { o: { u: 5 } } })
    expect(s).toEqual({ dot: 5, shin: 2, mimic: 3, bat: 5 })
  })
  it('chooses the kind he mixes up most, prefers an unbeaten one when close, never the same twice in a row', () => {
    const conf = { letters: { pe: { fe: 6 }, dalet: { resh: 1 } }, vowels: {} }
    expect(chooseBoss({ stage: 3, confusions: conf, beaten: [], last: null, rng: () => 0 })).toBe('dot')
    expect(chooseBoss({ stage: 3, confusions: conf, beaten: [], last: 'dot', rng: () => 0 })).not.toBe('dot')
    // dot beaten (6) against unbeaten mimic (1 + bonus 3): still dot; with a close score the unbeaten one wins
    expect(chooseBoss({ stage: 3, confusions: conf, beaten: ['dot'], last: null, rng: () => 0 })).toBe('dot')
    const close = { letters: { pe: { fe: 3 }, dalet: { resh: 2 } }, vowels: {} }
    expect(chooseBoss({ stage: 3, confusions: close, beaten: ['dot'], last: null, rng: () => 0 })).toBe('mimic')
    // stage 2: mimic and bat take turns
    for (const last of ['mimic', 'bat'] as BossKind[])
      expect(chooseBoss({ stage: 2, confusions: none, beaten: [], last, rng: () => 0.5 })).toBe(last === 'mimic' ? 'bat' : 'mimic')
  })
  it('each wave is two orbs: the target and its twin, made of the kind\'s mix-up', () => {
    for (const kind of BOSS_KINDS)
      for (let seed = 1; seed <= 120; seed++) {
        const c = ctx(3, seed)
        const t = bossTarget(c, kind)
        const w = bossWave(c, kind, t)
        expect(w.length).toBe(2)
        expect(w.some((x) => x.id === t.id)).toBe(true)
        const twin = w.find((x) => x.id !== t.id)!
        expect(sameSound(t, twin), `${kind} ${t.id} ${twin.id}`).toBe(false)
        if (kind === 'dot') {
          expect(['bet', 'vet', 'kaf', 'khaf', 'pe', 'fe']).toContain(t.itemId)
          expect(twin.itemId).toBe(item(t.itemId).pair)
          expect(twin.mark).toBe(t.mark)
          expect(twin.nearMissOf).toBe(t.id)
        }
        if (kind === 'shin') { expect(['shin', 'sin']).toContain(t.itemId); expect(twin.itemId).toBe(item(t.itemId).pair); expect(twin.mark).toBe(t.mark) }
        if (kind === 'mimic') { expect(twin.mark).toBe(t.mark); expect(twin.itemId).not.toBe(t.itemId) }
        if (kind === 'bat') {
          expect(twin.itemId).toBe(t.itemId)
          expect(['o', 'u']).toContain(t.group)
          expect(twin.group).toBe(t.group === 'o' ? 'u' : 'o')
        }
      }
  })
  it('a mimic at stage 2 uses only opened letters, and his own look-alike mix-up first', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const c = ctx(2, seed)
      const t = bossTarget(c, 'mimic')
      for (const x of bossWave(c, 'mimic', t)) expect(item(x.itemId).soft).toBe(false)
    }
    const c = ctx(2, 3, { confusions: { letters: { he: { tav: 4 } }, syllables: {} } })
    const he = bossWave(c, 'mimic', { kind: 'syllable', id: 'he-kamatz', text: 'הָ', soundId: 'syl-h-a', itemId: 'he', group: 'a', mark: 'kamatz' })
    expect(he.map((x) => x.itemId)).toContain('tav')
  })
  it('the sound changes inside the pair: avoid the sound before', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const c = ctx(3, seed)
      const t = bossTarget(c, 'shin')
      expect(bossTarget(c, 'shin', t.soundId).soundId).not.toBe(t.soundId)
    }
  })
})
