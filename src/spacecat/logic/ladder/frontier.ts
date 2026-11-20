// Which rungs are on, offered and done, and the frontier: the rung he works on now (the design's *Practice at the
// frontier* and *The parent's range and switches*).
import { RUNGS, rungDef, type RungId } from '../rungs'
import { statusOf, type Ladder, type LadderSettings } from './state'

/** On: its switch is on (no switch: on); a divide rung needs times on too (divide has no tables without times). */
export function isOn(r: RungId, set: LadderSettings): boolean {
  const sw = rungDef(r).switch
  if (sw === undefined) return true
  return set[sw] && (sw !== 'divide' || set.times)
}

/** In range: the range is automatic, or the rung comes no later in the order than the range's rung. */
export const inRange = (r: RungId, set: LadderSettings): boolean => set.range === 'auto' || rungDef(r).order <= rungDef(set.range).order

/** Offered: on, in range and not held, in the order. */
export function offered(l: Ladder, set: LadderSettings): RungId[] {
  return RUNGS.filter((d) => isOn(d.id, set) && inRange(d.id, set) && statusOf(l, d.id) !== 'held').map((d) => d.id)
}

/** passed or placed: an earned rung, whose items come back as review */
export const isEarned = (l: Ladder, r: RungId): boolean => {
  const s = statusOf(l, r)
  return s === 'passed' || s === 'placed'
}

/** Done for the needs of other rungs: earned, or switched off (a switch never blocks another strand). */
export const isDone = (l: Ladder, r: RungId, set: LadderSettings): boolean => isEarned(l, r) || !isOn(r, set)

/** The lowest offered new rung whose needs are all done; null if none. */
export function frontier(l: Ladder, set: LadderSettings): RungId | null {
  for (const r of offered(l, set)) {
    if (statusOf(l, r) === 'new' && rungDef(r).needs.every((n) => isDone(l, n, set))) return r
  }
  return null
}

/** the earned offered rungs, in the order */
export const earnedOffered = (l: Ladder, set: LadderSettings): RungId[] => offered(l, set).filter((r) => isEarned(l, r))

/** r's needs and theirs, down to rung 1, in the order (r itself not included) */
export function needsClosure(r: RungId): RungId[] {
  const seen = new Set<RungId>()
  const walk = (x: RungId) => {
    for (const n of rungDef(x).needs) {
      if (!seen.has(n)) {
        seen.add(n)
        walk(n)
      }
    }
  }
  walk(r)
  return RUNGS.filter((d) => seen.has(d.id)).map((d) => d.id)
}

/** What the parent area says of a rung. */
export function statusText(
  l: Ladder, r: RungId, set: LadderSettings,
): 'not yet' | 'working on now' | 'passed' | 'placed' | 'held' | 'switched off' | 'above the range' {
  if (!isOn(r, set)) return 'switched off'
  if (!inRange(r, set)) return 'above the range'
  const s = statusOf(l, r)
  if (s !== 'new') return s
  return frontier(l, set) === r ? 'working on now' : 'not yet'
}
