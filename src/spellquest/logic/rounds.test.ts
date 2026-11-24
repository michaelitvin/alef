import { describe, expect, it } from 'vitest'
import { FULL_SWEEP } from '../../test/fullSweep'
import type { Stage } from './content.ts'
import { item, syllable } from './content.ts'
import { WORDS } from '../data/words'
import {
  broomTarget, broomWave, cauldronRound, doorKeys, doorWords, syllableChoice, ghostRound, ladderPlan, lookAlikeGroup, sameSound, isNewStageChoice,
  type Choice, type RoundCtx,
} from './rounds'

// seeds 1..n on CI or FULL_SWEEP=1; locally the first fifth (seeds are deterministic)
const seeds = (n: number) => (FULL_SWEEP ? n : Math.ceil(n / 5))

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
      for (let seed = 1; seed <= seeds(500); seed++)
        for (const cs of allChoiceSets(stage, seed)) expect(noSameSound(cs), `${stage}/${seed}: ${cs.map((c) => c.id)}`).toBe(true)
  }, 120_000)
  it('no choice holds a left-out syllable', () => {
    for (const stage of [2, 3] as Stage[])
      for (let seed = 1; seed <= seeds(400); seed++)
        for (const cs of allChoiceSets(stage, seed)) expect(cs.some((c) => c.id === 'vav-cholam'), cs.map((c) => c.id).join()).toBe(false)
  }, 120_000)
  it('only opened-stage items', () => {
    for (let seed = 1; seed <= seeds(300); seed++)
      for (const cs of allChoiceSets(2, seed)) expect(cs.some((c) => c.kind === 'syllable' && item(c.itemId).soft)).toBe(false)
  }, 60_000)
  it('three distinct choices, one target', () => {
    for (let seed = 1; seed <= seeds(300); seed++) {
      const c = ctx(3, seed)
      const t = broomTarget(c, 'syllable')
      const w = broomWave(c, t, 'syllable')
      // a dotted target's wave can be two orbs: the target and its twin (spec 2026-11-07)
      expect(new Set(w.map((x) => x.id)).size).toBe(w.length)
      if (w.length === 2) expect(w.map((x) => x.itemId).sort()).toEqual([t.itemId, item(t.itemId).pair!].sort())
      else expect(w.length).toBe(3)
      expect(w.some((x) => x.id === t.id)).toBe(true)
      const g = ghostRound(c, 'letter')
      expect(new Set(g.signs.map((x) => x.id)).size).toBe(3)
      expect(g.signs.some((x) => x.id === g.target.id)).toBe(true)
    }
  })
  it('one mark per group', () => {
    for (let seed = 1; seed <= seeds(300); seed++) for (const cs of allChoiceSets(3, seed)) expect(oneMarkPerGroup(cs)).toBe(true)
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
    for (let seed = 1; seed <= seeds(200); seed++) {
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
  it('no plate offers the syllable of the rung below', () => {
    let small = 0
    for (const stage of [2, 3, 4] as Stage[])
      for (const force of [undefined, 'letter', 'vowel', 'dot'] as const)
        for (let seed = 1; seed <= seeds(300); seed++) {
          const p = ladderPlan(ctx(stage, seed), 5, force)
          p.steps.forEach((s, k) => {
            expect(s.plates.length).toBe(3)
            expect(s.plates.some((x) => x.id === s.target.id)).toBe(true)
            if (k === 0) return
            const below = p.steps[k - 1].target
            if (s.plates.some((x) => x.id === below.id || x.soundId === below.soundId)) small++
          })
        }
    expect(small, 'plates that still offer the rung below').toBe(0)
  }, 120_000)
  it('ladder kind can be forced (the gallery)', () => {
    expect(ladderPlan(ctx(3, 1), 5, 'vowel').fixed).toBe('vowel')
    expect(ladderPlan(ctx(3, 1), 5, 'dot').fixed).toBe('dot')
    expect(ladderPlan(ctx(2, 1), 5, 'dot').fixed).not.toBe('dot')
  })
  it('ladder dot contrast only from stage 3', () => {
    for (let seed = 1; seed <= seeds(200); seed++) expect(ladderPlan(ctx(2, seed), 5).fixed).not.toBe('dot')
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
  it('about a third of the waves of a dotted target are the target and its twin only (spec: two-orb dot waves)', () => {
    for (const [it, pair] of [['bet', 'vet'], ['fe', 'pe'], ['kaf', 'khaf'], ['shin', 'sin']]) {
      const c = ctx(3, 9)
      const t = syllableChoice(syllable(it, 'patach'))
      let two = 0
      for (let i = 0; i < 300; i++) {
        const w = broomWave(c, t, 'syllable')
        if (w.length === 2) {
          two++
          const twin = w.find((x) => x.id !== t.id)!
          expect(twin.itemId).toBe(pair)
          expect(twin.mark).toBe(t.mark)
          expect(w.some((x) => x.id === t.id)).toBe(true)
        }
      }
      expect(two / 300, it).toBeGreaterThan(0.25)
      expect(two / 300, it).toBeLessThan(0.42)
    }
  })
  it('no two-orb wave before the twin is opened (stage 2), and none for a letter without a twin', () => {
    const t2: Choice = { kind: 'syllable', id: 'bet-kamatz', text: 'בָּ', soundId: 'syl-b-a', itemId: 'bet', group: 'a', mark: 'kamatz' }
    const t3: Choice = { kind: 'syllable', id: 'mem-kamatz', text: 'מָ', soundId: 'syl-m-a', itemId: 'mem', group: 'a', mark: 'kamatz' }
    for (let seed = 1; seed <= 100; seed++) {
      expect(broomWave(ctx(2, seed), t2, 'syllable').length).toBe(3)
      expect(broomWave(ctx(3, seed), t3, 'syllable').length).toBe(3)
    }
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
  it('a ladder never asks for the same sound twice (the parent: "da" three times in a row)', () => {
    // a weak "da" in the tallies made every rung pick it
    const weak = { 's:dalet-a': { seen: 10, wrong: 3 }, 'l:dalet': { seen: 10, wrong: 3 } }
    for (const stage of [2, 3, 4] as Stage[])
      for (const fixed of ['letter', 'vowel', 'dot'] as const)
        for (let seed = 1; seed <= 60; seed++) {
          if (fixed === 'dot' && stage < 3) continue
          const p = ladderPlan(ctx(stage, seed, { tallies: weak }), 5, fixed)
          const sounds = p.steps.map((st) => st.target.soundId)
          expect(new Set(sounds).size, `${stage} ${fixed} ${seed}: ${sounds}`).toBe(sounds.length)
          for (const st of p.steps) expect(st.plates.map((x) => x.id)).toContain(st.target.id)
        }
  })
  it('ghosts and cauldron do not repeat the sound of the round before', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const g = ghostRound(ctx(2, seed), 'syllable', 'syl-d-a')
      expect(g.target.soundId).not.toBe('syl-d-a')
      const l = ghostRound(ctx(2, seed), 'letter', 'ln-dalet')
      expect(l.target.soundId).not.toBe('ln-dalet')
      expect(cauldronRound(ctx(2, seed), 'syl-d-a').target.soundId).not.toBe('syl-d-a')
    }
  })

})

describe('doors at the last stage', () => {
  const word = (id: string) => WORDS.find((w) => w.id === id)!
  const group = (id: string) => (['patach', 'kamatz'].includes(word(id).first.mark) ? 'a' : word(id).first.mark === 'segol' ? 'e' : word(id).first.mark)
  const idsOf = (ws: { id: string }[]) => ws.map((w) => w.id)

  it('picks 4 different words, the words near 1 mistake in 5 first', () => {
    for (let s = 1; s <= 20; s++) {
      const ids = idsOf(doorWords(ctx(4, s), 4))
      expect(new Set(ids).size).toBe(4)
    }
    // the picker aims at 1 mistake in 5: the word near that rate comes far more often than words he knows well
    const tallies: RoundCtx['tallies'] = {}
    for (const w of WORDS.filter((x) => x.door)) tallies[`w:${w.id}`] = w.id === 'fox' ? { seen: 20, wrong: 4 } : { seen: 100, wrong: 0 }
    let fox = 0
    for (let s = 1; s <= 40; s++) if (idsOf(doorWords(ctx(4, s, { tallies }), 3)).includes('fox')) fox++
    let base = 0
    for (let s = 1; s <= 40; s++) if (idsOf(doorWords(ctx(4, s), 3)).includes('fox')) base++
    expect(fox).toBeGreaterThan(base)
  })

  it('key 2 shares the first letter, else the first vowel group', () => {
    for (let s = 1; s <= 20; s++) {
      const keys = doorKeys(ctx(4, s), word('camel'))
      expect(keys).toHaveLength(3)
      expect(new Set(idsOf(keys)).size).toBe(3)
      expect(keys.map((k) => k.id)).toContain('camel')
      expect(keys.map((k) => k.id)).toContain('carrot')
      const ball = idsOf(doorKeys(ctx(4, s), word('ball')))
      expect(ball).toContain('dog')
      const cat = doorKeys(ctx(4, s), word('cat')).filter((k) => k.id !== 'cat')
      expect(cat.some((k) => group(k.id) === 'a')).toBe(true)
      const rose = doorKeys(ctx(4, s), word('rose')).filter((k) => k.id !== 'rose')
      expect(rose.some((k) => group(k.id) === 'e')).toBe(true)
      expect(idsOf(doorKeys(ctx(4, s), word('fox')))).toContain('cake')
      expect(idsOf(doorKeys(ctx(4, s), word('cake')))).toContain('fox')
    }
  })

  it('tent and book get two random other keys', () => {
    for (const id of ['tent', 'book']) {
      const seen = new Set<string>()
      for (let s = 1; s <= 30; s++) {
        const keys = doorKeys(ctx(4, s), word(id))
        expect(new Set(idsOf(keys)).size).toBe(3)
        for (const k of keys) if (k.id !== id) seen.add(k.id)
      }
      expect(seen.size).toBeGreaterThan(4)
    }
  })

  it('stage 3 keeps the random pick', () => {
    const before = idsOf(doorWords(ctx(3, 7), 3))
    expect(before).toHaveLength(3)
    let off = 0
    for (let s = 1; s <= 30; s++) if (!idsOf(doorKeys(ctx(3, s), word('camel'))).includes('carrot')) off++
    expect(off).toBeGreaterThan(0)
  })
})
