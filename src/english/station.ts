// What the English home reads of the save about its stations: which are open and how they are rated. Light on purpose
// (it reads the save as it is, `readEnglishSave`; no store, audio or telemetry). A parent action never closes a station
// or lowers a rating: the open ones only grow, and the ratings come from his recent answers, which no parent action
// touches.
import type { ScreenId } from '../duel2/logic/predict'
import { rating, screenRecent } from '../duel2/logic/mastery'
import { EN_DRAWING, EN_MAX_STAGE, EN_ORDER, enScreensOfStage } from './logic/stages'
import { readEnglishSave, type EnglishSave } from './saveFormat'

/** whether the doors can be played at a stage (the course's filter, `enDoorsPlayable`: it needs the picture files, so the caller passes it) */
export type DoorsPlayable = (stage: number) => boolean

/** the stations of the stages up to `stage` (the drawing only while it is on; the doors only where they can be played), in path order */
export function stationsUpTo(stage: number, drawing: boolean, doorsPlayable: DoorsPlayable): ScreenId[] {
  const up = Math.min(Math.max(Math.floor(stage) || 1, 1), EN_MAX_STAGE)
  const out = new Set<ScreenId>()
  for (let s = 1; s <= up; s++) for (const id of enScreensOfStage(s)) if (id !== 'doors' || doorsPlayable(s)) out.add(id)
  return EN_ORDER.filter((id) => out.has(id) && (drawing || !EN_DRAWING.includes(id)))
}

/** the stations his stage can play now (the course's cycle without the tower's rule): what a station link can open */
export function englishPlayableStations(save: Partial<EnglishSave> | null, doorsPlayable: DoorsPlayable): ScreenId[] {
  return stationsUpTo(save?.stage?.stage ?? 1, save?.settings?.drawing ?? true, doorsPlayable)
}

/**
 * His open stations, the one list the home reads: the ones he has opened (the placement, the parent's start stage and
 * `Level.start` save `stationsUpTo`, so they are filtered the same way) and the ones his stage plays now; in path order.
 * A station opened earlier stays open when the parent lowers the stage; its link then opens the cover (the cycle at his
 * stage does not play it), see `englishPlayableStations`.
 */
export function englishOpenStations(save: Partial<EnglishSave> | null, doorsPlayable: DoorsPlayable): ScreenId[] {
  const open = new Set<ScreenId>([...(save?.openedStations ?? []), ...englishPlayableStations(save, doorsPlayable)])
  return EN_ORDER.filter((id) => open.has(id))
}

/** each station's 0–3 rating from his recent answers there (the tower's are the English tower's marks, joined) */
export function englishStationRatings(save: Partial<EnglishSave> | null = readEnglishSave()): Partial<Record<ScreenId, 0 | 1 | 2 | 3>> {
  return Object.fromEntries(EN_ORDER.map((id) => [id, rating(screenRecent(id, save?.recent ?? {}, save?.tower?.recent ?? {}))]))
}
