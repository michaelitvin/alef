// The English ghosts (design Part 5, "look-alikes"): three ghosts hold signs; he hears a sound (or a word) and picks its
// ghost. A visit keeps one look-alike set: a set of asset plan 1.13 (`b d p`, `n u` at stage 2, `m w`, `h n` at stage 3;
// opened when all its letters are), or one of his own mix-ups (an item and what he tapped for it CONFUSION_GROUP_MIN
// times). A visit is of letters or of words by the stage (`enGhostVisitKind`): the word visits take the look-alike words
// (`top · pot`, `was · saw`), few at stage 2 and most from stage 5. A set of two gets a third ghost of another sound, and
// its target may come twice (else the answer would be "the other one"). Never `I` against `l`. The run keeps a visit's
// set by the signs of the round before (`prevSigns`), else by `avoid` (the sound of the target before).
import { pickTarget } from '../../../spellquest/logic/predict'
import { shuffle, CONFUSION_GROUP_MIN, type Choice, type Kind, type RoundCtx } from '../../../spellquest/logic/rounds'
import type { ScreenId } from '../../../spellquest/logic/predict'
import type { Highlight } from '../../../spellquest/viewTypes'
import { GHOST_WORD_SETS, LOOKALIKE_LETTERS } from '../../content/sets'
import { UNITS, unit } from '../../content/units'
import { letterName } from '../../content/voiceIds'
import { WORDS, word, type EnWord } from '../../content/words'
import { enFeatures, enPrior, pickUnit, unitChoice } from '../pick'
import { letterPool } from '../tower'
import { fits, wordChoice, type HasVoice } from './broom'

/** ghosts on the screen (as in Hebrew) */
const GHOSTS = 3
/** when a visit starts and he has mix-ups of his own: the share of visits that take one of them (my call) */
const OWN_SHARE = 0.5
/**
 * The share of word visits by stage (my call, as the broom's WORD_SHARE_BY_STAGE): the spec puts the look-alike words in
 * the later stages, and the letter sets are all open from stage 3, so from stage 5 most visits are words.
 */
export const GHOST_WORD_SHARE_BY_STAGE: Record<number, number> = { 1: 0, 2: 0.15, 3: 0.25, 4: 0.4, 5: 0.65, 6: 0.65, 7: 0.65, 8: 0.65, 9: 0.65 }

/** The kind of a ghosts visit (letters or words) by the stage's word share; other screens: unset (the run decides). */
export function enGhostVisitKind(screen: ScreenId, stage: number, rng: () => number): Kind | undefined {
  if (screen !== 'ghosts') return undefined
  return rng() < (GHOST_WORD_SHARE_BY_STAGE[stage] ?? 0) ? 'syllable' : 'letter'
}

const isLetters = (kind: Kind) => kind === 'letter'
const UNIT_IDS = new Set(UNITS.map((u) => u.id))
const WORD_IDS = new Set(WORDS.map((w) => w.id))
/** the words a ghost holds: real and heart words (he hears them; nonsense names and picture-only words stay out) */
const heard = (w: EnWord) => w.kind === 'real' || w.kind === 'heart'

/** is `id` an item of the kind he has opened at `stage` (a letter of the letter pool, or a heard word) */
function opened(kind: Kind, id: string, stage: number): boolean {
  if (isLetters(kind)) return UNIT_IDS.has(id) && letterPool(stage).some((u) => u.id === id)
  return WORD_IDS.has(id) && heard(word(id)) && word(id).stage <= stage
}

const choiceOf = (kind: Kind, id: string): Choice => (isLetters(kind) ? unitChoice(unit(id)) : wordChoice(word(id)))

/** The look-alike sets of the table open at `stage`: letters, or (any other kind) words; each opens when all its items are. */
export function ghostSets(stage: number, kind: Kind): string[][] {
  const sets = isLetters(kind) ? LOOKALIKE_LETTERS.map((s) => ({ stage: s.stage, ids: s.letters })) : GHOST_WORD_SETS.map((s) => ({ stage: s.stage, ids: s.words }))
  return sets.filter((s) => s.stage <= stage && s.ids.every((id) => opened(kind, id, stage))).map((s) => s.ids)
}

/** the members of `ids` in order that can stand together (other sounds, never I against l), at most GHOSTS */
function together(kind: Kind, ids: string[]): string[] {
  const out: Choice[] = []
  for (const id of ids) if (out.length < GHOSTS && fits(out, choiceOf(kind, id))) out.push(choiceOf(kind, id))
  return out.map((c) => c.id)
}

/** His own mix-ups as sets: an item he was asked and what he tapped for it CONFUSION_GROUP_MIN times or more, most first. */
function ownSets(ctx: RoundCtx, kind: Kind): string[][] {
  const out: string[][] = []
  const keys = new Set<string>()
  const table = ghostSets(ctx.stage, kind)
  for (const [asked, row] of Object.entries(ctx.confusions.letters)) {
    if (!opened(kind, asked, ctx.stage)) continue
    const partners = Object.entries(row)
      .filter(([id, n]) => id !== asked && n >= CONFUSION_GROUP_MIN && opened(kind, id, ctx.stage))
      .sort((a, b) => b[1] - a[1]).map(([id]) => id)
    const set = together(kind, [asked, ...partners])
    const key = [...set].sort().join()
    // a mix-up inside a set of the table is that set already
    const inTable = table.some((t) => set.every((id) => t.includes(id)))
    if (set.length >= 2 && !keys.has(key) && !inTable) { keys.add(key); out.push(set) }
  }
  return out
}

const pick = <T,>(rng: () => number, xs: T[]): T => xs[Math.floor(rng() * xs.length) % xs.length]

/**
 * The visit's set: the one the signs before showed (`prevSigns`; the largest, when sets overlap), else one that has the
 * target before (`avoid`), else a new one (his own on OWN_SHARE of the visits).
 */
/** the sets a visit can take at this stage: the table's and his own */
function setsOf(ctx: RoundCtx, kind: Kind): { table: string[][]; mine: string[][] } {
  return { table: ghostSets(ctx.stage, kind).map((s) => together(kind, s)).filter((s) => s.length >= 2), mine: ownSets(ctx, kind) }
}

function setOf(ctx: RoundCtx, kind: Kind, avoid: string | undefined, prevSigns: string[] | undefined): string[] | null {
  const { table, mine } = setsOf(ctx, kind)
  if (prevSigns?.length) {
    const shown = [...mine, ...table].filter((s) => s.every((id) => prevSigns.includes(id)))
    const most = Math.max(0, ...shown.map((s) => s.length))
    const kept = shown.filter((s) => s.length === most)
    if (kept.length) return pick(ctx.rng, kept)
  }
  const isAvoid = (id: string) => id === avoid || choiceOf(kind, id).soundId === avoid
  const going = avoid ? [...mine, ...table].filter((s) => s.some(isAvoid)) : []
  if (going.length) return pick(ctx.rng, going)
  if (mine.length && (!table.length || ctx.rng() < OWN_SHARE)) return pick(ctx.rng, mine)
  return table.length ? pick(ctx.rng, table) : null
}

/** the voiced ones of `xs`, when any is voiced (the build works with any clip missing) */
const voicedFirst = (xs: Choice[], voice: HasVoice): Choice[] => {
  const v = xs.filter((c) => voice(c.soundId))
  return v.length ? v : xs
}

/** the target among `cands`: near the aim, as the broom picks */
function pickChoice(ctx: RoundCtx, kind: Kind, cands: Choice[]): Choice {
  const screen: ScreenId = 'ghosts'
  if (isLetters(kind)) return unitChoice(pickUnit(ctx, cands.map((c) => unit(c.id)), screen))
  return pickTarget(ctx.rng, cands, (c) => enFeatures(c, screen), ctx.tallies, ctx.recent, enPrior)
}

/** the other items of the kind he has opened, for a third ghost (words: about as long as the target) */
function others(ctx: RoundCtx, kind: Kind, target?: Choice): Choice[] {
  if (isLetters(kind)) return shuffle(ctx.rng, letterPool(ctx.stage).map(unitChoice))
  const pool = WORDS.filter((w) => heard(w) && w.stage <= ctx.stage)
  const near = target ? pool.filter((w) => Math.abs(w.text.length - target.text.length) <= 1) : []
  return [...shuffle(ctx.rng, near), ...shuffle(ctx.rng, pool)].map(wordChoice)
}

/**
 * One round of the ghosts: the visit's look-alike set (see the top of the file) on three ghosts, one of them asked; a set
 * of two gets a third ghost of another sound. `avoid`: the sound of the target before; `prevSigns`: the ids of the signs
 * before (the visit's set).
 */
export function enGhostRound(ctx: RoundCtx, kind: Kind, avoid?: string, prevSigns?: string[], voice: HasVoice = () => true): { target: Choice; signs: Choice[] } {
  const set = setOf(ctx, kind, avoid, prevSigns)?.map((id) => choiceOf(kind, id))
  // no set open (not on the path: the ghosts open with the first sets): any opened item
  const members = set ?? others(ctx, kind).slice(0, GHOSTS)
  // a pair may ask the same twice: the third ghost is never asked, so "not the one before" would give the answer away
  const fresh = members.length <= 2 ? members : members.filter((c) => c.id !== avoid && c.soundId !== avoid)
  const target = pickChoice(ctx, kind, voicedFirst(fresh.length ? fresh : members, voice))
  const signs = [target]
  for (const c of shuffle(ctx.rng, members)) if (signs.length < GHOSTS && fits(signs, c)) signs.push(c)
  // a third ghost never makes another set with the signs (the next round could not tell which set the visit has)
  const { table, mine } = setsOf(ctx, kind)
  const other = [...table, ...mine].filter((x) => !set || x.some((id) => !set.some((c) => c.id === id)))
  const makesSet = (c: Choice) => other.some((x) => x.includes(c.id) && x.every((id) => id === c.id || signs.some((g) => g.id === id)))
  for (const c of others(ctx, kind, target)) if (signs.length < GHOSTS && fits(signs, c) && !makesSet(c)) signs.push(c)
  return { target, signs: shuffle(ctx.rng, signs) }
}

/** a part of the look-alike explanation: a line of the course (by its id) or a voice id */
export type GhostExplainPart = ({ line: string } | { id: string }) & { highlight: Highlight }

/**
 * The look-alike explanation after a mistake on the ghosts: "This is the letter:" (`explain-letter`), the letter's name
 * (`ln-b`), then its sound. Only the letters of a look-alike set have a name to say; `feature` is what his recent
 * mistakes on it are counted by. Null when there is nothing to explain.
 */
export function enGhostExplanation(c: Choice, screen: ScreenId): { feature: string; parts: GhostExplainPart[] } | null {
  if (screen !== 'ghosts' || c.kind !== 'unit' || !LOOKALIKE_LETTERS.some((s) => s.letters.includes(c.id))) return null
  return {
    feature: c.id,
    parts: [{ line: 'explain-letter', highlight: 'none' }, { id: letterName(c.id), highlight: 'letter' }, { id: c.soundId, highlight: 'all' }],
  }
}
