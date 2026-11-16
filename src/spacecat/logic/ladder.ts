// Which rungs of the ladder are open: the child opens them by answering, the parent can fix a range and switch times
// and divide on. Pure functions over a small state.
import { RECENT_KEEP } from '../../shared/adaptive'
import { RUNGS, itemsOfRung, type Item, type RungId } from './facts'
import type { Mark } from './predict'

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
  return openRungs(s, set).flatMap(itemsOfRung)
}

const mistakesIn = (recent: string) => [...recent].reduce((n, m) => n + (m === 'x' ? 1 : m === 't' ? 0.5 : 0), 0)

export function afterAnswer(s: LadderState, it: Item, m: Mark, set: LadderSettings): { state: LadderState; opened?: RungId } {
  if (it.rung !== s.top) return { state: s }
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
