// The English ladder (design Part 5, "word chains"): each rung changes one sound of the word below it (sat → sit → fit).
// He hears the new word and drags the part that makes it; at stages 1–3 the place that changes is marked, later he
// finds it. From stage 5 a rung may add a consonant (lip → slip): a box more. The rungs come from the chains of asset
// plan 1.14 (a shorter ladder uses the start of a chain); the first rung is the chain's first word, asked whole.
import type { LadderPlan, LadderPlanStep } from '../../../duel2/course/types'
import { pickTarget } from '../../../duel2/logic/predict'
import type { Choice, RoundCtx } from '../../../duel2/logic/rounds'
import { CHAINS } from '../../content/chains'
import { unit, type Unit } from '../../content/units'
import { WORDS, word, type EnWord } from '../../content/words'
import { enPrior, unitChoice } from '../pick'
import { letterPool } from '../tower'
import { classOf, partOf, tilePool, tilesFor } from './cauldron'
import { oneUnitApart, wordChoice } from './broom'

/** the plates by the next rung (as on the Hebrew ladder) */
const PLATES = 3
/** the last stage whose ladder marks the place that changes */
const MARKED_UNTIL = 3

type Chain = (typeof CHAINS)[number]

/**
 * A word's boxes, left to right: its units' letters (an ending without its hyphen); a silent e shows its vowel in its
 * place and its `e` at the end, both counting for the silent e (`pine`: p · i · n · e).
 */
function partsOf(w: EnWord): Choice[] {
  const units = w.units.map(unit)
  const parts = units.map((u) => (u.kind === 'magic-e' ? { ...unitChoice(u), text: u.text.split(' ')[0] } : partOf(u)))
  const silent = units.find((u) => u.kind === 'magic-e')
  return silent ? [...parts, { ...unitChoice(silent), text: 'e' }] : parts
}

/** where `now` differs from `below`: one box changed (`grow` unset), or one box added (`grow` 1); null: neither */
function changeOf(below: Choice[], now: Choice[]): { at: number; grow?: 1 } | null {
  const a = below.map((x) => x.text)
  const b = now.map((x) => x.text)
  if (a.length === b.length) {
    const at = b.findIndex((x, i) => x !== a[i])
    return at >= 0 && b.every((x, i) => i === at || x === a[i]) ? { at } : null
  }
  if (b.length === a.length + 1) {
    const at = b.findIndex((_, i) => b.filter((_, j) => j !== i).every((x, j) => x === a[j]))
    return at >= 0 ? { at, grow: 1 } : null
  }
  return null
}

/** the real word of a chain's entry */
const realWord = (text: string): EnWord => {
  const w = WORDS.find((x) => x.kind === 'real' && x.text === text)
  if (!w) throw new Error(`chain word "${text}" is not a real word`)
  return w
}

/** the chains a ladder of `rungs` can take at `stage`: his stage's, else those of the highest stage below with one */
function chainsFor(stage: number, rungs: number): Chain[] {
  for (let s = stage; s >= 1; s--) {
    const cs = CHAINS.filter((c) => c.stage === s && c.words.length >= rungs)
    if (cs.length) return cs
  }
  throw new Error(`no ladder chain of ${rungs} rungs at stage ${stage}`)
}

/** two plates may not sound alike or look alike, and never `I` against `l` */
const fits = (out: Choice[], c: Choice) =>
  !out.some((o) => o.id === c.id || o.soundId === c.soundId || o.text === c.text || (o.text.includes('I') && c.text.includes('l')) || (o.text.includes('l') && c.text.includes('I')))

function shuffle<T>(rng: () => number, xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** the first rung: the word and two real words he can read, one unit apart where there are (never a word of this ladder) */
function firstPlates(ctx: RoundCtx, w: EnWord, ladder: string[]): Choice[] {
  const pool = WORDS.filter((x) => x.kind === 'real' && x.stage <= ctx.stage && !ladder.includes(x.text))
  const near = shuffle(ctx.rng, oneUnitApart(w, pool))
  const alike = shuffle(ctx.rng, pool.filter((x) => x.units.length === w.units.length))
  const out = [wordChoice(w)]
  for (const x of [...near, ...alike, ...shuffle(ctx.rng, pool)].map(wordChoice)) if (out.length < PLATES && fits(out, x)) out.push(x)
  return shuffle(ctx.rng, out)
}

/** a changed box's plates: the right part and two wrong ones (an added `e`: single letters, as the cauldron's throw) */
function partPlates(ctx: RoundCtx, right: Choice): Choice[] {
  const u = unit(right.id)
  if (u.kind === 'magic-e') {
    const singles = letterPool(ctx.stage).filter((x: Unit) => x.kind === 'vowel' || x.kind === 'consonant')
    return tilesFor(ctx, right, singles, right.text === 'e' ? 'letter' : 'vowel', PLATES)
  }
  return tilesFor(ctx, right, tilePool(ctx.stage, u), classOf(u), PLATES)
}

/** the rungs of a chain's start: each word's boxes, and where it changed from the word below */
function rungsOf(chain: Chain, rungs: number): { w: EnWord; parts: Choice[]; change: { at: number; grow?: 1 } | null }[] {
  const ws = chain.words.slice(0, rungs).map(realWord)
  return ws.map((w, k) => {
    const parts = partsOf(w)
    if (k === 0) return { w, parts, change: null }
    const change = changeOf(partsOf(ws[k - 1]), parts)
    if (!change) throw new Error(`chain ${chain.stage}${chain.id}: ${ws[k - 1].text} → ${w.text} is not one box changed or added`)
    return { w, parts, change }
  })
}

/**
 * The ladder of a visit at his stage: `rungs` words of one chain, the start of it. The chain is picked near the aim, by
 * the parts its rungs ask. The first rung asks the word among words; each later rung asks the changed part among parts.
 */
export function enLadderPlan(ctx: RoundCtx, rungs: number): LadderPlan {
  const chains = chainsFor(ctx.stage, rungs)
  const asked = (c: Chain) => [...new Set(rungsOf(c, rungs).flatMap((r) => (r.change ? [r.parts[r.change.at].id] : [])))]
  const chain = pickTarget(ctx.rng, chains, (c) => [...asked(c), 'sc:ladder'], ctx.tallies, ctx.recent, enPrior)
  const ladder = chain.words.slice(0, rungs)
  const steps: LadderPlanStep[] = rungsOf(chain, rungs).map(({ w, parts, change }) => {
    const target = wordChoice(word(w.id))
    if (!change) return { target, plates: firstPlates(ctx, w, ladder), parts }
    return { target, plates: partPlates(ctx, parts[change.at]), parts, at: change.at, ...(change.grow ? { grow: change.grow } : {}) }
  })
  return { marked: ctx.stage <= MARKED_UNTIL, steps }
}
