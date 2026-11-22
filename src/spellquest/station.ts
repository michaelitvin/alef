// A station link from the home screen's path (spec: one duel, Part 3): `?station=<ScreenId>` opens that minigame for one
// session, but only when it is one of his open screens (a typed or stale link to a locked one opens the cover).
import type { ScreenId } from './logic/predict'
import { cycleOf, HEBREW_STAGES } from './logic/run'
import type { CourseStages } from './course/types'
import { towerMastered } from './logic/mastery'
import { TOWER_MARKS } from './tower/logic/marks'

export function stationFromUrl(search: string, open: ScreenId[]): ScreenId | null {
  const s = new URLSearchParams(search).get('station')
  return s && (open as string[]).includes(s) ? (s as ScreenId) : null
}

/**
 * His open screens, as the home's path shows them: Spell Quest counts as open once his first-duel marks are mastered, even
 * before he first opened Spell Quest (its save then moves the first duel's progress over). `stages`: the course's (the English
 * page passes its save, its tower's answers and its stages; default Hebrew).
 */
export function openScreens(save: { stage?: { stage: number }; settings?: { drawing?: boolean }; screensOpen?: boolean } | null, towerRecent: Record<string, string>,
  stages: CourseStages = HEBREW_STAGES): ScreenId[] {
  const open = !!save?.screensOpen || towerMastered(towerRecent, TOWER_MARKS.map((m) => m.id))
  return cycleOf(save?.stage?.stage ?? 1, save?.settings?.drawing ?? true, open, stages)
}
