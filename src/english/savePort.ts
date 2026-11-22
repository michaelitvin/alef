// What the English run reads from and writes to its save: Spell Quest's port (the run's writes) and the English writes, so
// that no part of the English path writes past the port. The game writes the real save (alef-english); a test runs on a
// save in memory.
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { SpellQuestActions, SpellQuestSave } from '../spellquest/store'
import { portOver, type SavePort } from '../spellquest/savePort'
import type { ScreenId } from '../spellquest/logic/predict'
import type { Tally } from '../shared/adaptive'
import { talliesOver, type TowerTallyPort } from '../spellquest/tower/logic/tallies'
import { getNumberRange, type NumberRange } from '../shared/numberRange'
import { englishState, useEnglishStore } from './store'
import type { EnglishFields, EnglishSave, EnglishSettings, IntroState, PlacementSave } from './saveFormat'

export interface EnglishSavePort extends SavePort {
  /** the English save as it is now (a snapshot: read again after a write) */
  read(): Readonly<EnglishSave>
  setPlacement(p: PlacementSave): void
  /** he is placed at `stage`: its answers start again */
  setStage(stage: number): void
  /** merges `t` into the tallies; a count is never lowered */
  seedTallies(t: Record<string, Tally>): void
  setIntro(id: string, s: IntroState): void
  /** adds these stations to the opened ones (it only grows) */
  openStations(ids: ScreenId[]): void
  setLastRunWords(words: string[]): void
  /** merges the settings, `path` included (the store's own `setSettings` takes Spell Quest's settings only) */
  setSettings(p: Partial<EnglishSettings>): void
  /** the English tower's answers, kept in this save's `tower` */
  towerTallies(): TowerTallyPort
}

type EnglishState = SpellQuestSave & SpellQuestActions & EnglishFields

const TALLY_KEYS = ['seen', 'wrong', 'timeout'] as const satisfies readonly (keyof Tally)[]

function mergeTally(a: Tally | undefined, b: Tally): Tally {
  const out: Tally = { ...a }
  for (const k of TALLY_KEYS) if (b[k] !== undefined) out[k] = Math.max(a?.[k] ?? 0, b[k])
  return out
}

function englishPortOver(store: StoreApi<EnglishState>, range: () => NumberRange): EnglishSavePort {
  const base = portOver(store, () => store.getState().tower.recent, range)
  const tower = talliesOver(() => store.getState().tower, (t) => store.setState({ tower: t }))
  return {
    ...base,
    read: () => store.getState(),
    setPlacement: (placement) => store.setState({ placement }),
    setStage: (stage) => store.setState({ stage: { stage, newAnswers: '' } }),
    seedTallies: (t) => store.setState((s) => {
      const tallies = { ...s.tallies }
      for (const [k, v] of Object.entries(t)) tallies[k] = mergeTally(tallies[k], v)
      return { tallies }
    }),
    setIntro: (id, i) => store.setState((s) => ({ introSeen: { ...s.introSeen, [id]: i } })),
    openStations: (ids) => store.setState((s) => ({ openedStations: [...new Set([...s.openedStations, ...ids])] })),
    setLastRunWords: (lastRunWords) => store.setState({ lastRunWords }),
    setSettings: (p) => store.setState((s) => ({ settings: { ...s.settings, ...p } })),
    towerTallies: () => tower,
  }
}

let real: EnglishSavePort | null = null
/** the real save (alef-english) */
export function englishSavePort(): EnglishSavePort {
  return (real ??= englishPortOver(useEnglishStore, getNumberRange))
}

/** a save in memory (tests): a fresh English save with `initial` over it; the writes work as in the real save */
export function memoryEnglishSavePort(initial: Partial<EnglishSave> = {}): EnglishSavePort {
  const store = createStore<EnglishState>()(englishState)
  store.setState(initial as Partial<EnglishState>)
  return englishPortOver(store, () => store.getState().settings.range ?? 100)
}
