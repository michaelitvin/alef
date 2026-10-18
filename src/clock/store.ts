// The clock game's own save (localStorage 'alef-clock'); reset never touches alef's progress.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { pushRecent, type Tally } from '../shared/adaptive'
import { sameTime, timeId } from './logic/time'
import type { Lang } from './logic/phrases'
import type { Evaluation } from './logic/grade'
import { START_PROGRESS, recordNewAnswer, type ExplainId, type LevelProgress } from './logic/levels'
import type { Hint, RoundPlan } from './logic/types'

export interface ClockSettings {
  langs: Lang[]
  /** Hebrew captions alternate print and cursive */
  heCursiveMix: boolean
  /** English captions alternate small letters and capitals */
  enCapsMix: boolean
  sfx: boolean
  music: boolean
  volume: number
}

export interface ClockSave {
  progress: LevelProgress
  tallies: Record<string, Tally>
  recent: Record<string, string>
  confusions: Record<string, Record<string, number>>
  mistakes: { round: number; tag: string }[]
  explained: Partial<Record<ExplainId, number>>
  roundNo: number
  gears: number
  workdays: number
  bestStreak: number
  lastRealTimeDay: string
  welcomed: boolean
  bonusExplained: boolean
  /** rounds each clock hint has shown by itself (it shows by itself for the first HINT_AUTO rounds) */
  hintsSeen: Partial<Record<Hint, number>>
  settings: ClockSettings
}

interface Actions {
  /** One finished round. `forgiven` = he used the near miss: no level answer, a miss for the predictor. */
  recordRound: (plan: RoundPlan, ev: Evaluation, forgiven: boolean) => { levelUp: boolean }
  markExplained: (id: ExplainId) => void
  addGears: (n: number) => void
  finishWorkday: () => void
  setRealTimeDay: (d: string) => void
  setWelcomed: () => void
  setBonusExplained: () => void
  noteStreak: (n: number) => void
  noteHint: (h: Hint) => void
  setSettings: (s: Partial<ClockSettings>) => void
  resetProgress: () => void
}

export const DEFAULT_SETTINGS: ClockSettings = { langs: ['he', 'en'], heCursiveMix: true, enCapsMix: true, sfx: true, music: true, volume: 0.8 }
const fresh = (): Omit<ClockSave, 'settings'> => ({
  progress: START_PROGRESS, tallies: {}, recent: {}, confusions: {}, mistakes: [], explained: {}, roundNo: 0,
  gears: 0, workdays: 0, bestStreak: 0, lastRealTimeDay: '', welcomed: false, bonusExplained: false, hintsSeen: {},
})

export const useClockStore = create<ClockSave & Actions>()(
  persist(
    (set, get) => ({
      ...fresh(),
      settings: DEFAULT_SETTINGS,
      recordRound: (plan, ev, forgiven) => {
        const s = get()
        const miss = !ev.correct || forgiven
        const tallies = { ...s.tallies }
        const recent = { ...s.recent }
        for (const f of plan.features) {
          const t = tallies[f] ?? {}
          tallies[f] = { seen: (t.seen ?? 0) + 1, wrong: (t.wrong ?? 0) + (miss ? 1 : 0) }
          recent[f] = pushRecent(recent[f], miss)
        }
        const confusions = { ...s.confusions }
        if (!ev.correct && ev.chosen && !sameTime(ev.chosen, plan.time)) {
          const row = { ...(confusions[timeId(plan.time)] ?? {}) }
          row[timeId(ev.chosen)] = (row[timeId(ev.chosen)] ?? 0) + 1
          confusions[timeId(plan.time)] = row
        }
        const mistakes = !ev.correct && ev.tag ? [...s.mistakes, { round: s.roundNo, tag: ev.tag }].slice(-20) : s.mistakes
        let progress = s.progress
        let levelUp = false
        if (plan.isNew && !forgiven) ({ progress, passed: levelUp } = recordNewAnswer(s.progress, ev.correct))
        set({ tallies, recent, confusions, mistakes, progress, roundNo: s.roundNo + 1 })
        return { levelUp }
      },
      markExplained: (id) => set((s) => ({ explained: { ...s.explained, [id]: s.roundNo } })),
      addGears: (n) => set((s) => ({ gears: s.gears + n })),
      finishWorkday: () => set((s) => ({ workdays: s.workdays + 1 })),
      setRealTimeDay: (d) => set({ lastRealTimeDay: d }),
      setWelcomed: () => set({ welcomed: true }),
      setBonusExplained: () => set({ bonusExplained: true }),
      noteStreak: (n) => set((s) => (n > s.bestStreak ? { bestStreak: n } : s)),
      noteHint: (h) => set((s) => ({ hintsSeen: { ...s.hintsSeen, [h]: (s.hintsSeen?.[h] ?? 0) + 1 } })),
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      resetProgress: () => set((s) => ({ ...fresh(), settings: s.settings })),
    }),
    {
      name: 'alef-clock', version: 1, storage: createJSONStorage(() => localStorage),
      // Version 1 is the first save shape. When ClockSave changes, raise `version` and convert older saves here
      // (never drop his progress: rule). Until then a save passes through unchanged.
      migrate: (state) => state as ClockSave & Actions,
    },
  ),
)
