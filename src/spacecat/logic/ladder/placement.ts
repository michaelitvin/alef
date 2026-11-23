// Placement (the design's *Placement*): probes jump up the offered rungs and halve the jump on a slow or wrong answer;
// the confirmed rungs and all they need are placed. The re-check (*Re-placement now and then*) is a short probe upward.
import type { Rng } from '../../../shared/adaptive'
import { itemsOfRung, type Item } from '../facts'
import { pickNext, type ItemStats, type LastCtx, type Mark } from '../predict'
import { RUNGS, rungDef, type RungId } from '../rungs'
import { frontier, isOn, needsClosure, offered } from './frontier'
import { settleFrontier, type Outcome } from './practice'
import { statusOf, withRung, type Ladder, type LadderEvent, type LadderSettings, type PlacementMode, type RecheckMode } from './state'

/** the placement after the update (a v1 save): a jump of 4, at most 10 probes */
export const MIGRATION_JUMP = 4, MIGRATION_PROBES = 10
/** a rung is confirmed by one fast right answer or by this many right answers */
export const CONFIRM_RIGHTS = 2
/** the re-check: due when this many play days passed since the last placement or re-check, */
export const RECHECK_DAYS = 5
/** or when he passed this many rungs the fast way on his last play day */
export const RECHECK_FAST_PASSES = 2
/** at most this many probes; the first is the RECHECK_FIRST-th rung above the frontier, then the 2nd, then the 1st */
export const RECHECK_PROBES = 3, RECHECK_FIRST = 4
const RECHECK_AT: readonly number[] = [RECHECK_FIRST - 1, 1, 0]

/** The position of a rung in a list of offered rungs; a rung that dropped out maps to the nearest offered one below. */
export function positionIn(list: RungId[], r: RungId): number {
  const i = list.indexOf(r)
  if (i >= 0) return i
  const order = rungDef(r).order
  let pos = 0
  list.forEach((x, j) => { if (rungDef(x).order < order) pos = j })
  return pos
}

/** r and every rung it needs (that is on) become placed, with probation 0; the events in the order */
export function placeWithNeeds(l: Ladder, r: RungId, by: 'placement' | 'migration' | 'recheck', set: LadderSettings, events: LadderEvent[]): Ladder {
  let out = l
  for (const x of [...needsClosure(r), r]) {
    const s = statusOf(out, x)
    if (s === 'passed' || s === 'placed' || !isOn(x, set)) continue
    out = withRung(out, x, { status: 'placed', probation: 0, recent: '', fastRun: 0, strikes: 0, freeOn: undefined })
    events.push({ e: 'ladder', rung: x, change: 'placed', by })
  }
  return out
}

const pickFrom = (rng: Rng, r: RungId, stats: Record<string, ItemStats>, last: LastCtx): Item =>
  pickNext(rng, itemsOfRung(r), stats, { ...last, noRehearsal: true })

/** the rungs a placement probes: the offered ones, or (the migration) only the plus and minus rungs that have no switch */
export const probeList = (l: Ladder, m: PlacementMode, set: LadderSettings): RungId[] =>
  offered(l, set).filter((r) => !m.plusOnly || (rungDef(r).strand === 'plus' && rungDef(r).switch === undefined))

/** the probe of a placement: an item of the rung `at` (mapped onto the offered rungs) */
export function choosePlacement(
  l: Ladder, m: PlacementMode, ctx: { rng: Rng; set: LadderSettings; stats: Record<string, ItemStats>; last: LastCtx },
): { item: Item; ladder: Ladder } {
  const list = probeList(l, m, ctx.set)
  const at = list[positionIn(list, m.at)] ?? '1'
  return { item: pickFrom(ctx.rng, at, ctx.stats, ctx.last), ladder: at === m.at ? l : { ...l, mode: { ...m, at } } }
}

function endPlacement(l: Ladder, m: PlacementMode, set: LadderSettings, events: LadderEvent[]): Ladder {
  const before = frontier(l, set)
  let out = l
  const by = m.why === 'migration' ? 'migration' : 'placement'
  const confirmed = RUNGS.map((d) => d.id).filter((r) => m.confirmed.includes(r))
  for (const r of confirmed) out = placeWithNeeds(out, r, by, set, events)
  out = settleFrontier({ ...out, mode: { kind: 'practice' }, checkedOn: out.day }, before, set)
  events.push({ e: 'placement', phase: 'end', kind: m.why, probes: m.probes, mistakes: m.mistakes, frontier: frontier(out, set) })
  return out
}

/** One probe's answer: the walk, and the end when a stop rule holds. */
export function afterProbe(l: Ladder, m: PlacementMode, a: { mark: Mark; fast: boolean; set: LadderSettings }): Outcome {
  const events: LadderEvent[] = []
  if (m.probes === 0) {
    events.push({ e: 'placement', phase: 'start', kind: m.why, probes: 0, mistakes: 0, frontier: frontier(l, a.set) })
  }
  const list = probeList(l, m, a.set)
  if (list.length === 0) return { ladder: endPlacement(l, m, a.set, events), events }
  const top = list.length - 1
  let pos = positionIn(list, m.at)
  const at = list[pos]
  const next: PlacementMode = { ...m, probes: m.probes + 1, confirmed: [...m.confirmed], rights: { ...m.rights }, failed: [...m.failed] }
  const confirm = (r: RungId) => { if (!next.confirmed.includes(r)) next.confirmed.push(r) }
  if (a.mark === 'o') {
    next.inRow = 0
    if (a.fast) {
      confirm(at)
      pos = Math.min(top, pos + next.jump)
    } else {
      next.rights[at] = (next.rights[at] ?? 0) + 1
      next.jump = Math.max(1, Math.floor(next.jump / 2))
      if (next.rights[at]! >= CONFIRM_RIGHTS) {
        confirm(at)
        pos = Math.min(top, pos + 1)
      }
    }
  } else {
    next.mistakes += 1
    next.inRow += 1
    if (!next.failed.includes(at)) next.failed.push(at)
    next.jump = Math.max(1, Math.floor(next.jump / 2))
    pos = Math.max(0, pos - next.jump)
  }
  next.at = list[pos]
  const highest = Math.max(-1, ...next.confirmed.map((r) => list.indexOf(r)))
  const failedAt = (i: number) => list[i] !== undefined && next.failed.includes(list[i])
  // the jump is 1 and the walk is back at (or under) a confirmed rung whose rung above has failed: nothing is left to learn
  const narrowed = next.jump === 1 && (a.mark === 'o' ? pos <= highest && failedAt(pos + 1) : list.indexOf(at) <= highest + 1)
  const stop = next.inRow >= 2 || next.probes >= next.max || next.confirmed.includes(list[top]) || narrowed
  const ladder = { ...l, mode: next }
  return { ladder: stop ? endPlacement(ladder, next, a.set, events) : ladder, events }
}

// ---------- the re-check

/** the offered new rungs above the frontier, in the order */
export function recheckList(l: Ladder, set: LadderSettings): RungId[] {
  const f = frontier(l, set)
  if (f === null) return []
  const from = rungDef(f).order
  return offered(l, set).filter((r) => rungDef(r).order > from && statusOf(l, r) === 'new')
}

const recheckAt = (list: RungId[], probes: number): RungId => list[Math.min(RECHECK_AT[probes], list.length - 1)]

/** Due on a play day: RECHECK_DAYS since the last check, or RECHECK_FAST_PASSES fast passes on his last play day. */
export const recheckDue = (l: Ladder): boolean => l.day - l.checkedOn >= RECHECK_DAYS || l.fastPasses.lastDay >= RECHECK_FAST_PASSES

/** Start a re-check (nothing above the frontier: it counts as done, with no probe and no event). */
export function startRecheck(l: Ladder, set: LadderSettings): Ladder {
  const list = recheckList(l, set)
  if (list.length === 0) return { ...l, mode: { kind: 'practice' }, checkedOn: l.day, recheckDue: false }
  return { ...l, mode: { kind: 'recheck', at: recheckAt(list, 0), probes: 0 }, recheckDue: false }
}

/** the probe of a re-check */
export function chooseRecheck(
  l: Ladder, m: RecheckMode, ctx: { rng: Rng; set: LadderSettings; stats: Record<string, ItemStats>; last: LastCtx },
): { item: Item; ladder: Ladder } {
  const list = offered(l, ctx.set)
  const at = list[positionIn(list, m.at)] ?? '1'
  return { item: pickFrom(ctx.rng, at, ctx.stats, ctx.last), ladder: at === m.at ? l : { ...l, mode: { ...m, at } } }
}

/** One re-check probe: right and fast places it with its needs and goes on; anything else ends it quietly. */
export function afterRecheck(l: Ladder, m: RecheckMode, a: { mark: Mark; fast: boolean; set: LadderSettings }): Outcome {
  const events: LadderEvent[] = []
  const before = frontier(l, a.set)
  if (m.probes === 0) events.push({ e: 'placement', phase: 'start', kind: 'recheck', probes: 0, mistakes: 0, frontier: before })
  const probes = m.probes + 1
  let out = l
  let goOn = false
  if (a.mark === 'o' && a.fast) {
    out = placeWithNeeds(out, m.at, 'recheck', a.set, events)
    const list = recheckList(out, a.set)
    if (probes < RECHECK_PROBES && list.length > 0) {
      out = { ...out, mode: { kind: 'recheck', at: recheckAt(list, probes), probes } }
      goOn = true
    }
  }
  if (!goOn) {
    out = { ...out, mode: { kind: 'practice' }, checkedOn: out.day }
    events.push({ e: 'placement', phase: 'end', kind: 'recheck', probes, mistakes: a.mark === 'o' ? 0 : 1, frontier: null })
  }
  out = settleFrontier(out, before, a.set)
  const last = events[events.length - 1]
  if (!goOn && last.e === 'placement') last.frontier = frontier(out, a.set)
  return { ladder: out, events }
}
