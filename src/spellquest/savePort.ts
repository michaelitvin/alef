// What the run (controller.ts) reads from and writes to the saves: Spell Quest's save, and the tower's recent answers
// (the lessons' save holds them). A seam: the game writes the real saves, the gallery reads them and writes nothing, and a
// test runs on a save in memory.
import { createStore, type StoreApi } from 'zustand/vanilla'
import { spellQuestState, useSpellQuestStore, type SpellQuestActions, type SpellQuestSave } from './store'
import { useProgressStore } from '../stores/progressStore'
import { getNumberRange, type NumberRange } from '../shared/numberRange'

/** the save's actions the run calls */
const WRITES = [
  'recordAnswer', 'setPace', 'endRun', 'addStar', 'addCoins', 'spendCoins', 'markBossBeaten', 'setLastBoss', 'markBossNewHeard',
  'notePraise', 'addCrystal', 'markDemo', 'markDotIntro', 'noteDrawRound', 'noteMerchant', 'setMerchantFlag', 'merchantPaid',
  'noteCheckpoint', 'noteTowerVisit', 'setTowerWave', 'oweMonsters', 'monsterIntroduced', 'noteTowerAnswer', 'markScreensOpen', 'nextCycle', 'noteBroomSession',
] as const satisfies readonly (keyof SpellQuestActions)[]
type SaveWrites = Pick<SpellQuestActions, (typeof WRITES)[number]>

export interface SavePort extends SaveWrites {
  /** Spell Quest's save as it is now (a snapshot: it does not change after a write; read again) */
  read(): Readonly<SpellQuestSave>
  /** the tower's recent answers per mark (o / x, newest last) */
  towerRecent(): Readonly<Record<string, string>>
  /** the parent's number range for shopping (one setting for both paths, never read from a save's own settings) */
  range(): NumberRange
}

type AnyFn = (...a: unknown[]) => unknown

/** the port over a run's store (Spell Quest's, or another course's with more fields) */
export function portOver<S extends SpellQuestSave & SpellQuestActions>(store: StoreApi<S>, towerRecent: () => Record<string, string>, range: () => NumberRange): SavePort {
  const writes = Object.fromEntries(WRITES.map((k) => [k, (...a: unknown[]) => (store.getState()[k] as AnyFn)(...a)])) as unknown as SaveWrites
  return { ...writes, read: () => store.getState(), towerRecent, range }
}

/** the real saves: Spell Quest's store (`alef-spellquest`) and the lessons' store, where the tower keeps its answers */
export const storeSavePort: SavePort = portOver(useSpellQuestStore, () => useProgressStore.getState().tower?.recent ?? {}, getNumberRange)

/** a save in memory (tests): a fresh save with `initial` over it; the writes work as in the real save */
export function memorySavePort(initial: Partial<SpellQuestSave> = {}, towerRecent: Record<string, string> = {}): SavePort {
  const store = createStore<SpellQuestSave & SpellQuestActions>()(spellQuestState)
  store.setState(initial)
  // a test sets the range in the save's settings, as Spell Quest's save did
  return portOver(store, () => towerRecent, () => store.getState().settings.range ?? 100)
}

/**
 * Reads `base` and writes nothing (the gallery: the parent previews a screen, and his progress stays as it is). An answer
 * never passes a stage, and a payment is never taken.
 */
export function readOnlySavePort(base: SavePort): SavePort {
  const writes = Object.fromEntries(WRITES.map((k) => [k, () => undefined])) as unknown as SaveWrites
  return { ...writes, recordAnswer: () => ({ passed: false }), spendCoins: () => false, read: base.read, towerRecent: base.towerRecent, range: base.range }
}
