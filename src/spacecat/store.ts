// Space Cat's own save (localStorage 'alef-spacecat'); reset never touches alef's progress.
import { create, type StateCreator } from 'zustand'
import { persist } from 'zustand/middleware'
import { RECENT_KEEP, type Rng } from '../shared/adaptive'
import { rehydrateOnRestore } from '../shared/rehydrateOnRestore'
import { persistSaveStorage } from '../shared/saveStorage'
import { isRareFact, type Item } from './logic/facts'
import { afterAnswer, beginRun, chooseRound, relevel, type LadderEvent, type Part } from './logic/ladder/index'
import type { ItemStats, Mark } from './logic/predict'
import { pushMark } from './logic/predict'
import type { RoundResult } from './logic/round'
import { rungDef, type Band } from './logic/rungs'
import { shipsReached } from './logic/run'
import { afterRound, HOLD_ROUNDS, speedOfBand } from './logic/speed'
import { flyHighestShip, migrateV1 } from './migrate'
import { DEFAULT_SAVE, SAVE_KEY, SAVE_VERSION, type Settings, type SpaceCatSave } from './saveFormat'

export { DEFAULT_SAVE, DEFAULT_SETTINGS, SAVE_KEY } from './saveFormat'

export interface Actions {
  /**
   * One finished round. A demo or a cut round changes no tally, ladder or speed. `part` (from `takeRound`) defaults to the
   * placement's probe or the frontier; `fast` (fast.ts) to false; `now` to the clock.
   */
  recordRound: (it: Item, res: RoundResult, opts?: { demo?: boolean; cut?: boolean; part?: Part; fast?: boolean; now?: number }) => { events: LadderEvent[] }
  /** the start of a run: the play-day counter, due holds, the warm-up and the re-check. `playDay`: the run starts a play day. */
  beginRun: (now?: number) => { events: LadderEvent[]; playDay: boolean }
  /** the next round of the ladder (`chooseRound` with the save); the ladder's counters are written back */
  takeRound: (rng: Rng) => { item: Item; part: Part }
  /** "find his level again" (the parent): a new placement from rung 1; items, points and settings stay */
  findLevelAgain: () => void
  endRun: (points: number) => { newBest: boolean }
  /** the ships that reaching this level unlocks; returns the new ones */
  unlockShips: (level: number) => (2 | 3)[]
  chooseShip: (n: 1 | 2 | 3) => void
  markHeard: (id: string) => void
  /** an intro's typical mistake (audio/intros.ts), counted on the ladder's play day */
  noteIntroMistake: (id: string) => void
  /** an intro played again after its mistakes: at most once a play day */
  markIntroAgain: (id: string) => void
  setSettings: (p: Partial<Settings>) => void
  reset: () => void
}

const markOf = (r: RoundResult['result']): Mark => (r === 'right' ? 'o' : r === 'wrong' ? 'x' : 't')

export type SpaceCatState = SpaceCatSave & Actions

/** the intro counters of the ladder's play day (counters of an earlier day start afresh) */
const introOfDay = (s: SpaceCatSave): SpaceCatSave['intro'] => (s.intro.day === s.ladder.day ? s.intro : { day: s.ladder.day, mistakes: {}, again: [] })

/** hold a band's speed after a rung opened there: the band's next HOLD_ROUNDS rounds do not get shorter */
const holdBand = (speed: SpaceCatSave['speed'], band: Band): SpaceCatSave['speed'] => ({
  ...speed, [band]: { ...speedOfBand(speed, band), hold: HOLD_ROUNDS },
})

/** the state and its actions, shared by the persisted store and the in-memory one of the tests (savePort.ts) */
export const spaceCatCreator: StateCreator<SpaceCatState> = (set, get) => ({
      ...DEFAULT_SAVE,
      recordRound: (it, res, opts) => {
        const s = get()
        const after = { lastFact: it.fact, sinceZero: isRareFact(it) ? 0 : s.sinceZero + 1 }
        if (opts?.cut) return { events: [] }
        // the demo round changes no tally, but it is the round before the next pick (never the same fact twice)
        if (opts?.demo) { set(after); return { events: [] } }
        const now = opts?.now ?? Date.now()
        const m = markOf(res.result)
        const old: ItemStats = s.items[it.id] ?? { seen: 0, wrong: 0, timeout: 0, recent: '', times: [], picks: {} }
        const picks = res.result === 'wrong' ? { ...old.picks, [String(res.number)]: (old.picks[String(res.number)] ?? 0) + 1 } : old.picks
        const stat: ItemStats = {
          seen: old.seen + 1, wrong: old.wrong + (m === 'x' ? 1 : 0), timeout: old.timeout + (m === 't' ? 1 : 0),
          recent: pushMark(old.recent, m), times: res.result === 'right' ? [...old.times, Math.round(res.endMs)].slice(-RECENT_KEEP) : old.times, picks,
        }
        const part = opts?.part ?? (s.ladder.mode.kind === 'placement' ? 'probe' : 'frontier')
        const { ladder, events, holdSpeed } = afterAnswer(s.ladder, { item: it, part, mark: m, fast: opts?.fast ?? false, now, set: s.settings })
        const band = rungDef(it.rung).band
        let speed: SpaceCatSave['speed'] = {
          ...s.speed,
          [band]: afterRound(speedOfBand(s.speed, band), { result: res.result, underMs: res.underMs, startedUnder: res.startedUnder, rungOpened: holdSpeed === band }),
        }
        if (holdSpeed && holdSpeed !== band) speed = holdBand(speed, holdSpeed)
        set({
          items: { ...s.items, [it.id]: stat }, ladder, speed, ...after,
        })
        return { events }
      },
      beginRun: (now = Date.now()) => {
        const s = get()
        const r = beginRun(s.ladder, { now, set: s.settings })
        set({
          ladder: r.ladder,
          ...(r.holdSpeed ? { speed: holdBand(s.speed, r.holdSpeed) } : {}),
          ...(r.playDay && s.intro.day !== r.ladder.day ? { intro: { day: r.ladder.day, mistakes: {}, again: [] } } : {}),
        })
        return { events: r.events, playDay: r.playDay }
      },
      takeRound: (rng) => {
        const s = get()
        const { item, part, ladder } = chooseRound(s.ladder, { rng, set: s.settings, stats: s.items, last: { fact: s.lastFact, sinceZero: s.sinceZero } })
        set({ ladder })
        return { item, part }
      },
      findLevelAgain: () => set((s) => ({ ladder: relevel(s.ladder) })),
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
      noteIntroMistake: (id) => set((s) => {
        const i = introOfDay(s)
        return { intro: { ...i, mistakes: { ...i.mistakes, [id]: (i.mistakes[id] ?? 0) + 1 } } }
      }),
      markIntroAgain: (id) => set((s) => {
        const i = introOfDay(s)
        return { intro: i.again.includes(id) ? i : { ...i, again: [...i.again, id] } }
      }),
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      reset: () => set({ ...DEFAULT_SAVE, settings: get().settings }),
})

export const useSpaceCatStore = create<SpaceCatState>()(
  persist(
    spaceCatCreator,
    {
      name: SAVE_KEY, version: SAVE_VERSION, storage: persistSaveStorage(),
      // Version 2 is the ladder's save shape; version 1 (the nine rungs) is converted by migrate.ts. Version 3: the chosen ship is the highest he has (migrate.ts). When SpaceCatSave
      // changes again, raise `version` and convert older saves here (never drop his progress: rule). Fields added later
      // take their defaults from the initial state (persist merges).
      // A save of this version from before the parent area read the ladder events had a `history` list: drop it.
      merge: (saved, current) => {
        const rest: Record<string, unknown> = { ...(saved as Record<string, unknown> | undefined) }
        delete rest.history
        return { ...current, ...rest } as SpaceCatState
      },
      migrate: (state, version) => {
        const v2 = version < 2 ? migrateV1(state) : state
        return (version < 3 ? flyHighestShip(v2) : v2) as SpaceCatState
      },
    },
  ),
)

/** the page's restore from the browser's back/forward cache reads the save again; call once at the root */
export const rehydrateSpaceCat = () => rehydrateOnRestore(useSpaceCatStore)
