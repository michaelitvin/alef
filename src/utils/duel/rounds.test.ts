import { describe, it, expect } from 'vitest'
import { makeRound, pickTarget } from './rounds'
import { DUEL_MARKS, twinOf } from './marks'

/** Deterministic RNG (mulberry32) for repeatable tests. */
function seeded(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const base = { runMisses: {}, lifetimeMisses: {} }

describe('makeRound', () => {
  it('pads: target present, right size, distinct marks; D has one picture per sound', () => {
    const rng = seeded(1)
    for (let i = 0; i < 300; i++) {
      const wave = 1 + (i % 6)
      const r = makeRound({ id: i, wave, boss: false, rng, ...base })
      expect(r.word.group).toBe(r.target.group)
      if (r.type === 'D') {
        expect(r.runes).toEqual([])
        expect(r.padWords.map((w) => w.group).sort()).toEqual(['a', 'e', 'i', 'o', 'silent', 'u'])
        expect(r.padWords.find((w) => w.group === r.target.group)).toBe(r.word)
        continue
      }
      expect(r.runes).toHaveLength(wave < 3 ? 4 : 6)
      expect(r.runes.map((m) => m.id)).toContain(r.target.id)
      expect(new Set(r.runes.map((m) => m.id)).size).toBe(r.runes.length)
      const twin = twinOf(r.target)
      if (r.type === 'C' && twin) expect(r.runes.map((m) => m.id)).toContain(twin.id)
    }
  })
  it('waves 1-2 only use A; no D rounds at all; boss rounds use the wave boss and slower walk', () => {
    const rng = seeded(2)
    for (let i = 0; i < 100; i++) expect(makeRound({ id: i, wave: 2, boss: false, rng, ...base }).type).toBe('A')
    for (let i = 0; i < 200; i++) expect(makeRound({ id: i, wave: 4, boss: false, rng, ...base }).type).not.toBe('D')
    const boss = makeRound({ id: 1, wave: 10, boss: true, rng, ...base })
    expect(boss.monster).toBe('troll')
    expect(boss.walkMs).toBeCloseTo(Math.max(3500, 9000 - 650 * 9) * 1.4)
  })
  it('monsters come from the unlocked roster', () => {
    const rng = seeded(3)
    for (let i = 0; i < 100; i++) expect(['fuzzy', 'blob']).toContain(makeRound({ id: i, wave: 1, boss: false, rng, ...base }).monster)
  })
})

describe('pickTarget weighting', () => {
  const share = (runMisses: Record<string, number>, lifetimeMisses: Record<string, number>, seed: number) => {
    const rng = seeded(seed)
    let n = 0
    for (let i = 0; i < 4000; i++) if (pickTarget(rng, runMisses, lifetimeMisses).id === 'segol') n++
    return n / 4000
  }
  it('uniform without misses (~1/10)', () => {
    const s = share({}, {}, 4)
    expect(s).toBeGreaterThan(0.07)
    expect(s).toBeLessThan(0.13)
  })
  it('run misses weigh 2 each: weight 5 of 14', () => {
    expect(share({ segol: 2 }, {}, 5)).toBeGreaterThan(0.3)
  })
  it('lifetime misses add at most 2: weight 3 of 12', () => {
    const s = share({}, { segol: 1000 }, 6)
    expect(s).toBeGreaterThan(0.18)
    expect(s).toBeLessThan(0.32)
  })
  it('only returns real marks', () => {
    const rng = seeded(7)
    for (let i = 0; i < 50; i++) expect(DUEL_MARKS).toContain(pickTarget(rng, {}, {}))
  })
})
