// The parent's number range for shopping (up to 10, 100 or 1000): one setting for both paths, kept in its own key
// (`alef-range`) so the Hebrew and the English merchant use the same range. The first read seeds it once from Spell Quest's
// save (its `settings.range`, which Spell Quest's section still writes), else 100.
import { useSyncExternalStore } from 'react'
import { safeSetItem } from './saveStorage'

export type NumberRange = 10 | 100 | 1000
export const NUMBER_RANGE_KEY = 'alef-range'
const SPELLQUEST_SAVE_KEY = 'alef-duel2'
const RANGES: readonly NumberRange[] = [10, 100, 1000]
const isRange = (r: unknown): r is NumberRange => RANGES.includes(r as NumberRange)

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

function spellQuestRange(): NumberRange {
  try {
    const r = (JSON.parse(localStorage.getItem(SPELLQUEST_SAVE_KEY) ?? 'null') as { state?: { settings?: { range?: unknown } } } | null)?.state?.settings?.range
    return isRange(r) ? r : 100
  } catch { return 100 }
}

/** the range now; with no `alef-range` yet (or one that does not read), it is seeded from Spell Quest's save and stored */
export function getNumberRange(): NumberRange {
  try {
    const r = (JSON.parse(localStorage.getItem(NUMBER_RANGE_KEY) ?? 'null') as { range?: unknown } | null)?.range
    if (isRange(r)) return r
  } catch { /* no value, or a broken one: seed it */ }
  const seeded = spellQuestRange()
  safeSetItem(NUMBER_RANGE_KEY, JSON.stringify({ v: 1, range: seeded }))
  return seeded
}

export function setNumberRange(range: NumberRange) {
  safeSetItem(NUMBER_RANGE_KEY, JSON.stringify({ v: 1, range })) // storage still full: the next read falls back to the seed
  notify()
}

export function useNumberRange(): NumberRange {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l) } }, getNumberRange)
}
