// The English flight bosses (design Part 5: the bosses carry English content; their art, moves and lines stay). Each
// kind throws one family of mix-ups, two orbs a wave (the target and its twin, his own most-made mix-up first):
// - mimic: look-alike letters (b d p, n u, m w, h n: the ghosts' sets);
// - bat: the short vowels (a e i o u);
// - shin (the two-headed bird): the digraphs sh ch th;
// - dot (the thief): words one unit apart (ship · chip).
// Kinds open by stage (mimic, bat, dot from stage 2; shin from 4, with the digraphs) and are scored by his English
// mix-ups, as Book 2's are by its own.
import type { BossKind, BossKinds } from '../../../duel2/logic/boss'
import { BOSS_KINDS } from '../../../duel2/logic/boss'
import type { Choice, Conf, RoundCtx } from '../../../duel2/logic/rounds'
import { unit, type Unit } from '../../content/units'
import { WORDS, word, type EnWord } from '../../content/words'
import { pickTarget } from '../../../duel2/logic/predict'
import { enFeatures, enPrior, pickUnit, unitChoice } from '../pick'
import { oneUnitApart, wordChoice } from './broom'

/** the look-alike pairs of the mimic (spec Part 5's ghost sets: b d p, n u, m w, h n) */
const MIMIC_PAIRS: [string, string][] = [['b', 'd'], ['b', 'p'], ['d', 'p'], ['n', 'u'], ['m', 'w'], ['h', 'n']]
const SHORT_VOWELS = ['a', 'e', 'i', 'o', 'u']
const DIGRAPHS = ['sh', 'ch', 'th']
/** every pair of a set */
const pairsOf = (ids: string[]): [string, string][] => ids.flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b] as [string, string]))
const UNIT_PAIRS: Record<Exclude<BossKind, 'dot'>, [string, string][]> = { mimic: MIMIC_PAIRS, bat: pairsOf(SHORT_VOWELS), shin: pairsOf(DIGRAPHS) }

/** the stage a kind opens at */
const OPENS: Record<BossKind, number> = { mimic: 2, bat: 2, dot: 2, shin: 4 }

const both = (c: Conf, a: string, b: string) => (c[a]?.[b] ?? 0) + (c[b]?.[a] ?? 0)
const isReal = (id: string) => WORDS.some((w) => w.id === id && w.kind === 'real')

/** The kinds open at `stage`, and how often he made each kind's mix-up (asked → tapped, the English confusions). */
export function enBossKinds(stage: number, confusions: { letters: Conf }): BossKinds {
  const c = confusions.letters
  const sum = (ps: [string, string][]) => ps.reduce((n, [a, b]) => n + both(c, a, b), 0)
  let dot = 0
  for (const [a, row] of Object.entries(c)) {
    if (!isReal(a)) continue
    for (const [b, n] of Object.entries(row)) if (isReal(b) && oneUnitApart(word(a), [word(b)]).length) dot += n
  }
  return {
    open: BOSS_KINDS.filter((k) => stage >= OPENS[k]),
    scores: { mimic: sum(UNIT_PAIRS.mimic), bat: sum(UNIT_PAIRS.bat), shin: sum(UNIT_PAIRS.shin), dot },
  }
}

/** a kind's opened pairs at `stage` (both units opened) */
const openPairs = (kind: Exclude<BossKind, 'dot'>, stage: number) => UNIT_PAIRS[kind].filter(([a, b]) => unit(a).stage <= stage && unit(b).stage <= stage)

/** the twins of `id` in a kind (its pair partners), his most-made mix-up first */
function twinsOf(ctx: RoundCtx, id: string, twins: string[]): string[] {
  const row = ctx.confusions.letters[id] ?? {}
  const mine = twins.filter((t) => (row[t] ?? 0) > 0).sort((a, b) => (row[b] ?? 0) - (row[a] ?? 0))
  const rest = twins.filter((t) => !mine.includes(t))
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(ctx.rng() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return [...mine, ...rest]
}

/** the decodable words of the dot thief: real words of his stage or below that have a one-unit neighbour */
const dotWords = (stage: number): EnWord[] => {
  const real = WORDS.filter((w) => w.kind === 'real' && w.stage <= stage)
  return real.filter((w) => oneUnitApart(w, real).length > 0)
}

/**
 * The sound a boss asks for: a unit of its family, one of his stage when the family has one (adaptive, as on the
 * flight), or (the dot thief) a word one unit apart from another. `avoid`: the sound before.
 */
export function enBossTarget(ctx: RoundCtx, kind: BossKind, avoid?: string): Choice {
  if (kind === 'dot') {
    const all = dotWords(ctx.stage)
    const pool = all.filter((w) => wordChoice(w).soundId !== avoid)
    return wordChoice(pickTarget(ctx.rng, pool.length ? pool : all, (w) => enFeatures(wordChoice(w), 'broom'), ctx.tallies, ctx.recent, enPrior))
  }
  const ids = [...new Set(openPairs(kind, ctx.stage).flat())]
  let units: Unit[] = ids.map(unit).filter((u) => unitChoice(u).soundId !== avoid)
  if (!units.length) units = ids.map(unit)
  const own = units.filter((u) => u.stage === ctx.stage)
  return unitChoice(pickUnit(ctx, own.length ? own : units))
}

/** A boss wave: two orbs, the target and its twin (his own most-made mix-up first), in random order. */
export function enBossWave(ctx: RoundCtx, kind: BossKind, target: Choice): Choice[] {
  let twin: Choice
  if (target.kind === 'word') {
    const real = WORDS.filter((w) => w.kind === 'real' && w.stage <= Math.max(ctx.stage, word(target.id).stage))
    const near = oneUnitApart(word(target.id), real)
    const ids = twinsOf(ctx, target.id, near.map((w) => w.id))
    twin = wordChoice(word(ids[0]))
  } else {
    const k = (kind === 'dot' ? 'mimic' : kind) as Exclude<BossKind, 'dot'>
    const partners = openPairs(k, ctx.stage).flatMap(([a, b]) => (a === target.id ? [b] : b === target.id ? [a] : []))
    twin = unitChoice(unit(twinsOf(ctx, target.id, partners)[0]))
  }
  return ctx.rng() < 0.5 ? [target, twin] : [twin, target]
}
