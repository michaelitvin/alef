// The ladder's rungs as the parent reads them, and his share of right answers per rung, from the saved item stats. No
// store or audio module: the light parent index (the Progress section's detail list) uses it too.
import { itemById } from '../logic/facts'
import { oldRungOf, RUNGS, type RungId } from '../logic/ladder'
import type { Ladder } from '../logic/ladder/state'
import { RANGE_V1 } from '../migrate'
import type { Settings } from '../saveFormat'
import type { ItemStats } from '../logic/predict'

export const RUNG_NAME: Record<RungId, string> = {
  1: 'plus, sums to 5', 2: 'plus, sums 6 to 10', 3: 'minus within 10', 4: 'missing number, plus and minus within 10',
  5: 'plus and minus to 20, no crossing of ten', 6: 'plus and minus to 20, crossing ten', 7: 'times, tables to 5',
  8: 'times, tables to 10', 9: 'divide, from the open tables',
}

/** the tallied answers of a rung: seen, and right (neither wrong nor a time-out) */
export interface RungTally { seen: number; right: number }

export function rungTallies(items: Record<string, ItemStats | undefined>): Map<RungId, RungTally> {
  const out = new Map<RungId, RungTally>()
  for (const [id, st] of Object.entries(items)) {
    const it = itemById(id)
    if (!it || !st) continue
    const rung = oldRungOf(it)
    if (rung === undefined) continue
    const t = out.get(rung) ?? { seen: 0, right: 0 }
    t.seen += st.seen ?? 0
    t.right += (st.seen ?? 0) - (st.wrong ?? 0) - (st.timeout ?? 0)
    out.set(rung, t)
  }
  return out
}

/** `85% of 40` */
export const shareText = (t: RungTally | undefined) => (t && t.seen ? `${Math.round((t.right / t.seen) * 100)}% of ${t.seen}` : '—')

// TEMPORARY (the parent area's rewrite replaces it): the old nine-rung view of the new ladder.
const earned = (l: Ladder, n: number) => ['passed', 'placed'].includes(l.rungs[RANGE_V1[n]]?.status ?? 'new')
/** the old rung he works on: one above the highest old rung whose last new rung is earned */
export const oldTopOf = (l: Ladder): RungId => {
  let top = 0
  for (const r of RUNGS) if (earned(l, r.id)) top = r.id
  return Math.min(9, top + 1) as RungId
}
/** the old number a range stands for (the range's new rung is the old rung's last one) */
export const oldRangeOf = (range: Settings['range']): RungId | 'auto' =>
  range === 'auto' ? 'auto' : (RUNGS.find((r) => RANGE_V1[r.id] === range)?.id ?? 'auto')
/** the old rungs he gets sums from: up to the top (auto) or the range, minus those whose switch is off */
export function openOldRungs(l: Ladder, set: Settings): RungId[] {
  const range = oldRangeOf(set.range)
  const upTo = range === 'auto' ? oldTopOf(l) : range
  return RUNGS.filter((r) => r.id <= upTo && (r.needs === undefined || set[r.needs])).map((r) => r.id)
}
