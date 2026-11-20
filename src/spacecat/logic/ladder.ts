// Which rungs of the ladder are open: the child opens them by answering, the parent can fix a range and switch times
// and divide on. Pure functions over a small state.
import { RECENT_KEEP } from '../../shared/adaptive'
import { itemsOfRung, type Item } from './facts'
import type { Mark } from './predict'
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

/** the next rung opens after this many answers on the top rung with at most this many mistakes (a time-out is half one) */
export const OPEN_WINDOW = 12, OPEN_MAX_MISTAKES = 2
/** or after this many right answers in a row on the top rung with no mistake at all */
export const FAST_START_STREAK = 4

export interface LadderState {
  top: RungId
  /** marks on items of the top rung */
  topRecent: string
  topMistake: boolean
  streak: number
}
export interface LadderSettings { range: 'auto' | RungId; times: boolean; divide: boolean }

export const LADDER_START: LadderState = { top: 1, topRecent: '', topMistake: false, streak: 0 }

const allowed = (r: RungId, set: LadderSettings): boolean => {
  const needs = RUNGS[r - 1].needs
  return needs === undefined || (needs === 'times' ? set.times : set.divide)
}

/** The rungs he gets sums from: 1 up to the top (auto) or up to the parent's range, minus those whose switch is off. */
export function openRungs(s: LadderState, set: LadderSettings): RungId[] {
  const upTo = set.range === 'auto' ? s.top : set.range
  return RUNGS.filter((r) => r.id <= upTo && allowed(r.id, set)).map((r) => r.id)
}

export function candidates(s: LadderState, set: LadderSettings): Item[] {
  return openRungs(s, set).flatMap(itemsOfOldRung)
}

const mistakesIn = (recent: string) => [...recent].reduce((n, m) => n + (m === 'x' ? 1 : m === 't' ? 0.5 : 0), 0)

export function afterAnswer(s: LadderState, it: Item, m: Mark, set: LadderSettings): { state: LadderState; opened?: RungId } {
  if (oldRungOf(it) !== s.top) return { state: s }
  const state: LadderState = {
    top: s.top,
    topRecent: (s.topRecent + m).slice(-RECENT_KEEP),
    topMistake: s.topMistake || m !== 'o',
    streak: m === 'o' ? s.streak + 1 : 0,
  }
  const next = (s.top + 1) as RungId
  const canOpen = s.top < 9 && set.range === 'auto' && allowed(next, set)
  const byWindow = state.topRecent.length >= OPEN_WINDOW && mistakesIn(state.topRecent) <= OPEN_MAX_MISTAKES
  const byStreak = !state.topMistake && state.streak >= FAST_START_STREAK
  if (canOpen && (byWindow || byStreak)) return { state: { top: next, topRecent: '', topMistake: false, streak: 0 }, opened: next }
  return { state }
}
