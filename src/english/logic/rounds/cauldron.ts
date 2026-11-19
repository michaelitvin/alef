// The English cauldron (design Part 5, "the missing sound"): he hears a word (`cat`), sees it with one empty box (`c_t`)
// and puts the missing unit in, among 3 wrong tiles. From stage 4 the missing part is often a pair (`_ip` → sh, ch, th),
// one box for its two letters. From stage 6 some rounds throw an `e` in after a short word (asset plan `C6`: kit → kite):
// the word turns, and its picture comes or changes where the words have one (cap → cape has none: word only).
import type { CauldronRound } from '../../../duel2/course/types'
import { pickTarget } from '../../../duel2/logic/predict'
import type { Choice, RoundCtx } from '../../../duel2/logic/rounds'
import { NEW_SHARE } from '../../../duel2/logic/stages'
import { UNITS, unit, type Unit } from '../../content/units'
import { WORDS, type EnWord } from '../../content/words'
import { enFeatures, enPrior, unitChoice } from '../pick'
import { letterPool, type PictureOf } from '../tower'
import { wordChoice, type HasVoice } from './broom'

/** the tiles of a round: the right one and 3 wrong ones */
const TILES = 4
/**
 * the share of rounds whose missing part is a pair of letters (`_ip`), by stage (my call): from stage 4, where the
 * pairs come, through stage 5; then it tapers, as the silent e and the endings take the rounds
 */
export const PAIR_SHARE: Record<number, number> = { 4: 0.4, 5: 0.4, 6: 0.25, 7: 0.2, 8: 0.15, 9: 0.15 }
/** the share of `e` throws (C6 pairs) by stage, my call: often on the stage that brings the silent e, rarely after */
const THROW_SHARE = (stage: number) => (stage === 6 ? 0.4 : stage > 6 ? 0.15 : 0)
/** a mix-up he made this often comes onto the tiles (as on the tower and the broom) */
const CONFUSION_MIN = 2

/** the file of a word's picture (none: no picture), and which voice files are there */
export interface CauldronDeps { picture: PictureOf; voice?: HasVoice }

/** a pair of letters that makes one sound (sh, ch, th, ck, ff…): one box, one tile */
const isPair = (u: Unit) => (u.kind === 'digraph' || u.kind === 'double') && u.text.length === 2
/** what a tile is like: wrong tiles of the right one's class come first */
export const classOf = (u: Unit) => (u.kind === 'vowel' ? 'vowel' : u.kind === 'consonant' ? 'letter' : isPair(u) ? 'pair' : u.kind)

/** a unit as a box or tile: its letters (an ending without its hyphen: `jump` + `ing`) */
export const partOf = (u: Unit): Choice => ({ ...unitChoice(u), text: u.text.replace(/^-/, '') })

/** the tiles that can be wrong next to `rights`: opened letters, pairs and teams (and the opened endings when one is an ending) */
export function tilePool(stage: number, rights: Unit[]): Unit[] {
  const endings = rights.some((u) => u.kind === 'ending') ? UNITS.filter((u) => u.kind === 'ending' && u.stage <= stage && !u.secondOf) : []
  return [...letterPool(stage), ...endings]
}

/** never `I` against `l` (they look the same in many fonts) */
const iAndL = (a: string, b: string) => (a.includes('I') && b.includes('l')) || (a.includes('l') && b.includes('I'))
/** two tiles may not sound alike or look alike */
const fits = (out: Choice[], c: Choice) => !out.some((o) => o.id === c.id || o.soundId === c.soundId || o.text === c.text || iAndL(o.text, c.text))

function shuffle<T>(rng: () => number, xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** the item he taps most often when `id` is asked, if he did it CONFUSION_MIN times */
function partnerOf(ctx: RoundCtx, id: string): string | null {
  let best: [string, number] | null = null
  for (const [k, n] of Object.entries(ctx.confusions.letters[id] ?? {})) if (k !== id && n >= CONFUSION_MIN && (!best || n > best[1])) best = [k, n]
  return best?.[0] ?? null
}

/** the right tile and `n - 1` wrong ones (his mix-up first, then tiles of its class, then any), shuffled */
export function tilesFor(ctx: RoundCtx, right: Choice, pool: Unit[], cls: string, n = TILES): Choice[] {
  const partner = partnerOf(ctx, right.id)
  const p = pool.filter((u) => u.id === partner)
  const same = shuffle(ctx.rng, pool.filter((u) => classOf(u) === cls))
  const ordered = [...p, ...same, ...shuffle(ctx.rng, pool)].map(partOf)
  const out = [right]
  for (const c of ordered) if (out.length < n && fits(out, c)) out.push(c)
  return shuffle(ctx.rng, out)
}

/** the voiced ones of `xs`, when any is voiced (the build works with any clip missing) */
const voicedFirst = (xs: EnWord[], voice: HasVoice | undefined): EnWord[] => {
  const v = voice ? xs.filter((w) => voice(wordChoice(w).soundId)) : xs
  return v.length ? v : xs
}

/** a word near the aim; the stage's own words on NEW_SHARE of the picks */
function pickWord(ctx: RoundCtx, pool: EnWord[], features: (w: EnWord) => string[]): EnWord {
  const fresh = pool.filter((w) => w.stage === ctx.stage)
  const cands = fresh.length && fresh.length < pool.length && ctx.rng() < NEW_SHARE ? fresh : pool
  return pickTarget(ctx.rng, cands, features, ctx.tallies, ctx.recent, enPrior)
}

/** a word as the round shows it: with its picture's file when it has one */
function shown(w: EnWord, deps: CauldronDeps): Choice {
  const file = w.picture ? deps.picture(w.picture) : undefined
  return { ...wordChoice(w), ...(file ? { picture: file } : {}) }
}

/** the decodable words of the boxes: three units or more, no silent e (it comes in the throws) */
const boxWords = (stage: number) => WORDS.filter((w) => w.kind === 'real' && w.stage <= stage && w.units.length >= 3 && !w.units.some((u) => unit(u).kind === 'magic-e'))

/** the C6 pairs open at `stage`: the short word and the word its thrown `e` makes (tap → tape, kit → kite) */
const throwPairs = (stage: number): { short: EnWord; long: EnWord }[] =>
  WORDS.filter((w) => w.kind === 'real' && w.stage <= stage && w.uses.includes('C6') && w.units.some((u) => unit(u).kind === 'magic-e'))
    .map((long) => ({ long, short: WORDS.find((x) => x.kind === 'real' && x.text === long.text.slice(0, -1)) }))
    .filter((p): p is { short: EnWord; long: EnWord } => !!p.short)

/** a thrown `e`: he hears the long word and sees the short one with an empty box after it */
function throwRound(ctx: RoundCtx, avoid: string | undefined, deps: CauldronDeps): CauldronRound | null {
  const pairs = throwPairs(ctx.stage).filter((p) => wordChoice(p.long).soundId !== avoid)
  if (!pairs.length) return null
  const longs = voicedFirst(pairs.map((p) => p.long), deps.voice)
  const long = pickWord(ctx, longs, (w) => enFeatures(wordChoice(w), 'cauldron'))
  const short = pairs.find((p) => p.long === long)!.short
  // the e counts for the silent e it makes (cap → cape: a_e); it is shown as the letter he throws
  const silent = unit(long.units.find((u) => unit(u).kind === 'magic-e')!)
  const e: Choice = { ...unitChoice(silent), text: 'e' }
  // the wrong tiles: single letters he knows (any other e is left out by its look)
  const pool = letterPool(ctx.stage).filter((u) => u.kind === 'vowel' || u.kind === 'consonant')
  const boxes = [...short.units.map((u) => partOf(unit(u))), e]
  // (always the e in the last box: he can give it without listening, so it never counts towards the stage)
  return { target: shown(short, deps), boxes, gap: boxes.length - 1, orbs: tilesFor(ctx, e, pool, 'letter'), becomes: shown(long, deps), noStage: true }
}

/**
 * The cauldron's round at his stage: a word he hears, its parts with one empty box, and 4 tiles. `avoid`: the sound
 * heard the round before (never the same word twice in a row). From stage 4, a pair of letters is missing on
 * PAIR_SHARE of the rounds (by stage); from stage 6, THROW_SHARE of them throw an `e` in.
 */
export function enCauldronRound(ctx: RoundCtx, avoid: string | undefined, deps: CauldronDeps): CauldronRound {
  const { rng, stage } = ctx
  if (rng() < THROW_SHARE(stage)) {
    const r = throwRound(ctx, avoid, deps)
    if (r) return r
  }
  const all = boxWords(stage).filter((w) => wordChoice(w).soundId !== avoid)
  const withPair = all.filter((w) => w.units.some((u) => isPair(unit(u))))
  const pair = stage >= 4 && withPair.length > 0 && rng() < (PAIR_SHARE[stage] ?? 0)
  const pool = voicedFirst(pair ? withPair : all, deps.voice)
  const w = pickWord(ctx, pool, (x) => enFeatures(wordChoice(x), 'cauldron'))
  const units = w.units.map(unit)
  // the missing part: the pair, or the unit nearest the aim (his weak units come more often)
  const places = units.map((_, i) => i).filter((i) => !pair || isPair(units[i]))
  const gap = pickTarget(rng, places, (i) => enFeatures(unitChoice(units[i]), 'cauldron'), ctx.tallies, ctx.recent, enPrior)
  const boxes = units.map(partOf)
  // (no picture: he makes the word by ear; a picture comes only with a thrown e)
  return { target: wordChoice(w), boxes, gap, orbs: tilesFor(ctx, boxes[gap], tilePool(stage, [units[gap]]), classOf(units[gap])) }
}
