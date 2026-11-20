// Which rungs of the ladder are open: the child opens them by answering, the parent can fix a range and switch times
// and divide on. Pure functions over a small state.
import { itemsOfRung, type Item } from './facts'
import type { RungId as NewRung } from './rungs'

/**
 * The first design's nine rungs. TEMPORARY ADAPTER: the longer ladder (logic/ladder/, a later task) replaces this file.
 * Until then the old ladder keeps its own numbers 1 to 9 and plays the sums of the new rungs that stand for each.
 */
export type RungId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

/** rungs 7 and 8 need the parent's times switch, rung 9 the divide switch */
export const RUNGS: { id: RungId; needs?: 'times' | 'divide' }[] = [
  { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 },
  { id: 7, needs: 'times' }, { id: 8, needs: 'times' }, { id: 9, needs: 'divide' },
]

/** the new rungs behind each old one (rung 4 also takes the new rung 12's items within 10) */
const OLD_SETS: Record<RungId, NewRung[]> = {
  1: ['1'], 2: ['3'], 3: ['2', '5'], 4: ['4', '6', '12'], 5: ['7'], 6: ['9', '10', '11'], 7: ['T2', 'T3'], 8: ['T5'], 9: ['T4b', 'T6'],
}

/** the old rung of an item, if the old ladder offers it */
export function oldRungOf(it: Item): RungId | undefined {
  if (it.kind !== 'sum' || it.variant) return undefined
  for (const r of RUNGS) {
    if (!OLD_SETS[r.id].includes(it.rung)) continue
    if (it.rung === '12' && Math.max(it.a, it.b, it.c) > 10) return undefined
    return r.id
  }
  return undefined
}

const oldItems = new Map<RungId, Item[]>()
/** the sums of an old rung */
export function itemsOfOldRung(r: RungId): Item[] {
  let items = oldItems.get(r)
  if (!items) {
    items = OLD_SETS[r].flatMap(itemsOfRung).filter((i) => oldRungOf(i) === r)
    oldItems.set(r, items)
  }
  return items
}
