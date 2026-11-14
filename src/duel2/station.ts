// A station link from the home screen's path (spec: one duel, Part 3): `?station=<ScreenId>` opens that minigame for one
// session, but only when it is one of his open screens (a typed or stale link to a locked one opens the cover).
import type { ScreenId } from './logic/predict'
import { cycleOf } from './logic/run'
import { towerMastered } from './logic/mastery'
import { DUEL_MARKS } from '../utils/duel/marks'
import type { Stage } from './logic/content'

export function stationFromUrl(search: string, open: ScreenId[]): ScreenId | null {
  const s = new URLSearchParams(search).get('station')
  return s && (open as string[]).includes(s) ? (s as ScreenId) : null
}

/**
 * His open screens, as the home's path shows them: Book 2 counts as open once his first-duel marks are mastered, even
 * before he first opened Book 2 (its save then moves the first duel's progress over).
 */
export function openScreens(save: { stage?: { stage: Stage }; settings?: { drawing?: boolean }; bookOpen?: boolean } | null, duelRecent: Record<string, string>): ScreenId[] {
  const open = !!save?.bookOpen || towerMastered(duelRecent, DUEL_MARKS.map((m) => m.id))
  return cycleOf(save?.stage?.stage ?? 1, save?.settings?.drawing ?? true, open)
}
