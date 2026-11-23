// The English doors' rounds (design Part 5, "reading words"): a word on the door (`fish`), and he takes the key with its
// picture; from stage 4 about half the doors hold a phrase (`a big duck`) whose key shows its noun. The shared rules of
// every English screen's rounds.
import { describe, expect, it } from 'vitest'
import type { DoorKey, DoorRound } from '../../../spellquest/course/types'
import type { RoundCtx } from '../../../spellquest/logic/rounds'
import { seeded } from '../../../spellquest/testing/runHarness'
import { PHRASES } from '../../content/phrases'
import { WORDS, word } from '../../content/words'
import { wordPicture } from '../../assets/images'
import { PHRASE_SHARE, enDoorKeys, enDoorRounds, enDoorsPlayable } from './doors'

const ctxAt = (stage: number, seed = 1): RoundCtx => ({ rng: seeded(seed), stage, tallies: {}, recent: {}, confusions: { letters: {}, syllables: {} } })
/** every picture counts as there (its key is its file) */
const deps = { picture: (k: string) => k }

/** `n` visits of 6 doors at `stage`, each door with its keys */
function visits(stage: number, n = 150, d: { picture: (k: string) => string | undefined } = deps): { round: DoorRound; keys: DoorKey[] }[][] {
  const out: { round: DoorRound; keys: DoorKey[] }[][] = []
  for (let seed = 1; seed <= n; seed++) {
    const ctx = ctxAt(stage, seed)
    out.push(enDoorRounds(ctx, 6, d).map((round) => ({ round, keys: enDoorKeys(ctx, round, d) })))
  }
  return out
}
const doors = (stage: number, n?: number) => visits(stage, n).flat()
const isPhrase = (r: DoorRound) => r.plate.length > 1

describe('the English doors', () => {
  it('never a heart word alone on a door', () => {
    for (let stage = 1; stage <= 9; stage++) {
      for (const { round, keys } of doors(stage)) {
        if (round.plate.length === 1) {
          expect(word(round.plate[0].id).kind, round.id).toBe('real')
          expect(round.plate[0].heart).toBeUndefined()
        }
        // a heart word is never a key (it has no picture)
        for (const k of keys) expect(word(k.id).kind).toBe('real')
      }
    }
  }, 60_000)

  it('a phrase\'s wrong keys are not its noun', () => {
    let phrases = 0
    for (let stage = 4; stage <= 9; stage++) {
      for (const { round, keys } of doors(stage)) {
        if (!isPhrase(round)) continue
        phrases++
        const p = PHRASES.find((x) => x.id === round.id)!
        expect(round.key).toBe(p.noun)
        expect(round.plate.map((c) => c.text)).toEqual(p.words)
        expect(round.soundId).toBe(`ph-${p.id}`)
        const wrong = keys.filter((k) => k.id !== round.key)
        expect(wrong).toHaveLength(2)
        for (const k of wrong) {
          expect(p.words).not.toContain(k.id)
          // nor the same thing in another form (cats → cat, fishing → fish, boxes → box)
          const stem = (id: string) => word(id).units.filter((u) => !u.startsWith('-')).join(' ')
          expect(stem(k.id)).not.toBe(stem(p.noun))
        }
      }
    }
    expect(phrases).toBeGreaterThan(100)
  })

  it('stage 1 doors use stage-2 pictures as wrong keys', () => {
    const all = doors(1)
    const wrongStages = all.flatMap(({ round, keys }) => keys.filter((k) => k.id !== round.key).map((k) => word(k.id).stage))
    expect(wrongStages).toContain(2)
    expect(Math.max(...wrongStages)).toBe(2)
    // the door's own word is a stage-1 door word (map, fan)
    for (const { round } of all) expect(word(round.key).stage).toBe(1)
    // from stage 2 the wrong keys come from his opened stages only
    for (const stage of [2, 3, 5]) for (const { round, keys } of doors(stage, 60)) for (const k of keys) expect(word(k.id).stage, `${round.id} ${k.id}`).toBeLessThanOrEqual(stage)
  })

  it('single words at stages 1–3; from stage 4 about half the doors hold a phrase of his stages', () => {
    for (const stage of [1, 2, 3]) for (const { round } of doors(stage, 60)) expect(round.plate).toHaveLength(1)
    for (const stage of [4, 6, 9]) {
      const all = doors(stage)
      const share = all.filter((d) => isPhrase(d.round)).length / all.length
      expect(share).toBeGreaterThan(PHRASE_SHARE - 0.12)
      expect(share).toBeLessThan(PHRASE_SHARE + 0.12)
      for (const { round } of all.filter((d) => isPhrase(d.round))) expect(PHRASES.find((x) => x.id === round.id)!.stage).toBeLessThanOrEqual(stage)
    }
  })

  it('a door\'s word is a door word (D) of his stages, said by its own voice', () => {
    for (const stage of [1, 3, 5, 8]) {
      for (const { round } of doors(stage, 60)) {
        if (isPhrase(round)) continue
        const w = word(round.key)
        expect(w.uses).toContain('D')
        expect(w.stage).toBeLessThanOrEqual(stage)
        expect(round.id).toBe(w.id)
        expect(round.plate[0].soundId).toBe(`w-${w.id}`)
      }
    }
  })

  it('a visit never shows the same key word on two doors in a row', () => {
    for (const stage of [1, 4, 9]) {
      for (const v of visits(stage, 80)) {
        expect(v).toHaveLength(6)
        for (let i = 1; i < v.length; i++) expect(v[i].round.key, `stage ${stage}`).not.toBe(v[i - 1].round.key)
      }
    }
  })

  it('a visit plans each key word once while its words last, and picks near the aim', () => {
    // stage 3: 15 door words (identity files), 6 doors: no key twice
    for (const v of visits(3, 80)) expect(new Set(v.map((d) => d.round.key)).size).toBe(6)
    // stage 1 has two: they take turns
    for (const v of visits(1, 20)) expect(new Set(v.map((d) => d.round.key))).toEqual(new Set(['map', 'fan']))
    // near the aim (one mistake in five): fan's units known (the screen's own risk stays), map's all missed; with no
    // tallies about even
    const count = (tallies: RoundCtx['tallies']) => {
      let fan = 0
      for (let seed = 1; seed <= 200; seed++) if (enDoorRounds({ ...ctxAt(1, seed), tallies }, 1, deps)[0].key === 'fan') fan++
      return fan
    }
    const known = { seen: 40, wrong: 0 }
    const missed = { seen: 20, wrong: 20 }
    expect(count({ f: known, n: known, a: known, m: missed, p: missed })).toBeGreaterThan(150)
    const even = count({})
    expect(even).toBeGreaterThan(60)
    expect(even).toBeLessThan(140)
  })

  it('the shared rules: three keys with their pictures, the right one among them; every word shown is in WORDS', () => {
    for (let stage = 1; stage <= 9; stage++) {
      for (const { round, keys } of doors(stage, 60)) {
        expect(keys).toHaveLength(3)
        expect(keys.filter((k) => k.id === round.key)).toHaveLength(1)
        expect(new Set(keys.map((k) => k.id)).size).toBe(3)
        expect(new Set(keys.map((k) => k.picture)).size).toBe(3)
        for (const k of keys) expect(k.picture).toBe(word(k.id).picture)
        for (const c of round.plate) expect(WORDS.some((w) => w.id === c.id && w.text === c.text)).toBe(true)
        // a heart word never has a picture
        for (const c of round.plate) if (c.heart) expect(c.picture).toBeUndefined()
      }
    }
  })

  it('a word without a picture file is neither a key nor a door\'s word', () => {
    // the course's picture rule: the files of assets/images (pw-<word>, word-<word>, or a renamed Spell Quest picture)
    const d = { picture: wordPicture }
    for (const stage of [2, 4, 9]) {
      for (const { round, keys } of visits(stage, 40, d).flat()) {
        for (const k of keys) {
          expect(wordPicture(word(k.id).picture!)).toBeDefined()
          expect(k.picture).toBe(wordPicture(word(k.id).picture!))
        }
        expect(wordPicture(word(round.key).picture!)).toBeDefined()
      }
    }
    // with no file for map and fan (stage 1's door words), no door plays there (never a stage-2 word on a stage-1 plate)
    const noStage1 = { picture: (k: string) => (k === 'map' || k === 'fan' ? undefined : wordPicture(k)) }
    expect(enDoorsPlayable(1, noStage1)).toBe(false)
    expect(enDoorsPlayable(1, d)).toBe(true)
    expect(enDoorsPlayable(2, d)).toBe(true)
    expect(enDoorsPlayable(1, deps)).toBe(true)
    expect(() => enDoorRounds(ctxAt(1), 6, noStage1)).toThrow()
    for (const { round } of doors(1, 40)) expect(word(round.key).stage).toBe(1)
    // with no file for duck, no door asks it, and no key shows it
    const noDuck = { picture: (k: string) => (k === 'duck' ? undefined : k) }
    for (const { round, keys } of visits(4, 60, noDuck).flat()) {
      expect(round.key).not.toBe('duck')
      expect(keys.map((k) => k.id)).not.toContain('duck')
    }
  })
})
