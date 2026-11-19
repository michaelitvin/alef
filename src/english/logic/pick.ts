// The adaptive choice of the English path: the features of a choice (what his answers are tallied under) and the pick of a
// sound unit near the one-mistake-in-five aim. Same method as Book 2 (`pickTarget`), with the English features.
import type { ScreenId } from '../../duel2/logic/predict'
import { featurePrior, pickTarget } from '../../duel2/logic/predict'
import type { Choice, RoundCtx } from '../../duel2/logic/rounds'
import { NEW_SHARE } from '../../duel2/logic/stages'
import { word, type EnWord } from '../content/words'
import { unit, type Unit } from '../content/units'

/** The unit choice for a sound unit: its id is the unit's id. */
export const unitChoice = (u: Unit): Choice => ({ kind: 'unit', id: u.id, text: u.text, soundId: 'snd-' + u.sound, itemId: u.id })

/**
 * What an answer on this choice is tallied under: a unit's id; for a word its unit ids, its blend patterns and, for a
 * heart word, `heart:<word>`; and the screen.
 */
export function enFeatures(c: Choice, screen: ScreenId): string[] {
  if (c.kind === 'unit') return [c.id, `sc:${screen}`]
  if (c.kind !== 'word') throw new Error(`not an English choice: ${c.kind}`)
  const w = word(c.id)
  const own = w.kind === 'heart' ? [`heart:${w.id}`] : [...new Set(w.units), ...(w.blends ?? [])]
  return [...own, `sc:${screen}`]
}

/** The English prior of a feature: the screen's prior, else a flat 0.03 (a unit id such as `w` is not a Hebrew letter feature). */
export const enPrior = (f: string): number => (f.startsWith('sc:') ? featurePrior(f) : 0.03)

/** A unit from the pool: near the aim; the stage's new units are chosen on `NEW_SHARE` of the rounds. */
export function pickUnit(ctx: RoundCtx, pool: Unit[], screen: ScreenId = 'broom'): Unit {
  if (pool.length === 0) throw new Error('no unit to pick')
  const { rng } = ctx
  let cands = pool
  const fresh = pool.filter((u) => u.stage === ctx.stage)
  if (fresh.length && fresh.length < pool.length && rng() < NEW_SHARE) cands = fresh
  return pickTarget(rng, cands, (u) => enFeatures(unitChoice(u), screen), ctx.tallies, ctx.recent, enPrior)
}

/**
 * A word from the pool: near the aim (its features on `screen`); the stage's new words are chosen on `NEW_SHARE` of the
 * rounds. The broom's word targets and the doors' words.
 */
export function pickWord(ctx: RoundCtx, pool: EnWord[], screen: ScreenId): EnWord {
  const fresh = pool.filter((w) => w.stage === ctx.stage)
  const cands = fresh.length && fresh.length < pool.length && ctx.rng() < NEW_SHARE ? fresh : pool
  const asChoice = (w: EnWord): Choice => ({ kind: 'word', id: w.id, text: w.text, soundId: '', itemId: w.id })
  return pickTarget(ctx.rng, cands, (w) => enFeatures(asChoice(w), screen), ctx.tallies, ctx.recent, enPrior)
}

/** the item of an English choice: a unit, or a word */
export const itemOfChoice = (c: Choice): Unit | EnWord => (c.kind === 'unit' ? unit(c.id) : word(c.id))

/** An answer counts toward the stage pass when it asks his stage's new items: a unit or a word of his stage. */
export const enIsNewStageChoice = (stage: number, c: Choice): boolean => itemOfChoice(c).stage === stage
