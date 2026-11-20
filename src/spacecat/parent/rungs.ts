// The ladder's rungs as the parent reads them, and his share of right answers per rung, from the saved item stats. No
// store or audio module: the light parent index (the Progress section's detail list) uses it too.
import { itemById } from '../logic/facts'
import { oldRungOf, type RungId } from '../logic/ladder'
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
