// The flight boss (spec 2026-11-07-book2-flight-boss-design): on every second broom visit of a run a boss throws waves of
// two orbs, each made of one of his real mix-ups. 8 right catches beat it. Four kinds, discovered one by one.
import type { Rng } from '../../shared/adaptive'
import { GROUP_MARKS, SHAPE_GROUPS, isAllowed, item as itemOf, mark as markOf, type MarkId, type Stage, type VowelGroup } from './content.ts'
import { features, pickTarget } from './predict'
import { syllableChoice, type Choice, type Conf, type RoundCtx } from './rounds'
import { syllable } from './content.ts'

export type BossKind = 'dot' | 'shin' | 'mimic' | 'bat'
/** the order of the trophy shelf (and of the teaser on the end screen) */
export const BOSS_KINDS: BossKind[] = ['dot', 'shin', 'mimic', 'bat']
export const BOSS_HITS = 8
/** boss waves fly slower than normal waves (travel time ×1.3) */
export const BOSS_SLOW = 1.3
/** the bonus of a win: 3 coins, kept as stars (coins stay stars / 10: one source of truth) */
export const BOSS_COINS = 3
/** a kind he has not beaten yet wins when the scores are this close */
export const UNBEATEN_BONUS = 3

/** a boss on broom visits 2, 4, … of a run; never on the first */
export const isBossVisit = (broomVisit: number) => broomVisit >= 2 && broomVisit % 2 === 0

/** dot and shin kinds need the dotted letters (stage 3); the others stage 2 (syllables) */
export const bossOpen = (kind: BossKind, stage: Stage) => stage >= (kind === 'dot' || kind === 'shin' ? 3 : 2)

const DOT_PAIRS: [string, string][] = [['bet', 'vet'], ['kaf', 'khaf'], ['pe', 'fe']]
const SHIN_PAIRS: [string, string][] = [['shin', 'sin']]
/** look-alike pairs the game knows (its shape groups); ד/ר and צ/ע first: his real mix-ups */
const MIMIC_PAIRS: [string, string][] = (() => {
  const out: [string, string][] = [['dalet', 'resh'], ['ayin', 'tsadi']]
  for (const g of SHAPE_GROUPS)
    for (let i = 0; i < g.length; i++)
      for (let j = i + 1; j < g.length; j++)
        if (!out.some(([a, b]) => (a === g[i] && b === g[j]) || (a === g[j] && b === g[i]))) out.push([g[i], g[j]])
  return out
})()
const O_MARKS: MarkId[] = GROUP_MARKS.o
const U_MARKS: MarkId[] = GROUP_MARKS.u

const both = (c: Conf, a: string, b: string) => (c[a]?.[b] ?? 0) + (c[b]?.[a] ?? 0)

/** How often he made each kind's mix-up (letters asked → tapped; for the bat the vowels o ↔ u). */
export function bossScores(conf: { letters: Conf; vowels: Conf }): Record<BossKind, number> {
  const sum = (ps: [string, string][]) => ps.reduce((n, [a, b]) => n + both(conf.letters, a, b), 0)
  return { dot: sum(DOT_PAIRS), shin: sum(SHIN_PAIRS), mimic: sum(MIMIC_PAIRS), bat: both(conf.vowels, 'o', 'u') }
}

/**
 * The kind of this boss: the one whose mix-up he makes most, a kind he has not beaten when the scores are close, never the
 * kind of the boss before, and only kinds his stage has opened. Null when none is open (stage 1: letters only).
 */
export function chooseBoss(o: { stage: Stage; confusions: { letters: Conf; vowels: Conf }; beaten: BossKind[]; last: BossKind | null; rng: Rng }): BossKind | null {
  let avail = BOSS_KINDS.filter((k) => bossOpen(k, o.stage))
  if (!avail.length) return null
  if (avail.length > 1) avail = avail.filter((k) => k !== o.last)
  const raw = bossScores(o.confusions)
  const score = (k: BossKind) => raw[k] + (o.beaten.includes(k) ? 0 : UNBEATEN_BONUS)
  const top = Math.max(...avail.map(score))
  const best = avail.filter((k) => score(k) === top)
  return best[Math.floor(o.rng() * best.length) % best.length]
}

const pick = <T,>(rng: Rng, xs: T[]): T => xs[Math.floor(rng() * xs.length) % xs.length]
const items = (stage: Stage) => (stage >= 3 ? (id: string) => !!id : (id: string) => !itemOf(id).soft)

function pairsOf(kind: BossKind, stage: Stage): [string, string][] {
  const ok = items(stage)
  const ps = kind === 'dot' ? DOT_PAIRS : kind === 'shin' ? SHIN_PAIRS : MIMIC_PAIRS
  return ps.filter(([a, b]) => ok(a) && ok(b))
}

/** Every syllable a boss of this kind can ask for. */
function pool(kind: BossKind, stage: Stage): Choice[] {
  const ok = items(stage)
  if (kind === 'bat') {
    const ids = [...new Set(MIMIC_PAIRS.flat().concat(DOT_PAIRS.flat(), ['lamed', 'mem', 'nun', 'shin', 'qof', 'tav', 'samech']))].filter(ok)
    return ids.flatMap((id) => [...O_MARKS, ...U_MARKS].filter((m) => isAllowed(id, m)).map((m) => syllableChoice(syllable(id, m))))
  }
  const ids = [...new Set(pairsOf(kind, stage).flat())]
  const marks = Object.values(GROUP_MARKS).flat()
  return ids.flatMap((id) => marks.filter((m) => isAllowed(id, m) && twinsOf(kind, stage, id, m).length > 0).map((m) => syllableChoice(syllable(id, m))))
}

/** The other members of the target's pairs, with the same vowel. */
function twinsOf(kind: BossKind, stage: Stage, itemId: string, m: MarkId): string[] {
  return pairsOf(kind, stage).flatMap(([a, b]) => (a === itemId ? [b] : b === itemId ? [a] : [])).filter((id) => isAllowed(id, m))
}

/** The sound a boss asks for (adaptive, as on the normal flight); `avoid`: the sound before (it changes inside the pair). */
export function bossTarget(ctx: RoundCtx, kind: BossKind, avoid?: string): Choice {
  let cands = pool(kind, ctx.stage)
  if (avoid) cands = cands.filter((c) => c.soundId !== avoid)
  const featureOf = (c: Choice) => features({ item: itemOf(c.itemId), mark: markOf(c.mark!) }, 'broom')
  return pickTarget(ctx.rng, cands, featureOf, ctx.tallies, ctx.recent)
}

/** The twin of a boss target: the other form (dot, shin), its look-alike (mimic: his own mix-up first), or o ↔ u (bat). */
export function bossTwin(ctx: RoundCtx, kind: BossKind, target: Choice): Choice {
  const m = target.mark!
  if (kind === 'bat') {
    const other: VowelGroup = target.group === 'o' ? 'u' : 'o'
    const marks = GROUP_MARKS[other].filter((x) => isAllowed(target.itemId, x))
    return syllableChoice(syllable(target.itemId, pick(ctx.rng, marks)))
  }
  const twins = twinsOf(kind, ctx.stage, target.itemId, m)
  const row = ctx.confusions.letters[target.itemId] ?? {}
  const mine = twins.filter((id) => (row[id] ?? 0) > 0).sort((a, b) => (row[b] ?? 0) - (row[a] ?? 0))
  const id = mine[0] ?? pick(ctx.rng, twins)
  const c = syllableChoice(syllable(id, m))
  // the other form of a dotted letter is a near miss, as on the normal flight
  return itemOf(target.itemId).pair === id ? { ...c, nearMissOf: target.id } : c
}

/** A boss wave: two orbs, the target and its twin, in random order. */
export function bossWave(ctx: RoundCtx, kind: BossKind, target: Choice): Choice[] {
  const twin = bossTwin(ctx, kind, target)
  return ctx.rng() < 0.5 ? [target, twin] : [twin, target]
}
