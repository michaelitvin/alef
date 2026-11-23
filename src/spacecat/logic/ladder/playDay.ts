// Play days and the warm-up (the design's *Held*, *The warm-up* and *Re-placement now and then*): a run that starts
// 12 hours or more after his last answer frees the holds that are due and starts one rung below his level.
import { itemsOfRung, type Item } from '../facts'
import { pickNext, type Mark } from '../predict'
import { rungDef, type Band, type RungId } from '../rungs'
import { earnedOffered, frontier } from './frontier'
import { choosePractice, reviewPool, type ChooseCtx, type Choice } from './mix'
import { recheckDue, startRecheck } from './placement'
import { STRIKE_ROUNDS, applyPractice, passWay, settleFrontier, struck, type Outcome } from './practice'
import { pushWindow, statusOf, withRung, type Ladder, type LadderEvent, type LadderSettings, type WarmupMode } from './state'

const HOUR = 3600 * 1000
/** a run that starts this long after his last answer starts a play day */
export const PLAY_DAY_GAP_MS = 12 * HOUR
/** after a gap this long, the warm-up starts two rungs below */
export const LONG_GAP_MS = 14 * 24 * HOUR
/** the warm-up: this share of rounds from the warm-up rung, the rest review */
export const WARMUP_SHARE = 0.7
/** this many strikes on the warm-up rung mean he forgot it */
export const WARMUP_STRIKES = 2

/** The warm-up rung: the highest earned rung below the frontier (the second highest after a long gap); with no frontier, the second-highest earned rung. */
export function warmupRung(l: Ladder, set: LadderSettings, longGap: boolean): RungId | undefined {
  const f = frontier(l, set)
  const earned = earnedOffered(l, set)
  const below = f === null ? earned : earned.filter((r) => rungDef(r).order < rungDef(f).order)
  const back = (f === null ? 1 : 0) + (longGap ? 1 : 0)
  return below[below.length - 1 - back]
}

/** The start of a run: the play-day counter, the holds that are due, the warm-up and the re-check. */
export function beginRun(l: Ladder, ctx: { now: number; set: LadderSettings }): { ladder: Ladder; events: LadderEvent[]; playDay: boolean; holdSpeed?: Band } {
  const { now, set } = ctx
  const first = l.lastAt === undefined
  const gap = first ? 0 : now - l.lastAt!
  if (!first && gap < PLAY_DAY_GAP_MS) return { ladder: l, events: [], playDay: false }
  const events: LadderEvent[] = []
  const before = frontier(l, set)
  let out: Ladder = first
    ? { ...l, day: Math.max(l.day, 1) }
    : { ...l, day: l.day + 1, fastPasses: { today: 0, lastDay: l.fastPasses.today } }
  for (const [r, st] of Object.entries(out.rungs) as [RungId, NonNullable<Ladder['rungs'][RungId]>][]) {
    if (st.status === 'held' && (st.freeOn ?? 0) <= out.day) {
      out = withRung(out, r, { status: 'new', strikes: 0, recent: '', fastRun: 0, freeOn: undefined })
      events.push({ e: 'ladder', rung: r, change: 'free' })
    }
  }
  out = settleFrontier(out, before, set)
  const after = frontier(out, set)
  const freed = after !== null && after !== before && events.some((e) => e.e === 'ladder' && e.rung === after)
  const holdSpeed = freed ? rungDef(after!).band : undefined
  const done = (ladder: Ladder) => ({ ladder, events, playDay: true, ...(holdSpeed ? { holdSpeed } : {}) })
  // the first run ever and the migration run have a placement: no warm-up, no re-check
  if (first || out.mode.kind === 'placement') return done({ ...out, recheckDue: false })
  const due = recheckDue(out)
  const w = warmupRung(out, set, gap >= LONG_GAP_MS)
  if (w) {
    return done({ ...out, mode: { kind: 'warmup', rung: w, recent: '', fastRun: 0, strikes: 0, rounds: 0, reviewLeft: 0 }, recheckDue: due })
  }
  const practice: Ladder = { ...out, mode: { kind: 'practice' }, recheckDue: false }
  return done(due ? startRecheck(practice, set) : practice)
}

/** a warm-up round: the guard first, then review after a strike, else 70% the warm-up rung and 30% review */
export function chooseWarmup(l: Ladder, m: WarmupMode, ctx: ChooseCtx): Choice {
  if (l.guardLeft > 0) return choosePractice(l, ctx)
  const { rng, set, stats } = ctx
  const review = earnedOffered(l, set).filter((r) => r !== m.rung)
  const pick = (pool: Item[], own = false) => pickNext(rng, pool, stats, own ? { ...ctx.last, noRehearsal: true } : ctx.last)
  if (m.reviewLeft > 0 || (review.length > 0 && rng() >= WARMUP_SHARE)) {
    const ladder = m.reviewLeft > 0 ? { ...l, mode: { ...m, reviewLeft: m.reviewLeft - 1 } } : l
    if (review.length === 0) return { item: pick(itemsOfRung(m.rung), true), part: 'warmup', ladder }
    return { item: pick(reviewPool(rng, l, review, set, stats)), part: 'review', ladder }
  }
  return { item: pick(itemsOfRung(m.rung), true), part: 'warmup', ladder: l }
}

/** the warm-up ends: back to practice, then the re-check if it is due */
function endWarmup(l: Ladder, m: WarmupMode, how: 'fast' | 'slow' | 'forgot', rounds: number, set: LadderSettings, events: LadderEvent[]): Ladder {
  events.push({ e: 'warmup', rung: m.rung, how, rounds })
  const out: Ladder = { ...l, mode: { kind: 'practice' } }
  return l.recheckDue ? startRecheck(out, set) : { ...out, recheckDue: false }
}

/** A tallied answer in the warm-up: the practice rules first (a placed rung's probation), then the warm-up's own. */
export function afterWarmup(l: Ladder, m: WarmupMode, a: { item: Item; mark: Mark; fast: boolean; set: LadderSettings }): Outcome {
  const { mark, set } = a
  const practice = applyPractice(l, a)
  const events = [...practice.events]
  let out = practice.ladder
  const rounds = m.rounds + 1
  const mode: WarmupMode = { ...m, rounds }
  if (a.item.rung !== m.rung) return { ...practice, ladder: { ...out, mode } }
  if (statusOf(out, m.rung) === 'new') {
    // the probation sent it back: he forgot it
    return { ...practice, ladder: endWarmup(out, mode, 'forgot', rounds, set, events), events }
  }
  const recent = pushWindow(m.recent, mark)
  const fastRun = mark === 'o' && a.fast ? m.fastRun + 1 : 0
  const way = mark === 'o' ? passWay(recent, fastRun) : undefined
  if (way) return { ...practice, ladder: endWarmup(out, mode, way, rounds, set, events), events }
  if (struck(recent)) {
    const strikes = m.strikes + 1
    events.push({ e: 'ladder', rung: m.rung, change: 'strike', by: 'warmup' })
    if (strikes >= WARMUP_STRIKES) {
      const before = frontier(out, set)
      out = withRung(out, m.rung, { status: 'new', recent: '', fastRun: 0, strikes: 0, probation: undefined })
      events.push({ e: 'ladder', rung: m.rung, change: 'unpassed', by: 'warmup' })
      out = settleFrontier(out, before, set)
      return { ...practice, ladder: endWarmup(out, mode, 'forgot', rounds, set, events), events }
    }
    return { ...practice, ladder: { ...out, mode: { ...mode, recent: '', fastRun: 0, strikes, reviewLeft: STRIKE_ROUNDS } }, events }
  }
  return { ...practice, ladder: { ...out, mode: { ...mode, recent, fastRun } }, events }
}

