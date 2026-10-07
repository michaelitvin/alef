import { describe, it, expect } from 'vitest'
import { makeRound, pickTarget, predictedMistakeRate } from './rounds'
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
const base = { lifetime: {}, recent: {} }

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

describe('predicted mistake rate: recent answers weigh most, history is remembered', () => {
  const t = (seen: number, wrong: number) => ({ seen, correct: seen - wrong, wrong })
  it('recent misses outweigh a long good history', () => {
    expect(predictedMistakeRate(t(50, 2), 'ooooxxx')).toBeGreaterThan(0.35)
    expect(predictedMistakeRate(t(50, 2), 'xxxoooo')).toBeLessThan(0.15)
  })
  it('the newest answer counts most', () => {
    expect(predictedMistakeRate(t(20, 2), 'ox')).toBeGreaterThan(predictedMistakeRate(t(20, 2), 'xo'))
  })
  it('history is not forgotten: a long-hard mark with two recent successes stays well above a mastered one', () => {
    const hard = predictedMistakeRate(t(40, 20), 'oo')
    expect(hard).toBeGreaterThan(0.2)
    expect(hard).toBeGreaterThan(3 * predictedMistakeRate(t(40, 0), 'oo'))
  })
  it('no history and no recent answers: the 0.25 prior', () => {
    expect(predictedMistakeRate(undefined, '')).toBeCloseTo(0.25, 2)
  })
})

describe('pickTarget: aim at a 1-in-5 predicted mistake rate', () => {
  type L = Record<string, { seen?: number; correct?: number; wrong?: number; timeout?: number }>
  const tally = (seen: number, wrong: number) => ({ seen, correct: seen - wrong, wrong })
  const shares = (lifetime: L, seed: number, recent: Record<string, string> = {}) => {
    const rng = seeded(seed)
    const n: Record<string, number> = {}
    for (let i = 0; i < 4000; i++) { const id = pickTarget(rng, lifetime, recent).id; n[id] = (n[id] ?? 0) + 1 }
    return (id: string) => (n[id] ?? 0) / 4000
  }
  const all = (t: { seen: number; correct: number; wrong: number }): L => Object.fromEntries(DUEL_MARKS.map((m) => [m.id, t]))
  it('no history: every mark sits at the same prior, so all are picked about equally', () => {
    const s = shares({}, 4)
    for (const m of DUEL_MARKS) { expect(s(m.id)).toBeGreaterThan(0.06); expect(s(m.id)).toBeLessThan(0.14) }
  })
  it('a mark he gets wrong about 1 in 5 is preferred over both a mastered one and a hopeless one', () => {
    const s = shares({ ...all(tally(40, 1)), segol: tally(40, 8), chirik: tally(40, 30) }, 5)
    expect(s('segol')).toBeGreaterThan(0.35)
    expect(s('segol')).toBeGreaterThan(3 * s('chirik'))
    expect(s('segol')).toBeGreaterThan(3 * s('kamatz'))
  })
  it('when nothing reaches 1 in 5, the hardest available marks are preferred', () => {
    const s = shares({ ...all(tally(60, 0)), segol: tally(60, 6) }, 6)
    expect(s('segol')).toBeGreaterThan(0.3)
  })
  it('a fresh slip on a mastered mark brings it back right away', () => {
    expect(shares(all(tally(60, 0)), 7, { segol: 'oooox' })('segol')).toBeGreaterThan(0.3)
  })
  it('every mark keeps a small chance (variety), and it always returns a mark', () => {
    const s = shares({ ...all(tally(40, 0)), segol: tally(40, 8) }, 8)
    for (const m of DUEL_MARKS) expect(s(m.id)).toBeGreaterThan(0.005)
    const rng = seeded(3)
    for (let i = 0; i < 50; i++) expect(DUEL_MARKS).toContain(pickTarget(rng, {}, {}))
  })
})

describe('directional confusion', () => {
  // the target sits near 1-in-5 and the rest are mastered, so it is picked most; only its rounds are examined
  const forced = (id: string) => ({
    recent: {},
    lifetime: { ...Object.fromEntries(DUEL_MARKS.map((m) => [m.id, { seen: 400, correct: 400 }])), [id]: { seen: 40, correct: 32, wrong: 8 } },
  })
  const pads = (wave: number, target: string, confusions: Record<string, Record<string, number>>, seed: number, n = 300) => {
    const rng = seeded(seed)
    return Array.from({ length: n }, (_, i) => makeRound({ id: i, wave, kills: 1, boss: false, rng, ...forced(target), confusions }))
      .filter((r) => r.target.id === target)
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
