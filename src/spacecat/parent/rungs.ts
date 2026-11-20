// His share of right answers per rung, from the saved item stats. No store or audio module: the light parent index (the
// Progress section's detail list) uses it too.
import { itemById } from '../logic/facts'
import type { RungId } from '../logic/rungs'
import type { ItemStats } from '../logic/predict'

/** the tallied answers of a rung: seen, and right (neither wrong nor a time-out) */
export interface RungTally { seen: number; right: number }

export function rungTallies(items: Record<string, ItemStats | undefined>): Map<RungId, RungTally> {
  const out = new Map<RungId, RungTally>()
  for (const [id, st] of Object.entries(items)) {
    const it = itemById(id)
    if (!it || !st) continue
    const t = out.get(it.rung) ?? { seen: 0, right: 0 }
    t.seen += st.seen ?? 0
    t.right += (st.seen ?? 0) - (st.wrong ?? 0) - (st.timeout ?? 0)
    out.set(it.rung, t)
  }
  return out
}

/** `85% of 40` */
export const shareText = (t: RungTally | undefined) => (t && t.seen ? `${Math.round((t.right / t.seen) * 100)}% of ${t.seen}` : '—')
