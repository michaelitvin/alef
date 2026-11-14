// Book 2's save format: its defaults and the conversion of older saves (migrateSave). Kept apart from the store, with
// no side effects, so that the alef home screen can read his save the way Book 2 will see it without creating (and so
// writing) the store.
import type { Duel2Save, Duel2Settings, MerchantSave } from './store'

/** the save's version: raise it when a save must be converted, and convert older saves in migrateSave */
export const SAVE_VERSION = 7

export const FRESH_MERCHANT: MerchantSave = {
  visits: 0, purchases: 0, declines: 0, short: 0, over: 0, hints: 0, level: 0, demoSeen: false, undoShown: false, cleanRow: 0, hintRow: 0,
}

/** checkpointsSinceVisit before his first visit (JSON cannot keep Infinity) */
export const NEVER_VISITED = 999

export const DEFAULT_SETTINGS: Duel2Settings = { sfx: true, music: true, volume: 0.8, drawing: true, range: 100 }

/** the review marks to clear in version 2: the letters whose strokes changed after the parent's review (2026-11-07) */
/** version 3: the letters changed after the second review */
export const STROKES_CHANGED_V3 = [...'בדחטכמםצקרגזוץף'].map((l) => `${l}-hand`)
/** version 4: the letters changed after the third review */
export const STROKES_CHANGED_V4 = [...'הזמ'].map((l) => `${l}-print`).concat([...'םרכדחמ'].map((l) => `${l}-hand`))
export const STROKES_CHANGED_V2 = [...'הזמנץק'].map((l) => `${l}-print`).concat([...'אבגדוילןצץףר'].map((l) => `${l}-hand`))

/** the old rule, a coin for every this many stars: kept only for the version-5 migration (his coins become a balance) */
export const COIN_EVERY = 10
export const coinsOf = (stars: number) => Math.floor((stars ?? 0) / COIN_EVERY)

/**
 * Converts an older save, step by step (each step runs for every save older than it; no early return). Version 2: the
 * stroke data of some letters changed after the parent's review, so their review marks are cleared (they show as
 * unchecked again); every other mark stays. Versions 3 and 4: the same for the letters changed after the second and the
 * third review. Version 5 (one duel): his coins (one for each 10 stars) become a balance, and drawing turns on for every
 * save (saves carry an explicit `drawing: false`; the parent can turn it off again). Version 6 (the merchant): the
 * shopping range (100) and the merchant's counters, where missing. Version 7 (the first duel in the run): every stored
 * save keeps Book 2 open; the first duel's progress is imported once, at the next start (importFirstDuel).
 */
export function migrateSave(state: unknown, version: number): Partial<Duel2Save> & { settings: Duel2Settings } {
  let s = { ...((state ?? {}) as Partial<Duel2Save>) }
  if (version < 4 && s.strokeMarks) {
    const m = { ...s.strokeMarks }
    const cleared = [...(version < 2 ? STROKES_CHANGED_V2 : []), ...(version < 3 ? STROKES_CHANGED_V3 : []), ...STROKES_CHANGED_V4]
    for (const k of cleared) delete m[k]
    s = { ...s, strokeMarks: m }
  }
  if (version < 5) s = { ...s, coins: coinsOf(s.totalStars ?? 0), settings: { ...DEFAULT_SETTINGS, ...s.settings, drawing: true } }
  if (version < 6) {
    s = {
      ...s, settings: { ...DEFAULT_SETTINGS, ...s.settings, range: s.settings?.range ?? 100 },
      merchant: { ...FRESH_MERCHANT, ...s.merchant }, checkpointsSinceVisit: s.checkpointsSinceVisit ?? NEVER_VISITED,
    }
  }
  // a Book 2 save is at stage 1 or above: stage 0 has passed, nothing of Book 2 closes (a missing stage reads as 1)
  if (version < 7) s = { ...s, bookOpen: (s.stage?.stage ?? 1) >= 1 }
  return s as Partial<Duel2Save> & { settings: Duel2Settings }
}
