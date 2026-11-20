// The English broom flight (design Part 5, "sounds by ear"): early, he hears a unit's sound ("mmm") and flies into its
// letter; later, he hears a word and catches it among words that differ from it in one unit (`ship · chip · shop`), and
// a heart word among heart or decodable words. The course ignores the run's `kind` (letters or syllables, a Hebrew
// choice): the stage decides. No orb carries a picture: he finds the word by its letters, not by a picture.
import type { ScreenId } from '../../../duel2/logic/predict'
import { shuffle, type Choice, type Kind, type RoundCtx } from '../../../duel2/logic/rounds'
import { unit } from '../../content/units'
import { heartVoice, wordVoice } from '../../content/voiceIds'
import { WORDS, word, type EnWord } from '../../content/words'
import { pickUnit, pickWord, unitChoice } from '../pick'
import { letterPool } from '../tower'

/** which voice files are there (a target is heard: one whose clip is there is chosen first) */
export type HasVoice = (id: string) => boolean
const ALL_VOICED: HasVoice = () => true

/** orbs in a wave (as in Hebrew) */
const ORBS = 3
/**
 * The share of word targets by stage (my call): none at stage 1 (sounds only), then growing. Stages 5–7 bring no new
 * letter unit (blends, silent e, endings are read inside words), so their flights are mostly words.
 */
const WORD_SHARE_BY_STAGE: Record<number, number> = { 1: 0, 2: 0.3, 3: 0.4, 4: 0.5, 5: 0.85, 6: 0.85, 7: 0.85, 8: 0.6, 9: 0.6 }
/** of the word targets: the share that are heart words (there are only two to four per stage; my call) */
const HEART_SHARE = 0.25
/** a mix-up he made this often comes into the wave (as on the tower) */
const CONFUSION_MIN = 2
/** words that sound the same and are spelled apart: never in one hearing wave */
const HOMOPHONE: Record<string, string> = { for: 'four' }

const voiceOf = (w: EnWord) => (w.kind === 'heart' ? heartVoice(w.text) : wordVoice(w.text))

/** a word as a choice: he hears its voice (`soundId`); its id is the word's */
export const wordChoice = (w: EnWord): Choice => ({
  kind: 'word', id: w.id, text: w.text, soundId: voiceOf(w), itemId: w.id, units: w.units, ...(w.kind === 'heart' ? { heart: true as const } : {}),
})

/** the decodable words he can hear and read at `stage` (real words; picture-only words and nonsense names are not heard here) */
const realPool = (stage: number) => WORDS.filter((w) => w.kind === 'real' && w.stage <= stage)
const heartPool = (stage: number) => WORDS.filter((w) => w.kind === 'heart' && w.stage <= stage)

/** the words of `pool` that differ from `w` in exactly one unit, at the same place (`ship` → `chip`, `shop`) */
export function oneUnitApart(w: EnWord, pool: EnWord[]): EnWord[] {
  return pool.filter((x) => x.text !== w.text && x.units.length === w.units.length && x.units.filter((u, i) => u !== w.units[i]).length === 1)
}

/** b is a with one unit added or dropped (`cat · cats`): the second choice when one-unit swaps run short */
function addOrDrop(a: string[], b: string[]): boolean {
  const [long, short] = a.length > b.length ? [a, b] : [b, a]
  if (long.length !== short.length + 1) return false
  return long.some((_, i) => long.filter((_, j) => j !== i).every((x, j) => x === short[j]))
}


/** what he hears: two choices that sound alike may not meet in a wave */
const heardAs = (c: Choice) => (c.kind === 'word' ? `w:${HOMOPHONE[c.text] ?? c.text}` : c.soundId)
/** never `I` against `l` (they look the same in many fonts) */
const iAndL = (a: string, b: string) => (a.includes('I') && b.includes('l')) || (a.includes('l') && b.includes('I'))
/** `c` may join `out`: another item and another sound, never I against l */
export const fits = (out: Choice[], c: Choice) => !out.some((o) => o.id === c.id || heardAs(o) === heardAs(c) || iAndL(o.text, c.text))

/** the target and others in order, as long as each fits (another sound, never I against l), up to ORBS */
function fill(target: Choice, ordered: Choice[]): Choice[] {
  const out = [target]
  for (const c of ordered) if (out.length < ORBS && fits(out, c)) out.push(c)
  return out
}

/** the item he taps most often when `id` is asked, if he did it CONFUSION_MIN times */
function partnerOf(ctx: RoundCtx, id: string): string | null {
  let best: [string, number] | null = null
  for (const [k, n] of Object.entries(ctx.confusions.letters[id] ?? {})) if (k !== id && n >= CONFUSION_MIN && (!best || n > best[1])) best = [k, n]
  return best?.[0] ?? null
}

/** the voiced ones of `xs`, when any is voiced (the build works with any clip missing) */
const voicedFirst = <T,>(xs: T[], id: (x: T) => string, voice: HasVoice): T[] => {
  const v = xs.filter((x) => voice(id(x)))
  return v.length ? v : xs
}

/** the decodable words of a stage that have a wave of one-unit neighbours (by stage: the lists never change) */
const WAVED = new Map<number, Set<string>>()
function wavedAt(stage: number): Set<string> {
  let ids = WAVED.get(stage)
  if (!ids) {
    const real = realPool(stage)
    ids = new Set(real.filter((w) => oneUnitApart(w, real).length >= ORBS - 1).map((w) => w.id))
    WAVED.set(stage, ids)
  }
  return ids
}

/** a word target: a heart word on HEART_SHARE of them, else a decodable word that has a wave of one-unit neighbours */
function wordTarget(ctx: RoundCtx, avoid: string | undefined, screen: ScreenId, voice: HasVoice): Choice | null {
  const ok = (w: EnWord) => voiceOf(w) !== avoid && w.id !== avoid
  const hearts = heartPool(ctx.stage).filter(ok)
  if (hearts.length && ctx.rng() < HEART_SHARE) return wordChoice(pickWord(ctx, voicedFirst(hearts, voiceOf, voice), screen))
  const real = realPool(ctx.stage)
  const all = real.filter(ok)
  if (!all.length) return null
  const waved = all.filter((w) => wavedAt(ctx.stage).has(w.id))
  return wordChoice(pickWord(ctx, voicedFirst(waved.length ? waved : all, voiceOf, voice), screen))
}

/**
 * The broom's target: at stage 1 a unit's sound; later a unit or a word, by the stage's word share. `avoid`: the sound
 * of the target before (never the same twice in a row). `kind` is the Hebrew run's (ignored).
 */
export function enBroomTarget(ctx: RoundCtx, kind: Kind, avoid?: string, screen: ScreenId = 'broom', voice: HasVoice = ALL_VOICED): Choice {
  void kind
  if (ctx.rng() < (WORD_SHARE_BY_STAGE[ctx.stage] ?? 0)) {
    const w = wordTarget(ctx, avoid, screen, voice)
    if (w) return w
  }
  const units = letterPool(ctx.stage).filter((u) => unitChoice(u).soundId !== avoid && u.id !== avoid)
  const pool = units.length ? units : letterPool(ctx.stage)
  return unitChoice(pickUnit(ctx, voicedFirst(pool, (u) => unitChoice(u).soundId, voice), screen))
}

/**
 * A wave of three orbs: the target and two others he can tell apart by ear, all of opened units. A unit's sound: two
 * letters with other sounds, his mix-up first. A decodable word: words one unit apart (his mix-up first; then one unit
 * added or dropped, then words as long). A heart word: heart or decodable words of about its length.
 */
export function enBroomWave(ctx: RoundCtx, target: Choice, kind: Kind): Choice[] {
  void kind
  const { rng, stage } = ctx
  const partner = partnerOf(ctx, target.id)
  if (target.kind === 'unit') {
    const pool = letterPool(Math.max(stage, unit(target.id).stage)).map(unitChoice)
    const p = partner ? pool.filter((c) => c.id === partner) : []
    return shuffle(rng, fill(target, [...p, ...shuffle(rng, pool)]))
  }
  const w = word(target.id)
  const s = Math.max(stage, w.stage)
  if (w.kind === 'heart') {
    const near = [...heartPool(s), ...realPool(s)].filter((x) => x.text !== w.text && Math.abs(x.text.length - w.text.length) <= 1)
    const rest = [...heartPool(s), ...realPool(s)]
    return shuffle(rng, fill(target, [...shuffle(rng, near), ...shuffle(rng, rest)].map(wordChoice)))
  }
  const real = realPool(s)
  const apart = oneUnitApart(w, real)
  const p = partner ? apart.filter((x) => x.id === partner) : []
  const ordered = [
    ...p, ...shuffle(rng, apart), ...shuffle(rng, real.filter((x) => addOrDrop(x.units, w.units))),
    ...shuffle(rng, real.filter((x) => x.units.length === w.units.length)), ...shuffle(rng, real),
  ]
  return shuffle(rng, fill(target, ordered.map(wordChoice)))
}
