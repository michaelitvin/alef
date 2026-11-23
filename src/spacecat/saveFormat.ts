// Space Cat's save format: its key, its defaults and the light read of the chosen ship. No side effects (no store is
// created), so the home card and the parent area can read it without writing.
import { LADDER_START, type Ladder, type LadderSettings } from './logic/ladder/state'
import type { Rehearsal } from './logic/spacing'
import type { ItemStats } from './logic/predict'
import type { Band } from './logic/rungs'
import { SPEED_START, type FixedArrival, type SpeedState } from './logic/speed'

export const SAVE_KEY = 'alef-spacecat'
export const SAVE_VERSION = 2

export interface Settings extends LadderSettings { arrival: 'auto' | FixedArrival; flightMusic: boolean }

export interface SpaceCatSave {
  items: Record<string, ItemStats>
  ladder: Ladder
  /** the unseen speed adaptation, one state per band; the small band always exists */
  speed: { small: SpeedState } & Partial<Record<Band, SpeedState>>
  totalPoints: number
  best: number
  ships: (1 | 2 | 3)[]
  ship: 1 | 2 | 3
  /** line id → times played */
  heard: Record<string, number>
  /** the fact of the last tallied or demo round (the next pick is never the same fact) */
  lastFact?: string
  /** the facts of the last rounds, newest last (logic/spacing.ts RECENT_FACTS); a save from before it loads as empty */
  recentFacts: string[]
  /** the mistakes that wait to come back, oldest first (spacing.ts) */
  rehearsals: Rehearsal[]
  /** the rounds recorded so far: the clock of the rehearsals */
  roundNo: number
  /**
   * rounds since the last rare fact (+ 0, − 0, × 0, × 1, ÷ 1), for "at most 1 round in 15" (predict.ts ZERO_EVERY). A
   * fresh save starts at 0, as if one had just come. Not the speed's hold after a new rung: that is `speed[band].hold`.
   */
  sinceZero: number
  runs: number
  settings: Settings
  /** the intros' counters of one play day (`day` is the ladder's play-day counter they were counted on) */
  intro: { day: number; mistakes: Record<string, number>; again: string[] }
}

/** every switch on, the range automatic, the arrival time automatic */
export const DEFAULT_SETTINGS: Settings = {
  range: 'auto', compare: true, jumps: true, times: true, divide: true, missing100: true, hundreds: true, arrival: 'auto', flightMusic: false,
}

export const DEFAULT_INTRO: SpaceCatSave['intro'] = { day: 0, mistakes: {}, again: [] }

export const DEFAULT_SAVE: SpaceCatSave = {
  items: {}, ladder: LADDER_START, speed: { small: SPEED_START }, totalPoints: 0, best: 0, ships: [1], ship: 1, heard: {}, sinceZero: 0, recentFacts: [], rehearsals: [], roundNo: 0, runs: 0,
  settings: DEFAULT_SETTINGS, intro: DEFAULT_INTRO,
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
