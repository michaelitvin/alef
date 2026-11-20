// Where the next round comes from in practice (the design's *The mix*): the frontier, the rung below, review, the
// guard's sure wins, and review only when nothing is free. Each part picks its item with the 1-in-5 picker.
import type { Rng } from '../../../shared/adaptive'
import { itemsOfRung, variantsOf, type Item, type SumItem } from '../facts'
import { SAMPLE_MAX, pickNext, predictOf, samplePool, statsMap, type ItemStats } from '../predict'
import { RUNGS, rungDef, type RungId } from '../rungs'
import { earnedOffered, frontier, inRange, isEarned, isOn } from './frontier'
import { statusOf, type Ladder, type LadderSettings, type Part } from './state'

/** the shares of the frontier, the rung below and review */
export const MIX = { frontier: 0.7, below: 0.2, review: 0.1 } as const
/** ring variants: this share of the review and rung-below parts, once a variant's ring place is earned */
export const REVIEW_VARIANT_SHARE = 1 / 3
/** nothing free: this share of review comes from the top TOP_RUNGS earned rungs */
export const TOP_SHARE = 0.7, TOP_RUNGS = 3
/** a sure win: an item whose predicted mistake rate is under this; review prefers mistaken items at or above it */
export const SURE_RATE = 0.1
/** with missing100 off, no ring variant has a number above this */
export const VARIANT_MAX_WITHOUT_MISSING100 = 20

export interface ChooseCtx { rng: Rng; set: LadderSettings; stats: Record<string, ItemStats>; last: { fact?: string; sinceZero: number } }
export interface Choice { item: Item; part: Part; ladder: Ladder }

const TIMES_VARIANTS: readonly RungId[] = ['T2', 'T3', 'T5']

/** The rung below the frontier: its need highest in the order that is on; none for rung 1. */
export function belowOf(f: RungId, set: LadderSettings): RungId | undefined {
  const on = rungDef(f).needs.filter((n) => isOn(n, set))
  on.sort((a, b) => rungDef(b).order - rungDef(a).order)
  return on[0]
}

/** The ring variants of an earned rung that review may give: at b once 6 is earned, at a once 12 is; × at b once T4a is. */
export function variantsFor(l: Ladder, r: RungId, set: LadderSettings): SumItem[] {
  const times = TIMES_VARIANTS.includes(r)
  const opts = times ? { b: isEarned(l, 'T4a'), a: false } : { b: isEarned(l, '6'), a: isEarned(l, '12') }
  if (!opts.a && !opts.b) return []
  return variantsOf(r, opts).filter(
    (v) => v.variant && (set.missing100 || Math.max(v.a, v.b, v.c) <= VARIANT_MAX_WITHOUT_MISSING100),
  )
}

/** the items of some rungs, each rung sampled to its share of SAMPLE_MAX (so the big rungs do not crowd out the small) */
function pooled(rng: Rng, lists: Item[][], stats: Record<string, ItemStats>): Item[] {
  const each = Math.ceil(SAMPLE_MAX / Math.max(1, lists.length))
  return lists.flatMap((items) => samplePool(rng, items, stats, each))
}

/**
 * The pool of a review or rung-below part: the lowest placed rung first while one is placed; ring variants in
 * REVIEW_VARIANT_SHARE of the rounds; items with a recorded mistake that are not sure wins first, if any.
 */
export function reviewPool(rng: Rng, l: Ladder, rungs: RungId[], set: LadderSettings, stats: Record<string, ItemStats>): Item[] {
  const placed = rungs.find((r) => statusOf(l, r) === 'placed')
  const use = placed ? [placed] : rungs
  const variants = use.map((r) => variantsFor(l, r, set)).filter((v) => v.length > 0)
  const pool = variants.length > 0 && rng() < REVIEW_VARIANT_SHARE
    ? pooled(rng, variants, stats)
    : pooled(rng, use.map(itemsOfRung), stats)
  if (placed) return pool
  const known = statsMap(stats)
  const mistaken = pool.filter((it) => {
    const s = known.get(it.id)
    return s !== undefined && s.wrong + s.timeout > 0 && predictOf(it, stats) >= SURE_RATE
  })
  return mistaken.length > 0 ? mistaken : pool
}

/** The guard's pool: items of earned rungs that are sure wins; none: the lowest predicted (no earned rung: of `fallback`). */
export function guardPool(rng: Rng, l: Ladder, set: LadderSettings, stats: Record<string, ItemStats>, fallback: RungId[]): Item[] {
  const earned = earnedOffered(l, set)
  const pool = pooled(rng, (earned.length ? earned : fallback).map(itemsOfRung), stats)
  const rated = pool.map((it) => [it, predictOf(it, stats)] as const)
  const sure = rated.filter(([, p]) => p < SURE_RATE).map(([it]) => it)
  if (sure.length) return sure
  const low = Math.min(...rated.map(([, p]) => p))
  return rated.filter(([, p]) => p === low).map(([it]) => it)
}

/** the rung to play when nothing at all is offered or earned (every free rung held): the lowest on and in range */
export function lastResort(set: LadderSettings): RungId {
  return RUNGS.find((d) => isOn(d.id, set) && inRange(d.id, set))?.id ?? '1'
}

const pick = (ctx: ChooseCtx, pool: Item[]) => pickNext(ctx.rng, pool, ctx.stats, ctx.last)

/** one round in practice: the guard first, then the mix (counts down the guard and the strike's rounds) */
export function choosePractice(l: Ladder, ctx: ChooseCtx): Choice {
  const { rng, set, stats } = ctx
  const f = frontier(l, set)
  if (l.guardLeft > 0) {
    const pool = guardPool(rng, l, set, stats, [f ?? lastResort(set)])
    return { item: pick(ctx, pool), part: 'guard', ladder: { ...l, guardLeft: l.guardLeft - 1 } }
  }
  const earned = earnedOffered(l, set)
  if (f === null) {
    if (earned.length === 0) return { item: pick(ctx, itemsOfRung(lastResort(set))), part: 'review', ladder: l }
    const top = earned.slice(-TOP_RUNGS)
    const rest = earned.slice(0, -TOP_RUNGS)
    const from = rest.length === 0 || rng() < TOP_SHARE ? top : rest
    return { item: pick(ctx, reviewPool(rng, l, from, set, stats)), part: 'review', ladder: l }
  }
  const below = belowOf(f, set)
  const review = earned.filter((r) => r !== below)
  let fr: number = MIX.frontier, be = below ? MIX.below : 0, rv = review.length ? MIX.review : 0
  if (!below) fr += MIX.below
  if (!review.length) {
    if (below) be += MIX.review
    else fr += MIX.review
  }
  let ladder = l
  if (l.strikeLeft > 0) {
    if (below) be += fr
    else if (review.length) rv += fr
    if (below || review.length) fr = 0
    ladder = { ...l, strikeLeft: l.strikeLeft - 1 }
  }
  const x = rng() * (fr + be + rv)
  if (x < fr) return { item: pick(ctx, itemsOfRung(f)), part: 'frontier', ladder }
  if (x < fr + be) return { item: pick(ctx, reviewPool(rng, l, [below!], set, stats)), part: 'below', ladder }
  return { item: pick(ctx, reviewPool(rng, l, review, set, stats)), part: 'review', ladder }
}
