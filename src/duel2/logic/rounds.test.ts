import { describe, expect, it } from 'vitest'
import type { Stage } from './content.ts'
import { item } from './content.ts'
import {
  broomTarget, broomWave, cauldronRound, ghostRound, ladderPlan, lookAlikeGroup, sameSound, isNewStageChoice,
  type Choice, type RoundCtx,
} from './rounds'

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
const noSameSound = (cs: Choice[]) => !cs.some((a, i) => cs.some((b, j) => i < j && sameSound(a, b)))
const oneMarkPerGroup = (cs: Choice[]) =>
  cs.every((a) => cs.every((b) => !a.group || a.group !== b.group || a.mark === b.mark))

function allChoiceSets(stage: Stage, seed: number): Choice[][] {
  const c = ctx(stage, seed)
  const sets: Choice[][] = []
  const kinds = stage === 1 ? (['letter'] as const) : (['letter', 'syllable'] as const)
  for (const kind of kinds) {
    const t = broomTarget(c, kind)
    sets.push(broomWave(c, t, kind))
    sets.push(ghostRound(c, kind).signs)
  }
  if (stage > 1) for (const s of ladderPlan(c, 5).steps) sets.push(s.plates)
  return sets
}

describe('rounds', () => {
  it('no hearing choice holds two items with the same sound', () => {
    for (const stage of [1, 2, 3, 4] as Stage[])
      for (let seed = 1; seed <= 500; seed++)
        for (const cs of allChoiceSets(stage, seed)) expect(noSameSound(cs), `${stage}/${seed}: ${cs.map((c) => c.id)}`).toBe(true)
  }, 120_000)
  it('no choice holds a left-out syllable', () => {
    for (const stage of [2, 3] as Stage[])
      for (let seed = 1; seed <= 400; seed++)
        for (const cs of allChoiceSets(stage, seed)) expect(cs.some((c) => c.id === 'vav-cholam'), cs.map((c) => c.id).join()).toBe(false)
  }, 120_000)
  it('only opened-stage items', () => {
    for (let seed = 1; seed <= 300; seed++)
      for (const cs of allChoiceSets(2, seed)) expect(cs.some((c) => c.kind === 'syllable' && item(c.itemId).soft)).toBe(false)
  }, 60_000)
  it('three distinct choices, one target', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const c = ctx(3, seed)
      const t = broomTarget(c, 'syllable')
      const w = broomWave(c, t, 'syllable')
      expect(new Set(w.map((x) => x.id)).size).toBe(3)
      expect(w.some((x) => x.id === t.id)).toBe(true)
      const g = ghostRound(c, 'letter')
      expect(new Set(g.signs.map((x) => x.id)).size).toBe(3)
      expect(g.signs.some((x) => x.id === g.target.id)).toBe(true)
    }
  })
  it('one mark per group', () => {
    for (let seed = 1; seed <= 300; seed++) for (const cs of allChoiceSets(3, seed)) expect(oneMarkPerGroup(cs)).toBe(true)
  }, 60_000)
  it('confusion partner joins the wave', () => {
    const c = ctx(2, 7, { confusions: { letters: {}, syllables: { 'dalet-a': { 'resh-a': 3 } } } })
    const t: Choice = { kind: 'syllable', id: 'dalet-kamatz', text: 'דָ', soundId: 'syl-d-a', itemId: 'dalet', group: 'a', mark: 'kamatz' }
    for (let i = 0; i < 20; i++) expect(broomWave(c, t, 'syllable').some((x) => x.itemId === 'resh' && x.group === 'a')).toBe(true)
  })
  it('look-alike group from confusions', () => {
    expect(lookAlikeGroup(ctx(1, 1, { confusions: { letters: { dalet: { he: 3 } }, syllables: {} } }), 'dalet')).toContain('he')
    expect(lookAlikeGroup(ctx(1, 1, { confusions: { letters: { dalet: { he: 2 } }, syllables: {} } }), 'dalet')).toEqual(['dalet', 'resh'])
  })
  it('ladder keeps one part fixed', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const p = ladderPlan(ctx(3, seed), 5)
      expect(p.steps.length).toBe(5)
      for (const s of p.steps) {
        expect(s.plates.some((x) => x.id === s.target.id)).toBe(true)
        if (p.fixed === 'letter') expect(new Set(s.plates.map((x) => x.itemId)).size).toBe(1)
        if (p.fixed === 'vowel') expect(new Set(s.plates.map((x) => x.mark)).size).toBe(1)
        if (p.fixed === 'dot') expect(s.plates.some((x) => x.nearMissOf === s.target.id)).toBe(true)
      }
    }
  })
  it('ladder kind can be forced (the gallery)', () => {
    expect(ladderPlan(ctx(3, 1), 5, 'vowel').fixed).toBe('vowel')
    expect(ladderPlan(ctx(3, 1), 5, 'dot').fixed).toBe('dot')
    expect(ladderPlan(ctx(2, 1), 5, 'dot').fixed).not.toBe('dot')
  })
  it('ladder dot contrast only from stage 3', () => {
    for (let seed = 1; seed <= 200; seed++) expect(ladderPlan(ctx(2, seed), 5).fixed).not.toBe('dot')
  })
  it('the other form of a dotted letter is a near miss', () => {
    const c = ctx(3, 3)
    const t: Choice = { kind: 'syllable', id: 'bet-kamatz', text: 'בָּ', soundId: 'syl-b-a', itemId: 'bet', group: 'a', mark: 'kamatz' }
    let seen = 0
    for (let i = 0; i < 40; i++) {
      const vet = broomWave(c, t, 'syllable').find((x) => x.itemId === 'vet')
      if (vet) { seen++; expect(vet.nearMissOf).toBe('bet-kamatz') }
    }
    expect(seen).toBeGreaterThan(0)
  })
  it('new-stage choices', () => {
    expect(isNewStageChoice(2, { kind: 'syllable', id: 'bet-kamatz', text: '', soundId: '', itemId: 'bet', group: 'a', mark: 'kamatz' })).toBe(true)
    expect(isNewStageChoice(3, { kind: 'syllable', id: 'bet-kamatz', text: '', soundId: '', itemId: 'bet', group: 'a', mark: 'kamatz' })).toBe(false)
    expect(isNewStageChoice(3, { kind: 'syllable', id: 'vet-kamatz', text: '', soundId: '', itemId: 'vet', group: 'a', mark: 'kamatz' })).toBe(true)
  })
  it('cauldron offers three groups including the target', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const r = cauldronRound(ctx(2, seed))
      expect(new Set(r.orbs.map((m) => m.group)).size).toBe(3)
      expect(r.orbs.some((m) => m.id === r.target.mark.id)).toBe(true)
      expect(r.letter.id).toBe(r.target.item.id)
    }
  })
})
