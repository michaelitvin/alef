// Space Cat's own save (localStorage 'alef-spacecat'); reset never touches alef's progress.
import { create, type StateCreator } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { RECENT_KEEP } from '../shared/adaptive'
import { rehydrateOnRestore } from '../shared/rehydrateOnRestore'
import { isZeroFact, type Item, type RungId } from './logic/facts'
import { afterAnswer } from './logic/ladder'
import type { ItemStats, Mark } from './logic/predict'
import { pushMark } from './logic/predict'
import type { RoundResult } from './logic/round'
import { shipsReached } from './logic/run'
import { afterRound } from './logic/speed'
import { DEFAULT_SAVE, SAVE_KEY, type Settings, type SpaceCatSave } from './saveFormat'

export { DEFAULT_SAVE, DEFAULT_SETTINGS, SAVE_KEY } from './saveFormat'

export interface Actions {
  /** One finished round. A demo or a cut round changes no tally, ladder or speed. */
  recordRound: (it: Item, res: RoundResult, opts?: { demo?: boolean; cut?: boolean }) => { opened?: RungId }
  endRun: (points: number) => { newBest: boolean }
  /** the ships that reaching this level unlocks; returns the new ones */
  unlockShips: (level: number) => (2 | 3)[]
  chooseShip: (n: 1 | 2 | 3) => void
  markHeard: (id: string) => void
  setSettings: (p: Partial<Settings>) => void
  reset: () => void
}

const markOf = (r: RoundResult['result']): Mark => (r === 'right' ? 'o' : r === 'wrong' ? 'x' : 't')

export type SpaceCatState = SpaceCatSave & Actions

/** the state and its actions, shared by the persisted store and the in-memory one of the tests (savePort.ts) */
export const spaceCatCreator: StateCreator<SpaceCatState> = (set, get) => ({
      ...DEFAULT_SAVE,
      recordRound: (it, res, opts) => {
        if (opts?.demo || opts?.cut) return {}
        const s = get()
        const m = markOf(res.result)
        const old: ItemStats = s.items[it.id] ?? { seen: 0, wrong: 0, timeout: 0, recent: '', times: [], picks: {} }
        const picks = res.result === 'wrong' ? { ...old.picks, [String(res.number)]: (old.picks[String(res.number)] ?? 0) + 1 } : old.picks
        const stat: ItemStats = {
          seen: old.seen + 1, wrong: old.wrong + (m === 'x' ? 1 : 0), timeout: old.timeout + (m === 't' ? 1 : 0),
          recent: pushMark(old.recent, m), times: res.result === 'right' ? [...old.times, Math.round(res.endMs)].slice(-RECENT_KEEP) : old.times, picks,
        }
        const { state: ladder, opened } = afterAnswer(s.ladder, it, m, s.settings)
        const speed = afterRound(s.speed, { result: res.result, underMs: res.underMs, startedUnder: res.startedUnder, rungOpened: opened !== undefined })
        set({
          items: { ...s.items, [it.id]: stat }, ladder, speed, lastFact: it.fact, sinceZero: isZeroFact(it) ? 0 : s.sinceZero + 1,
        })
        return { opened }
      },
      endRun: (points) => {
        const s = get()
        const newBest = points > s.best
        set({ totalPoints: s.totalPoints + points, best: newBest ? points : s.best, runs: s.runs + 1 })
        return { newBest }
      },
      unlockShips: (level) => {
        const s = get()
        const fresh = shipsReached(level).filter((n): n is 2 | 3 => n !== 1 && !s.ships.includes(n))
        if (fresh.length) set({ ships: [...s.ships, ...fresh] })
        return [...fresh]
      },
      chooseShip: (n) => { if (get().ships.includes(n)) set({ ship: n }) },
      markHeard: (id) => set((s) => ({ heard: { ...s.heard, [id]: (s.heard[id] ?? 0) + 1 } })),
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      reset: () => set({ ...DEFAULT_SAVE, settings: get().settings }),
})

export const useSpaceCatStore = create<SpaceCatState>()(
  persist(
    spaceCatCreator,
    {
      name: SAVE_KEY, version: 1, storage: createJSONStorage(() => localStorage),
      // Version 1 is the first save shape. When SpaceCatSave changes, raise `version` and convert older saves here
      // (never drop his progress: rule). Fields added later take their defaults from the initial state (persist merges).
      migrate: (state) => state as SpaceCatState,
    },
  ),
)

/** the page's restore from the browser's back/forward cache reads the save again; call once at the root */
export const rehydrateSpaceCat = () => rehydrateOnRestore(useSpaceCatStore)
