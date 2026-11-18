// What the run (controller.ts) reads from and writes to the saves: Book 2's save, and the first duel's recent answers
// (the lessons' save holds them). A seam: the game writes the real saves, the gallery reads them and writes nothing, and a
// test runs on a save in memory.
import { createStore, type StoreApi } from 'zustand/vanilla'
import { duel2State, useDuel2Store, type Duel2Actions, type Duel2Save } from './store'
import { useProgressStore } from '../stores/progressStore'

/** the save's actions the run calls */
const WRITES = [
  'recordAnswer', 'setPace', 'endRun', 'addStar', 'addCoins', 'spendCoins', 'markBossBeaten', 'setLastBoss', 'markBossNewHeard',
  'notePraise', 'addCrystal', 'markDemo', 'markDotIntro', 'noteDrawRound', 'noteMerchant', 'setMerchantFlag', 'merchantPaid',
  'noteCheckpoint', 'noteTowerVisit', 'setTowerWave', 'oweMonsters', 'monsterIntroduced', 'noteTowerAnswer', 'openBook', 'nextCycle', 'noteBroomSession',
] as const satisfies readonly (keyof Duel2Actions)[]
type SaveWrites = Pick<Duel2Actions, (typeof WRITES)[number]>

export interface SavePort extends SaveWrites {
  /** Book 2's save as it is now (a snapshot: it does not change after a write; read again) */
  read(): Readonly<Duel2Save>
  /** the first duel's recent answers per mark (o / x, newest last) */
  firstDuelRecent(): Readonly<Record<string, string>>
}

type AnyFn = (...a: unknown[]) => unknown

function portOver(store: StoreApi<Duel2Save & Duel2Actions>, firstDuelRecent: () => Record<string, string>): SavePort {
  const writes = Object.fromEntries(WRITES.map((k) => [k, (...a: unknown[]) => (store.getState()[k] as AnyFn)(...a)])) as unknown as SaveWrites
  return { ...writes, read: () => store.getState(), firstDuelRecent }
}

/** the real saves: Book 2's store (`alef-duel2`) and the lessons' store, where the first duel keeps its answers */
export const storeSavePort: SavePort = portOver(useDuel2Store, () => useProgressStore.getState().duel?.recent ?? {})

/** a save in memory (tests): a fresh save with `initial` over it; the writes work as in the real save */
export function memorySavePort(initial: Partial<Duel2Save> = {}, firstDuelRecent: Record<string, string> = {}): SavePort {
  const store = createStore<Duel2Save & Duel2Actions>()(duel2State)
  store.setState(initial)
  return portOver(store, () => firstDuelRecent)
}

/**
 * Reads `base` and writes nothing (the gallery: the parent previews a screen, and his progress stays as it is). An answer
 * never passes a stage, and a payment is never taken.
 */
export function readOnlySavePort(base: SavePort): SavePort {
  const writes = Object.fromEntries(WRITES.map((k) => [k, () => undefined])) as unknown as SaveWrites
  return { ...writes, recordAnswer: () => ({ passed: false }), spendCoins: () => false, read: base.read, firstDuelRecent: base.firstDuelRecent }
}
