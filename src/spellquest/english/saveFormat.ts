// English Spell Quest's save format (localStorage 'alef-spellquest-en'): its types, its fresh values and a light reader. Kept apart
// from the store, with no side effects, so that the alef home and the parent index can read the save without creating (and
// so writing) the store. It never reads or writes Spell Quest's save (alef-spellquest-he): English Spell Quest has its own purse.
import { readSaveValue } from '../../shared/keyMigration'
import { SPELLQUEST_EN_SAVE_KEY } from '../../shared/saveKeys'
import type { SpellQuestSave, SpellQuestSettings } from '../store'
import { DEFAULT_SETTINGS, renameSpellQuestFieldsV8 } from '../saveFormat'
import type { ScreenId } from '../logic/predict'
import type { TowerTallies } from '../tower/logic/tallies'
import type { PlacementState } from './logic/placement'

export const ENGLISH_SAVE_KEY = SPELLQUEST_EN_SAVE_KEY
/** the save's version: raise it when a save must be converted */
export const ENGLISH_SAVE_VERSION = 2

/** Version 2 (Spell Quest rename): `bookOpen` is now `screensOpen`, `firstDuelImported` is now `towerImported`. */
export const renameEnglishFieldsV2 = <T>(state: T): T => renameSpellQuestFieldsV8(state)

/** converts an older English save, step by step */
export function migrateEnglishSave(state: unknown, version: number): unknown {
  return version < 2 ? renameEnglishFieldsV2((state ?? {}) as object) : state
}

export type EnglishSettings = SpellQuestSettings & {
  /** English Spell Quest is on (the parent can turn it off) */
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

export type EnglishSave = Omit<SpellQuestSave, 'settings'> & {
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

/** the English save's own fields beyond Spell Quest's */
export type EnglishFields = Omit<EnglishSave, keyof SpellQuestSave> & { settings: EnglishSettings }

/** a fresh English save, over a fresh Spell Quest save: no coins, the book open, stage 1, no placement yet */
export const ENGLISH_FRESH: Partial<SpellQuestSave> & EnglishFields = {
  coins: 0,
  screensOpen: true,
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
    const raw = readSaveValue(localStorage, ENGLISH_SAVE_KEY) // the old key while the save's move waits
    if (!raw) return null
    const p = JSON.parse(raw) as { state?: unknown; version?: unknown }
    const s = p?.state
    if (!s || typeof s !== 'object') return null
    return migrateEnglishSave(s, typeof p.version === 'number' ? p.version : 0) as Partial<EnglishSave>
  } catch {
    return null
  }
}
