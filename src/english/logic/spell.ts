// The English spell book's rounds (design Part 7): he hears a real word (never a heart word: spelling those is memory, not
// sound) and drops the tile of each sound unit into its box; a unit of two letters is one tile in one box. At most
// MAX_BOXES boxes. A picture at stages 1–3 for the asset plan's `S-pic` words whose file is there; none from stage 4 (he
// spells by ear alone). The wrong tiles are units he has learned that sound like no box before stage 9 (never `k` for
// "cat"); from stage 9 one other spelling of a box's sound may come (`ea` for `ee`), as a near miss: forgiven once.
// A silent-e word that ends in its e (cake, not cakes): the magic-e unit's box shows its vowel letter (`a`, says "ay"),
// and the closing `e` is printed, faint, and is not a box (the round's `tail`, as the Hebrew closing letter).
// From stage 4 he writes the word instead (`mode: 'write'`, one box per letter), when every letter of its boxes is one he
// has written alone on the drawing screen; a word with a letter he has not stays tiles. A written round has no tiles.
import type { RoundCtx } from '../../duel2/logic/rounds'
import type { SpellBox, SpellRound } from '../../duel2/policies/spell'
import { unit, type Unit } from '../content/units'
import { wordVoice } from '../content/voiceIds'
import { WORDS, type EnWord } from '../content/words'
import { pickWord } from './pick'
import { writtenAlone } from './draw'
import type { PictureOf } from './tower'
import { partOf, tilePool } from './rounds/cauldron'
import type { HasVoice } from './rounds/broom'

/** the most boxes a page holds (the gallery's long fixture checks that five fit) */
export const MAX_BOXES = 5
/** the most tiles under the book (the long fixture's row: 5 boxes and 2 wrong tiles) */
export const MAX_TILES = 7
/** wrong tiles, when the row has room */
const WRONG = 3
/** the last stage that shows the word's picture */
const PICTURE_UNTIL = 3
/** the stage from which he writes the word (design Part 7: no picture, then written) */
const WRITE_FROM = 4
/** the stage from which another spelling of a box's sound may come, as a near miss */
const NEAR_FROM = 9
/** of the rounds that can have one: the share with a near tile (my call) */
const NEAR_SHARE = 0.5

/** the file of a word's picture (none: no picture), and which voice files are there */
export interface SpellDeps { picture: PictureOf; voice?: HasVoice }

/**
 * a unit as a box or a tile: its letters (an ending without its hyphen; a magic e its vowel letter, `a` for a_e), its
 * sound, and the choice its answer counts on
 */
const boxOf = (u: Unit): SpellBox => {
  const p = partOf(u)
  const c = u.kind === 'magic-e' ? { ...p, text: u.text[0] } : p
  return { unit: u.id, text: c.text, soundId: c.soundId, choice: c }
}

/**
 * The words he can spell at `stage`: real words of his stages, MAX_BOXES units at most. A silent-e word only when it ends
 * in that e (its tail): cake, never cakes (the e inside the word would be no box and no tile).
 */
const spellWords = (stage: number) => WORDS.filter((w) => {
  if (w.kind !== 'real' || w.stage > stage || w.units.length < 2 || w.units.length > MAX_BOXES) return false
  const magic = w.units.filter((u) => unit(u).kind === 'magic-e').length
  return magic === 0 || (magic === 1 && w.text.endsWith('e'))
})

/** never `I` against `l` (they look the same in many fonts) */
const iAndL = (a: string, b: string) => (a.includes('I') && b.includes('l')) || (a.includes('l') && b.includes('I'))

function shuffle<T>(rng: () => number, xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * The spell book's round at his stage, or null when no word fits. The word is near the aim (its features on the spell
 * book); a word whose voice clip is there comes first.
 */
export function enSpellRound(ctx: RoundCtx, deps: SpellDeps): SpellRound | null {
  const { rng, stage } = ctx
  const all = spellWords(stage)
  if (!all.length) return null
  const voiced = deps.voice ? all.filter((w) => deps.voice!(wordVoice(w.text))) : all
  const w: EnWord = pickWord(ctx, voiced.length ? voiced : all, 'spell')
  const units = w.units.map(unit)
  const boxes = units.map(boxOf)
  // one tile for each unit (a repeated unit keeps its one tile)
  const own = boxes.filter((b, i) => boxes.findIndex((x) => x.unit === b.unit) === i)
  const tiles: SpellBox[] = [...own]
  const sounds = new Set(units.map((u) => u.sound))
  const fits = (u: Unit) => !tiles.some((t) => t.unit === u.id || t.text === boxOf(u).text || iAndL(t.text, boxOf(u).text))
  const pool = shuffle(rng, tilePool(stage, units))
  let near: Record<string, string> | undefined
  if (stage >= NEAR_FROM) {
    // another spelling of a box's sound (ea for ee): one, on NEAR_SHARE of the rounds that can have one; never a spelling
    // that cannot start a word (ck, ff) for the first box
    const boxOfSound = (t: Unit) => units.findIndex((u) => u.sound === t.sound)
    const pairs = pool.filter((t) => sounds.has(t.sound) && fits(t) && !(t.endOnly && boxOfSound(t) === 0))
    if (pairs.length && rng() < NEAR_SHARE) {
      const t = pairs[0]
      tiles.push(boxOf(t))
      near = { [t.id]: units[boxOfSound(t)].id }
    }
  }
  const wrong = Math.min(WRONG, MAX_TILES - tiles.length)
  // (the other wrong tiles never sound like a box)
  for (const t of pool) if (tiles.length - own.length < wrong + (near ? 1 : 0) && !sounds.has(t.sound) && fits(t)) tiles.push(boxOf(t))
  const file = stage <= PICTURE_UNTIL && w.picture && w.uses.includes('S-pic') ? deps.picture(w.picture) : undefined
  // (the letters of its boxes: a magic e's box is its vowel letter, the tail e is printed)
  const alone = stage >= WRITE_FROM ? writtenAlone(ctx.tallies) : new Set<string>()
  if (stage >= WRITE_FROM && boxes.every((b) => [...b.text].every((ch) => alone.has(ch)))) {
    return { word: w.id, wordVoice: wordVoice(w.text), boxes, tiles: [], mode: 'write', ...(units.some((u) => u.kind === 'magic-e') ? { tail: 'e' } : {}) }
  }
  return {
    word: w.id, wordVoice: wordVoice(w.text), boxes, tiles: shuffle(rng, tiles), mode: 'tiles',
    ...(units.some((u) => u.kind === 'magic-e') ? { tail: 'e' } : {}), ...(file ? { picture: file } : {}), ...(near ? { near } : {}),
  }
}
