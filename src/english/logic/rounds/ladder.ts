// The English ladder (design Part 5, "word chains"): each rung changes one sound of the word below it (sat → sit → fit).
// He hears the new word and drags the part that makes it; at stages 1–3 the place that changes is marked, later he
// finds it. From stage 5 a rung may add a consonant (lip → slip): a box more. The rungs come from the chains of his stage
// (asset plan 1.14; a shorter ladder uses the start of a chain). The chain's first word is the ladder's foot: built
// already and said; each rung after it asks one change.
import type { LadderPlan, LadderPlanStep } from '../../../duel2/course/types'
import { pickTarget } from '../../../duel2/logic/predict'
import type { Choice, RoundCtx } from '../../../duel2/logic/rounds'
import { CHAINS } from '../../content/chains'
import { unit, type Unit } from '../../content/units'
import { WORDS, word, type EnWord } from '../../content/words'
import { enPrior, unitChoice } from '../pick'
import { letterPool } from '../tower'
import { classOf, partOf, tilePool, tilesFor } from './cauldron'
import { wordChoice } from './broom'

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

/**
 * where `now` differs from `below`: one box changed (`grow` unset), or one box added (`grow` 1); null: neither. (A box
 * dropped, `grow` -1, is reserved in the plan's type: no chain drops one, and what he would drag for it is not designed.)
 */
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

/** the chains of a ladder at `stage`: his stage's (any length: a short chain makes a short ladder), else the highest stage below with one */
function chainsFor(stage: number): Chain[] {
  for (let s = stage; s >= 1; s--) {
    const cs = CHAINS.filter((c) => c.stage === s && c.words.length >= 2)
    if (cs.length) return cs
  }
  throw new Error(`no ladder chain at stage ${stage}`)
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

/** the foot and the first `rungs` changes of a chain: each word's boxes, and where it changed from the word below */
function rungsOf(chain: Chain, rungs: number): { foot: { w: EnWord; parts: Choice[] }; up: { w: EnWord; parts: Choice[]; change: { at: number; grow?: 1 } }[] } {
  const ws = chain.words.slice(0, rungs + 1).map(realWord)
  const up = ws.slice(1).map((w, i) => {
    const parts = partsOf(w)
    const change = changeOf(partsOf(ws[i]), parts)
    if (!change) throw new Error(`chain ${chain.stage}${chain.id}: ${ws[i].text} → ${w.text} is not one box changed or added`)
    return { w, parts, change }
  })
  return { foot: { w: ws[0], parts: partsOf(ws[0]) }, up }
}

/**
 * The ladder of a visit at his stage: the start of one chain of his stage, its first word the foot (built already) and
 * at most `rungs` changes after it (fewer when the chain is shorter: the visit follows the plan). The chain is picked
 * near the aim, by the parts its rungs ask; each rung asks the changed part among parts.
 */
export function enLadderPlan(ctx: RoundCtx, rungs: number): LadderPlan {
  const chains = chainsFor(ctx.stage)
  const asked = (c: Chain) => [...new Set(rungsOf(c, rungs).up.map((r) => r.parts[r.change.at].id))]
  const chain = pickTarget(ctx.rng, chains, (c) => [...asked(c), 'sc:ladder'], ctx.tallies, ctx.recent, enPrior)
  const { foot, up } = rungsOf(chain, rungs)
  const steps: LadderPlanStep[] = up.map(({ w, parts, change }) => ({
    target: wordChoice(word(w.id)), plates: partPlates(ctx, parts[change.at]), parts, at: change.at, ...(change.grow ? { grow: change.grow } : {}),
  }))
  return { marked: ctx.stage <= MARKED_UNTIL, base: { target: wordChoice(word(foot.w.id)), parts: foot.parts }, steps }
}
