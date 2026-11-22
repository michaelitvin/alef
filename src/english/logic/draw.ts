// The English drawing's rounds (design Part 6): he hears a word and its first sound ("dog." then the unit's own sound
// take, never the letter's name) and writes that letter on the four lines. The stage decides which letters are open; the
// hand order (how the hand starts: like c, a line down, down and over) decides which open letter comes first: the first
// one he has not written alone yet is the new one, and it opens the next only once he has. From stage 2, sometimes the
// whole three-letter word, in three boxes, only with letters he has written alone. After stage 3, sometimes the capital
// of a letter he knows. His answer counts on the letter's unit (one letter) or on the word (a whole word). q is never
// alone: its unit qu is one round in two boxes (q, u). x starts no word: he writes it as the last letter of a word
// that ends in it (fox), the rest of the word before its box.
import type { DrawCtx, DrawItem } from '../../spellquest/course/types'
import type { Tally } from '../../shared/adaptive'
import { drawFeature } from '../../spellquest/logic/draw'
import { pickTarget } from '../../spellquest/logic/predict'
import { NEW_SHARE } from '../../spellquest/logic/stages'
import { UNITS, type Unit } from '../content/units'
import { soundVoice, wordVoice } from '../content/voiceIds'
import { WORDS, type EnWord } from '../content/words'
import { enFeatures, enPrior, unitChoice } from './pick'
import { wordChoice, type HasVoice } from './rounds/broom'
import type { PictureOf } from './tower'

/** the order of the letters by how the hand starts them: c a d g o q (like c), b h k l t and f i j (a line down), m n r p u (down and over), then the rest */
export const HAND_ORDER = ['c', 'a', 'd', 'g', 'o', 'q', 'b', 'h', 'k', 'l', 't', 'f', 'i', 'j', 'm', 'n', 'r', 'p', 'u', 'e', 's', 'v', 'w', 'x', 'y', 'z']

/** the rounds of a visit (the English visit's five) */
const DRAW_ROUNDS = 5
/** whole words from this stage, on this share of the rounds that can have one (my call) */
const WORD_FROM = 2
const WORD_SHARE = 0.3
/** capitals after stage 3, on this share of the rounds of a letter he knows (my call) */
const CAPITAL_FROM = 4
const CAPITAL_SHARE = 0.3

/** the file of a word's picture (none: no picture), and which voice files are there */
export interface DrawDeps { picture: PictureOf; voice?: HasVoice }

/** the sound unit a letter starts (q: qu) */
const unitOfLetter = (l: string): Unit | undefined => UNITS.find((u) => u.id === (l === 'q' ? 'qu' : l))

/**
 * the real words he hears for a letter: they start with its unit (a unit that never starts a word, x: they end in it);
 * his stages' first (else any stage's)
 */
function startWords(l: string, stage: number): EnWord[] {
  const u = unitOfLetter(l)
  if (!u) return []
  const all = WORDS.filter((w) => w.kind === 'real' && (u.endOnly ? w.units[w.units.length - 1] === u.id : w.units[0] === u.id))
  const his = all.filter((w) => w.stage <= stage)
  return his.length ? his : all
}

/** the letters he has written alone (lowercase and capitals): a drawing of the letter right, with no help */
export function writtenAlone(tallies: Record<string, Tally>): Set<string> {
  const out = new Set<string>()
  for (const [f, t] of Object.entries(tallies)) {
    const m = /^dr:([A-Za-z]):print$/.exec(f)
    if (m && (t.seen ?? 0) - (t.wrong ?? 0) - (t.helped ?? 0) > 0) out.add(m[1])
  }
  return out
}

/**
 * The letters open at `stage`, in hand order: those he has written alone (`known`), and the first one he has not (`next`,
 * the new one).
 */
export function openLetters(stage: number, tallies: Record<string, Tally>): { known: string[]; next?: string } {
  const alone = writtenAlone(tallies)
  const open = HAND_ORDER.filter((l) => (unitOfLetter(l)?.stage ?? Infinity) <= stage && startWords(l, stage).length > 0)
  return { known: open.filter((l) => alone.has(l)), next: open.find((l) => !alone.has(l)) }
}

/** the three-letter words he can write whole: real words of his stages, one letter per unit, every letter written alone */
const wholeWords = (stage: number, alone: Set<string>) => WORDS.filter((w) =>
  w.kind === 'real' && w.stage <= stage && w.text.length === 3 && w.units.length === 3 && w.units.every((u) => u.length === 1)
  && [...w.text].every((ch) => alone.has(ch)))

const pictureOf = (w: EnWord, deps: DrawDeps) => (w.picture ? deps.picture(w.picture) : undefined)

/** of `pool`, the words whose voice clip is there (none: all of them), not yet in this visit when possible */
function candidates(pool: EnWord[], used: Set<string>, deps: DrawDeps): EnWord[] {
  const voiced = deps.voice ? pool.filter((w) => deps.voice!(wordVoice(w.text))) : pool
  const from = voiced.length ? voiced : pool
  const unused = from.filter((w) => !used.has(w.id))
  return unused.length ? unused : from
}

/**
 * one letter: the first letter of a heard word (a capital: its big letter), and the word's first sound. q: its unit's
 * two letters, q and u. x: the last letter of a word that ends in it, and its sound (never a capital)
 */
function letterItem(ctx: DrawCtx, l: string, capital: boolean, used: Set<string>, deps: DrawDeps): DrawItem {
  const u = unitOfLetter(l)!
  const from = candidates(startWords(l, ctx.stage), used, deps)
  const w = from[Math.floor(ctx.rng() * from.length)]
  const file = pictureOf(w, deps)
  const own = { id: w.id, voice: wordVoice(w.text), firstSound: soundVoice(u), alphabet: 'latin' as const, asked: unitChoice(u), ...(file ? { picture: file } : {}) }
  if (u.endOnly) return { ...own, letters: [l], text: w.text, at: w.text.length - 1 }
  const first = capital ? l.toUpperCase() : l
  const letters = l === 'q' ? [first, 'u'] : [first]
  return { ...own, letters, text: first + w.text.slice(1) }
}

/** the whole word, a box for each letter */
function wordItem(ctx: DrawCtx, pool: EnWord[], used: Set<string>, deps: DrawDeps): DrawItem {
  const from = candidates(pool, used, deps)
  const w = pickTarget(ctx.rng, from, (x) => enFeatures(wordChoice(x), 'draw'), ctx.tallies, ctx.recent, enPrior)
  const file = pictureOf(w, deps)
  return { id: w.id, letters: [...w.text], voice: wordVoice(w.text), alphabet: 'latin', asked: wordChoice(w), text: w.text, ...(file ? { picture: file } : {}) }
}

/**
 * The rounds of a visit. The new letter comes first and on NEW_SHARE of the rest; the letters he knows are picked near the
 * one-mistake-in-five aim (their drawing and their unit). From stage 2 a whole word on WORD_SHARE of the rounds (not the
 * new letter's first round); after stage 3 a capital on CAPITAL_SHARE of the rounds of a letter he knows.
 */
export function enDrawWords(ctx: DrawCtx, n = DRAW_ROUNDS, deps: DrawDeps): DrawItem[] {
  const { known, next } = openLetters(ctx.stage, ctx.tallies)
  if (!next && !known.length) throw new Error(`no letter to write at stage ${ctx.stage}`)
  const wholes = ctx.stage >= WORD_FROM ? wholeWords(ctx.stage, writtenAlone(ctx.tallies)) : []
  const used = new Set<string>()
  const out: DrawItem[] = []
  for (let i = 0; i < n; i++) {
    let item: DrawItem
    if (wholes.length && !(i === 0 && next) && ctx.rng() < WORD_SHARE) item = wordItem(ctx, wholes, used, deps)
    else {
      const fresh = !!next && (i === 0 || !known.length || ctx.rng() < NEW_SHARE)
      const l = fresh ? next! : pickTarget(ctx.rng, known, (x) => [drawFeature(x, 'print'), unitOfLetter(x)!.id, 'sc:draw'], ctx.tallies, ctx.recent, enPrior)
      const capital = !fresh && ctx.stage >= CAPITAL_FROM && !unitOfLetter(l)!.endOnly && ctx.rng() < CAPITAL_SHARE
      item = letterItem(ctx, l, capital, used, deps)
    }
    used.add(item.id)
    out.push(item)
  }
  return out
}
