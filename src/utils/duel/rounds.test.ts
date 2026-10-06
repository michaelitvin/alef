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
const base = { runMisses: {}, lifetime: {} }

describe('makeRound', () => {
  it('the round right after "a new monster!" brings that monster; later rounds mix', () => {
    const rng = seeded(9)
    for (let i = 0; i < 30; i++) expect(makeRound({ id: i, wave: 4, kills: 0, boss: false, rng, ...base }).monster).toBe('bat')
    for (let i = 0; i < 30; i++) expect(makeRound({ id: i, wave: 3, kills: 0, boss: false, rng, ...base }).monster).toBe('ghost')
    const later = new Set(Array.from({ length: 60 }, (_, i) => makeRound({ id: i, wave: 4, kills: 1, boss: false, rng, ...base }).monster))
    expect(later.size).toBeGreaterThan(1)
  })
  it('the first round of wave 3 is a sound screen, so its instruction explains the new kind of clue', () => {
    const rng = seeded(7)
    for (let i = 0; i < 50; i++) expect(makeRound({ id: i, wave: 3, kills: 0, boss: false, rng, ...base }).type).toBe('B')
    const later = new Set(Array.from({ length: 100 }, (_, i) => makeRound({ id: i, wave: 3, kills: 2, boss: false, rng, ...base }).type))
    expect([...later].sort()).toEqual(['A', 'B', 'C'])
    for (let i = 0; i < 50; i++) expect(makeRound({ id: i, wave: 4, kills: 0, boss: false, rng, ...base }).type).not.toBe('D')
  })
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
  type L = Record<string, { seen?: number; correct?: number; wrong?: number; timeout?: number }>
  const share = (runMisses: Record<string, number>, lifetime: L, seed: number, id = 'segol') => {
    const rng = seeded(seed)
    let n = 0
    for (let i = 0; i < 4000; i++) if (pickTarget(rng, runMisses, lifetime).id === id) n++
    return n / 4000
  }
  it('uniform without history (~1/10)', () => {
    const s = share({}, {}, 4)
    expect(s).toBeGreaterThan(0.07)
    expect(s).toBeLessThan(0.13)
  })
  it('run misses weigh 3 each', () => {
    expect(share({ segol: 2 }, {}, 5)).toBeGreaterThan(0.25)
  })
  it('lifetime: the mistake RATE counts, not the number of mistakes', () => {
    const others: L = Object.fromEntries(DUEL_MARKS.map((m) => [m.id, { seen: 20, correct: 18, wrong: 2 }]))
    const shaky = share({}, { ...others, segol: { seen: 4, correct: 1, wrong: 3 } }, 6)
    const solid = share({}, { ...others, segol: { seen: 400, correct: 397, wrong: 3 } }, 7)
    expect(shaky).toBeGreaterThan(0.2)
    expect(solid).toBeLessThan(0.1)
  })
  it('timeouts count as mistakes; a mark never seen sits between shaky and solid', () => {
    const solid: L = Object.fromEntries(DUEL_MARKS.map((m) => [m.id, { seen: 50, correct: 50 }]))
    expect(share({}, { ...solid, segol: { seen: 4, timeout: 3, correct: 1 } }, 8)).toBeGreaterThan(0.2)
    const { segol: _drop, ...rest } = solid
    const unseen = share({}, rest, 9)
    expect(unseen).toBeGreaterThan(0.1)
    expect(unseen).toBeLessThan(0.3)
  })
  it('always returns a mark', () => {
    const rng = seeded(3)
    for (let i = 0; i < 50; i++) expect(DUEL_MARKS).toContain(pickTarget(rng, {}, {}))
  })
})

describe('directional confusion', () => {
  const forced = (id: string) => ({ runMisses: { [id]: 1e6 }, lifetime: {} })
  const pads = (wave: number, target: string, confusions: Record<string, Record<string, number>>, seed: number, n = 200) => {
    const rng = seeded(seed)
    return Array.from({ length: n }, (_, i) => makeRound({ id: i, wave, kills: 1, boss: false, rng, ...forced(target), confusions }))
  }
  it('a mark he keeps tapping for the target is always on the board with it', () => {
    for (const r of pads(1, 'segol', { segol: { chirik: 3 } }, 11)) expect(r.runes.map((m) => m.id)).toContain('chirik')
  })
  it('it is one-way: confusing chirik→segol does not force chirik onto segol rounds', () => {
    const rs = pads(1, 'segol', { chirik: { segol: 3 } }, 12)
    const withChirik = rs.filter((r) => r.runes.some((m) => m.id === 'chirik')).length
    expect(withChirik).toBeLessThan(rs.length)
  })
  it('a single slip is not a pattern (needs 2+)', () => {
    const rs = pads(1, 'segol', { segol: { chirik: 1 } }, 13)
    expect(rs.filter((r) => r.runes.some((m) => m.id === 'chirik')).length).toBeLessThan(rs.length)
  })
  it('a same-sound partner joins name screens only (on picture/sound screens both would be right)', () => {
    const rs = pads(4, 'cholam', { cholam: { 'holam-male': 4 } }, 14, 300)
    for (const r of rs) {
      const has = r.runes.some((m) => m.id === 'holam-male')
      if (r.type === 'C') expect(has).toBe(true)
      else expect(has).toBe(false)
    }
    expect(rs.some((r) => r.type === 'C')).toBe(true)
  })
})
