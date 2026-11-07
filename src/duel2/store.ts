// Book 2's own save (localStorage 'alef-duel2'); reset never touches alef's progress or the duel's.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { pushRecent, type Tally } from '../shared/adaptive'
import type { ScreenId } from './logic/predict'
import type { Choice, Conf } from './logic/rounds'
import type { BossKind } from './logic/boss'
import { START_STAGE, recordStageAnswer, type StageProgress } from './logic/stages'

export interface Duel2Settings { sfx: boolean; music: boolean; volume: number }
export interface Duel2Save {
  stage: StageProgress
  tallies: Record<string, Tally>
  recent: Record<string, string>
  confusions: { letters: Conf; vowels: Conf; syllables: Conf }
  /** the broom's hidden speed multiplier (the duel's adaptive pace) */
  pace: number
  /** the screen where the last run ended; the next run starts after it */
  lastEnded: ScreenId | null
  demosSeen: string[]
  dotIntrosSeen: string[]
  /** rounds each screen×stage hint has shown by itself */
  hintsSeen: Record<string, number>
  /** recent mistakes per feature (round numbers), for the explanation cadence */
  mistakes: { round: number; features: string[] }[]
  roundNo: number
  runs: number
  bestRun: number
  crystals: number
  /** all the stars (right answers) of all his runs: shown on the cover */
  /** every star of every run, kept at once (a coin for each COIN_EVERY) */
  totalStars: number
  /** how many times each praise line was spoken: after two it is only its sound */
  praiseHeard: Record<string, number>
  /** the flight bosses he has beaten (each kind once): the trophy shelf */
  bossesBeaten: BossKind[]
  /** the bosses whose "new in your collection" line he has heard (its golden-frame moment is used up) */
  bossNewHeard: BossKind[]
  /** the kind of the last boss (never the same twice in a row) */
  lastBoss: BossKind | null
  /** the rescue potion was introduced (its first flight is slower, with a line) */
  potionIntroSeen: boolean
  settings: Duel2Settings
}

interface Actions {
  recordAnswer: (a: { features: string[]; miss: boolean; asked?: Choice; tapped?: Choice; newStage: boolean }) => { passed: boolean }
  setPace: (p: number) => void
  endRun: (ended: ScreenId, score: number) => void
  addStar: () => void
  /** stars at once (a boss win: 10 per bonus coin) */
  addStars: (n: number) => void
  markBossBeaten: (k: BossKind) => void
  setLastBoss: (k: BossKind) => void
  markBossNewHeard: (k: BossKind) => void
  markPotionIntro: () => void
  notePraise: (kind: string) => void
  addCrystal: () => void
  markDemo: (id: string) => void
  markDotIntro: (pair: string) => void
  noteHint: (key: string) => void
  setSettings: (p: Partial<Duel2Settings>) => void
  resetProgress: () => void
}

export const DEFAULT_SETTINGS: Duel2Settings = { sfx: true, music: true, volume: 0.8 }
const fresh = (): Omit<Duel2Save, 'settings'> => ({
  stage: START_STAGE, tallies: {}, recent: {}, confusions: { letters: {}, vowels: {}, syllables: {} }, pace: 1, lastEnded: null,
  demosSeen: [], dotIntrosSeen: [], hintsSeen: {}, mistakes: [], roundNo: 0, runs: 0, bestRun: 0, crystals: 0, totalStars: 0, praiseHeard: {},
  bossesBeaten: [], bossNewHeard: [], lastBoss: null, potionIntroSeen: false,
})

const bump = (c: Conf, a: string, b: string): Conf => ({ ...c, [a]: { ...(c[a] ?? {}), [b]: (c[a]?.[b] ?? 0) + 1 } })

/** a gold coin for every this many stars, across all his plays: points that grow only now and then (Michael) */
export const COIN_EVERY = 10
export const coinsOf = (stars: number) => Math.floor((stars ?? 0) / COIN_EVERY)

export const useDuel2Store = create<Duel2Save & Actions>()(
  persist(
    (set, get) => ({
      ...fresh(),
      settings: DEFAULT_SETTINGS,
      recordAnswer: ({ features, miss, asked, tapped, newStage }) => {
        const s = get()
        const tallies = { ...s.tallies }
        const recent = { ...s.recent }
        for (const f of features) {
          const t = tallies[f] ?? {}
          tallies[f] = { seen: (t.seen ?? 0) + 1, wrong: (t.wrong ?? 0) + (miss ? 1 : 0) }
          recent[f] = pushRecent(recent[f], miss)
        }
        let confusions = s.confusions
        if (miss && asked && tapped && asked.id !== tapped.id) {
          let { letters, vowels, syllables } = confusions
          if (asked.itemId !== tapped.itemId) letters = bump(letters, asked.itemId, tapped.itemId)
          if (asked.group && tapped.group && asked.group !== tapped.group) vowels = bump(vowels, asked.group, tapped.group)
          if (asked.group && tapped.group) syllables = bump(syllables, `${asked.itemId}-${asked.group}`, `${tapped.itemId}-${tapped.group}`)
          confusions = { letters, vowels, syllables }
        }
        const mistakes = miss ? [...s.mistakes, { round: s.roundNo, features }].slice(-20) : s.mistakes
        let stage = s.stage
        let passed = false
        if (newStage) ({ progress: stage, passed } = recordStageAnswer(s.stage, !miss))
        set({ tallies, recent, confusions, mistakes, stage, roundNo: s.roundNo + 1 })
        return { passed }
      },
      setPace: (pace) => set({ pace }),
      endRun: (ended, score) => set((s) => ({ lastEnded: ended, runs: s.runs + 1, bestRun: Math.max(s.bestRun, score), })),
      addStar: () => set((s) => ({ totalStars: (s.totalStars ?? 0) + 1 })),
      addStars: (n) => set((s) => ({ totalStars: (s.totalStars ?? 0) + n })),
      markBossBeaten: (k) => set((s) => ((s.bossesBeaten ?? []).includes(k) ? s : { bossesBeaten: [...(s.bossesBeaten ?? []), k] })),
      setLastBoss: (k) => set({ lastBoss: k }),
      markBossNewHeard: (k) => set((s) => ((s.bossNewHeard ?? []).includes(k) ? s : { bossNewHeard: [...(s.bossNewHeard ?? []), k] })),
      markPotionIntro: () => set({ potionIntroSeen: true }),
      addCrystal: () => set((s) => ({ crystals: s.crystals + 1 })),
      notePraise: (kind) => set((s) => ({ praiseHeard: { ...(s.praiseHeard ?? {}), [kind]: ((s.praiseHeard ?? {})[kind] ?? 0) + 1 } })),
      markDemo: (id) => set((s) => (s.demosSeen.includes(id) ? s : { demosSeen: [...s.demosSeen, id] })),
      markDotIntro: (pair) => set((s) => (s.dotIntrosSeen.includes(pair) ? s : { dotIntrosSeen: [...s.dotIntrosSeen, pair] })),
      noteHint: (key) => set((s) => ({ hintsSeen: { ...s.hintsSeen, [key]: (s.hintsSeen[key] ?? 0) + 1 } })),
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      resetProgress: () => set((s) => ({ ...fresh(), settings: s.settings })),
    }),
    {
      name: 'alef-duel2', version: 1, storage: createJSONStorage(() => localStorage),
      // Version 1 is the first save shape. When Duel2Save changes, raise `version` and convert older saves here
      // (never drop his progress: rule). Until then a save passes through unchanged. Fields added later (the bosses, the
      // potion) take their defaults from the initial state: persist merges a saved state over it.
      migrate: (state) => state as Duel2Save & Actions,
    },
  ),
)
