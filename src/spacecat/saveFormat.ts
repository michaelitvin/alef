// Space Cat's save format: its key, its defaults and the light read of the chosen ship. No side effects (no store is
// created), so the home card and the parent area can read it without writing.
import type { RungId } from './logic/facts'
import type { LadderState } from './logic/ladder'
import { LADDER_START } from './logic/ladder'
import type { ItemStats } from './logic/predict'
import { SPEED_START, type FixedArrival, type SpeedState } from './logic/speed'

export const SAVE_KEY = 'alef-spacecat'

export interface Settings { range: 'auto' | RungId; times: boolean; divide: boolean; arrival: 'auto' | FixedArrival; flightMusic: boolean }

export interface SpaceCatSave {
  items: Record<string, ItemStats>
  ladder: LadderState
  speed: SpeedState
  totalPoints: number
  best: number
  ships: (1 | 2 | 3)[]
  ship: 1 | 2 | 3
  /** line id → times played */
  heard: Record<string, number>
  /** the fact of the last tallied or demo round (the next pick is never the same fact) */
  lastFact?: string
  /**
   * rounds since the last zero fact (+ 0, − 0), for "at most 1 round in 15" (predict.ts ZERO_EVERY). A fresh save starts
   * at 0, as if one had just come, so the first zero fact comes at round 15 at the earliest. Not the speed's hold after a
   * new rung: that is `speed.hold`.
   */
  sinceZero: number
  runs: number
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = { range: 'auto', times: false, divide: false, arrival: 'auto', flightMusic: false }

export const DEFAULT_SAVE: SpaceCatSave = {
  items: {}, ladder: LADDER_START, speed: SPEED_START, totalPoints: 0, best: 0, ships: [1], ship: 1, heard: {}, sinceZero: 0, runs: 0,
  settings: DEFAULT_SETTINGS,
}

/** The ship he chose, from the raw saved text (the persist wrapper's `{ state }`, or a bare save); 1 when missing or unreadable. */
export function savedShip(raw: string | null): 1 | 2 | 3 {
  if (!raw) return 1
  try {
    const j = JSON.parse(raw) as { state?: { ship?: unknown }; ship?: unknown }
    const s = j?.state?.ship ?? j?.ship
    return s === 2 || s === 3 ? s : 1
  } catch {
    return 1
  }
}
