// The Hebrew spell book's rounds (design Part 7, Hebrew): he hears a door word and drops the tile of each consonant-vowel
// syllable into its box (בַּ · יִ); the closing letter (ת) is printed, faint, and is not a box (the round's `tail`). The
// word's picture is on the page. The wrong tiles are syllables of opened items that differ in sound from every box and
// from each other: never a same-sound spelling (ת/ט, כּ/ק, ח/כ, ס/שׂ, א/ע, kamatz/patach), since by ear alone he cannot
// know which one a word uses. They are near the boxes first: a box's letter with another vowel, or another letter with a
// box's vowel (יָ, נִ for יִ). So there is no near tile. Mirrors the English one (src/english/logic/spell.ts).
import type { SpellBox, SpellRound } from '../policies/spell'
import { WORDS, type Word } from '../data/words'
import { syllable, syllablesOfStage, type Syllable } from './content'
import { features, pickTarget } from './predict'
import { sameSound, syllableChoice, type RoundCtx } from './rounds'

/** wrong tiles (the fixture's row: 2 boxes and 3 wrong tiles) */
const WRONG = 3
/** of the wrong tiles: this many near a box (its letter or its vowel), when there are */
const NEAR_BOX = 2

/** the file of a picture (none: no picture) */
export type PictureOf = (key: string) => string | undefined

const tileOf = (s: Syllable): SpellBox => {
  const choice = syllableChoice(s)
  return { unit: s.id, text: s.text, soundId: s.soundId, choice }
}

function shuffle<T>(rng: () => number, xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * The spell book's round at his stage, or null when no word fits (a door word stores its syllables). The word is near the
 * aim (its features on the spell book).
 */
export function heSpellRound(ctx: RoundCtx, picture: PictureOf = () => undefined): SpellRound | null {
  const { rng, stage } = ctx
  const pool = WORDS.filter((w) => w.door && w.syllables?.length)
  if (!pool.length) return null
  const w: Word = pickTarget(rng, pool, (x) => features({ wordId: x.id }, 'spell'), ctx.tallies, ctx.recent)
  const syls = w.syllables!.map((s) => syllable(s.item, s.mark))
  const boxes = syls.map(tileOf)
  // one tile for each syllable (a repeated one keeps its one tile)
  const tiles: SpellBox[] = boxes.filter((b, i) => boxes.findIndex((x) => x.unit === b.unit) === i)
  const own = tiles.length
  const fits = (s: Syllable) => !tiles.some((t) => t.unit === s.id || sameSound(t.choice!, syllableChoice(s)))
  const opened = shuffle(rng, syllablesOfStage(Math.min(4, Math.max(1, stage)) as 1 | 2 | 3 | 4))
  const nearBox = (s: Syllable) => syls.some((b) => b.item.id === s.item.id || b.mark.group === s.mark.group)
  for (const s of opened) if (tiles.length < own + NEAR_BOX && nearBox(s) && fits(s)) tiles.push(tileOf(s))
  for (const s of opened) if (tiles.length < own + WRONG && fits(s)) tiles.push(tileOf(s))
  const file = picture(w.picture)
  const tail = w.syllables![w.syllables!.length - 1].tail
  return {
    word: w.id, wordVoice: `w-${w.id}`, boxes, tiles: shuffle(rng, tiles), mode: 'tiles',
    ...(tail ? { tail } : {}), ...(file ? { picture: file } : {}),
  }
}
