// The English path's save format (localStorage 'alef-english'): its types, its fresh values and a light reader. Kept apart
// from the store, with no side effects, so that the alef home and the parent index can read the save without creating (and
// so writing) the store. It never reads or writes Book 2's save (alef-duel2): the English path has its own purse.
import type { Duel2Save, Duel2Settings } from '../spellquest/store'
import { DEFAULT_SETTINGS } from '../spellquest/saveFormat'
import type { ScreenId } from '../spellquest/logic/predict'
import type { TowerTallies } from '../utils/duel/tallies'
import type { PlacementState } from './logic/placement'

export const ENGLISH_SAVE_KEY = 'alef-english'
/** the save's version: raise it when a save must be converted */
export const ENGLISH_SAVE_VERSION = 1

export type EnglishSettings = Duel2Settings & {
  /** the English path is on (the parent can turn it off) */
  path: boolean
}

/** a new unit's or heart word's introduction: asked once before it, then the next answers decide */
export interface IntroState { asked: number; skipped: boolean; after: string; known: boolean }

/**
 * The placement: running (`state`), asked again by the parent (`requested`), or done (`done`). It is due when
 * `requested || state !== null || done === null` (a re-run sets `requested`, so it never looks like a finished one).
 */
export interface PlacementSave {
  state: PlacementState | null
  requested: boolean
  done: { level: number; answers: number; at: number } | null
  runs: number
}

export type EnglishSave = Omit<Duel2Save, 'settings'> & {
  settings: EnglishSettings
  placement: PlacementSave
  /** the English tower's answers (the first duel's board): never the lessons' save */
  tower: TowerTallies
  introSeen: Record<string, IntroState>
  /** the stations he has opened: it only grows */
  openedStations: ScreenId[]
  /** the words of his last run */
  lastRunWords: string[]
}

/** the English save's own fields beyond Book 2's */
export type EnglishFields = Omit<EnglishSave, keyof Duel2Save> & { settings: EnglishSettings }

/** a fresh English save, over a fresh Book 2 save: no coins, the book open, stage 1, no placement yet */
export const ENGLISH_FRESH: Partial<Duel2Save> & EnglishFields = {
  coins: 0,
  bookOpen: true,
  stage: { stage: 1, newAnswers: '' },
  settings: { ...DEFAULT_SETTINGS, path: true },
  placement: { state: null, requested: false, done: null, runs: 0 },
  tower: { byMark: {}, confusions: {}, recent: {}, pace: 1 },
  introSeen: {},
  openedStations: [],
  lastRunWords: [],
}

/** the English save, read only (null when he has none, or it cannot be read) */
export function readEnglishSave(): Partial<EnglishSave> | null {
  try {
    const raw = localStorage.getItem(ENGLISH_SAVE_KEY)
    if (!raw) return null
    const s = (JSON.parse(raw) as { state?: unknown })?.state
    return s && typeof s === 'object' ? s as Partial<EnglishSave> : null
  } catch {
    return null
  }
}
