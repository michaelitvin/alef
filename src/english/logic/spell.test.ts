// The English spell book's rounds (design Part 7): he hears a real word and builds it, one tile in each box (at most 5).
// A picture at stages 1–3 (`S-pic`, its file only), none from stage 4; the wrong tiles are units he has learned and never
// another spelling of a box's sound before stage 9; from stage 9 that other spelling may come, as a near miss.
import { describe, expect, it } from 'vitest'
import type { SpellRound } from '../../duel2/policies/spell'
import type { RoundCtx } from '../../duel2/logic/rounds'
import { seeded } from '../../duel2/testing/runHarness'
import { unit } from '../content/units'
import { word } from '../content/words'
import { enLine } from '../data/lines'
import { MAX_BOXES, MAX_TILES, enSpellRound, type SpellDeps } from './spell'

const ctxAt = (stage: number, seed: number): RoundCtx => ({ rng: seeded(seed), stage, tallies: {}, recent: {}, confusions: { letters: {}, syllables: {} } })
/** every picture key counts as having its file */
const allFiles: SpellDeps = { picture: (key) => `file:${key}` }
const noFiles: SpellDeps = { picture: () => undefined }

function rounds(stage: number, n = 150, deps: SpellDeps = allFiles): SpellRound[] {
  const out: SpellRound[] = []
  for (let seed = 1; seed <= n; seed++) {
    const r = enSpellRound(ctxAt(stage, seed), deps)
    if (r) out.push(r)
  }
  return out
}
const STAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const soundOf = (id: string) => unit(id).sound
/** the tiles that are no box's unit */
const wrongTiles = (r: SpellRound) => r.tiles.filter((t) => !r.boxes.some((b) => b.unit === t.unit))

describe('the English spell book', () => {
  it('cat never offers k', () => {
    const cats = STAGES.slice(1, 8).flatMap((s) => rounds(s, 300)).filter((r) => r.word === 'cat')
    expect(cats.length).toBeGreaterThan(0)
    for (const r of cats) {
      expect(r.boxes.map((b) => b.unit)).toEqual(['c', 'a', 't'])
      expect(r.tiles.map((t) => t.unit)).not.toContain('k')
      expect(r.tiles.map((t) => t.unit)).not.toContain('ck')
      expect(r.near).toBeUndefined()
    }
    // before stage 9 no wrong tile sounds like any box
    for (const s of STAGES.slice(0, 8)) {
      for (const r of rounds(s)) {
        const sounds = r.boxes.map((b) => soundOf(b.unit))
        for (const t of wrongTiles(r)) expect(sounds).not.toContain(soundOf(t.unit))
        expect(r.near).toBeUndefined()
      }
    }
  })

  it('stage 9 may offer ea for ee, as a near miss', () => {
    const all = rounds(9, 600)
    const ee = all.filter((r) => r.boxes.some((b) => b.unit === 'ee') && r.tiles.some((t) => t.unit === 'ea'))
    expect(ee.length).toBeGreaterThan(0)
    for (const r of ee) expect(r.near).toEqual({ ea: 'ee' })
    // every near tile sounds like the box it is near to, is no box itself, and is one tile; the other wrong tiles never do
    for (const r of all) {
      for (const [tile, box] of Object.entries(r.near ?? {})) {
        expect(soundOf(tile)).toBe(soundOf(box))
        expect(r.boxes.map((b) => b.unit)).toContain(box)
        expect(r.boxes.map((b) => b.unit)).not.toContain(tile)
        expect(r.tiles.filter((t) => t.unit === tile)).toHaveLength(1)
      }
      const sounds = r.boxes.map((b) => soundOf(b.unit))
      for (const t of wrongTiles(r).filter((x) => !r.near?.[x.unit])) expect(sounds).not.toContain(soundOf(t.unit))
    }
  })

  it('no heart word', () => {
    for (const s of STAGES) {
      const rs = rounds(s)
      expect(rs.length).toBeGreaterThan(0)
      for (const r of rs) {
        const w = word(r.word)
        expect(w.kind).toBe('real')
        expect(w.stage).toBeLessThanOrEqual(s)
        expect(r.wordVoice).toBe(`w-${w.text}`)
        // one box per unit, at most 5; a two-letter unit is one box; an ending shows without its hyphen
        expect(r.boxes.map((b) => b.unit)).toEqual(w.units)
        expect(r.boxes.length).toBeLessThanOrEqual(MAX_BOXES)
        for (const b of r.boxes) {
          expect(b.text).toBe(unit(b.unit).text.replace(/^-/, ''))
          expect(b.soundId).toBe(`snd-${soundOf(b.unit)}`)
          expect(b.choice).toMatchObject({ kind: 'unit', id: b.unit })
        }
        // every box's tile is there once, every tile is a unit he has learned, and the tiles fit their row
        for (const b of r.boxes) expect(r.tiles.filter((t) => t.unit === b.unit)).toHaveLength(1)
        for (const t of r.tiles) expect(unit(t.unit).stage).toBeLessThanOrEqual(s)
        expect(new Set(r.tiles.map((t) => t.text)).size).toBe(r.tiles.length)
        expect(r.tiles.length).toBeLessThanOrEqual(MAX_TILES)
        expect(wrongTiles(r).length).toBeGreaterThanOrEqual(2)
        expect(r.mode).toBe('tiles')
      }
    }
  })

  it('stage 4 has no picture', () => {
    for (const s of [4, 5, 6, 7, 8, 9]) for (const r of rounds(s)) expect(r.picture).toBeUndefined()
    // stages 1–3: an `S-pic` word shows its file; a word without that use, or without its file, has none
    const early = [1, 2, 3].flatMap((s) => rounds(s, 400))
    const pictured = early.filter((r) => r.picture)
    expect(pictured.length).toBeGreaterThan(0)
    for (const r of early) {
      const w = word(r.word)
      expect(r.picture).toBe(w.uses.includes('S-pic') && w.picture ? `file:${w.picture}` : undefined)
    }
    for (const r of [1, 2, 3].flatMap((s) => rounds(s, 100, noFiles))) expect(r.picture).toBeUndefined()
  })

  it('a word with a voice clip comes first, when any has one', () => {
    const voiced: SpellDeps = { ...allFiles, voice: (id) => id === 'w-cat' || id === 'w-dog' }
    const words = new Set(rounds(3, 200, voiced).map((r) => r.word))
    expect([...words].sort()).toEqual(['cat', 'dog'])
  })

  it('the run\'s spell lines are English lines', () => {
    expect(enLine('demo-spell')?.variations).toBe(1)
    expect(enLine('spell-near')?.variations).toBe(1)
    expect(enLine('q-spell')?.variations).toBe(3)
    for (const id of ['demo-spell', 'spell-near', 'q-spell']) for (const t of enLine(id)!.en) expect(t).not.toContain('!')
  })
})
