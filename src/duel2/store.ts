// Book 2's own save (localStorage 'alef-duel2'); reset never touches alef's progress or the duel's.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { pushRecent, type Tally } from '../shared/adaptive'
import type { ScreenId } from './logic/predict'
import type { Choice, Conf } from './logic/rounds'
import type { BossKind } from './logic/boss'
import { START_STAGE, recordStageAnswer, type StageProgress } from './logic/stages'

export interface Duel2Settings {
  sfx: boolean; music: boolean; volume: number
  /** the two drawing screens in the lap: on by default since the parent reviewed the strokes (spec: one duel, Part 5) */
  drawing?: boolean
}
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
  /** every star (right answer) of every run, kept at once: shown on the cover; it only grows */
  totalStars: number
  /** his coin balance: spending money, earned per right answer (times the streak multiplier) and spent at the merchant */
  coins: number
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
  /** the parent's marks on the stroke review page (`<letter>-<script>`): kept through a progress reset */
  strokeMarks: Record<string, 'ok' | 'wrong'>
  /** his drawing rounds so far (print and handwriting alternate) */
  drawRounds: number
}

interface Actions {
  recordAnswer: (a: { features: string[]; miss: boolean; asked?: Choice; tapped?: Choice; newStage: boolean }) => { passed: boolean }
  setPace: (p: number) => void
  endRun: (ended: ScreenId, score: number) => void
  addStar: () => void
  /** stars at once */
  addStars: (n: number) => void
  addCoins: (n: number) => void
  /** false, and no change, when he has fewer than `n` */
  spendCoins: (n: number) => boolean
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
  markStrokes: (key: string, mark: 'ok' | 'wrong' | null) => void
  noteDrawRound: () => void
  resetProgress: () => void
}

export const DEFAULT_SETTINGS: Duel2Settings = { sfx: true, music: true, volume: 0.8, drawing: true }
/** the review marks to clear in version 2: the letters whose strokes changed after the parent's review (2026-11-07) */
/** version 3: the letters changed after the second review */
export const STROKES_CHANGED_V3 = [...'בדחטכמםצקרגזוץף'].map((l) => `${l}-hand`)
/** version 4: the letters changed after the third review */
export const STROKES_CHANGED_V4 = [...'הזמ'].map((l) => `${l}-print`).concat([...'םרכדחמ'].map((l) => `${l}-hand`))
export const STROKES_CHANGED_V2 = [...'הזמנץק'].map((l) => `${l}-print`).concat([...'אבגדוילןצץףר'].map((l) => `${l}-hand`))

const fresh = (): Omit<Duel2Save, 'settings' | 'strokeMarks'> => ({
  stage: START_STAGE, tallies: {}, recent: {}, confusions: { letters: {}, vowels: {}, syllables: {} }, pace: 1, lastEnded: null,
  demosSeen: [], dotIntrosSeen: [], hintsSeen: {}, mistakes: [], roundNo: 0, runs: 0, bestRun: 0, crystals: 0, totalStars: 0, coins: 0, praiseHeard: {}, drawRounds: 0,
  bossesBeaten: [], bossNewHeard: [], lastBoss: null, potionIntroSeen: false,
})

/**
 * Converts an older save, step by step (each step runs for every save older than it; no early return). Version 2: the
 * stroke data of some letters changed after the parent's review, so their review marks are cleared (they show as
 * unchecked again); every other mark stays. Versions 3 and 4: the same for the letters changed after the second and the
 * third review. Version 5 (one duel): his coins (one for each 10 stars) become a balance, and drawing turns on for every
 * save (saves carry an explicit `drawing: false`; the parent can turn it off again).
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
  return s as Partial<Duel2Save> & { settings: Duel2Settings }
}

const bump = (c: Conf, a: string, b: string): Conf => ({ ...c, [a]: { ...(c[a] ?? {}), [b]: (c[a]?.[b] ?? 0) + 1 } })

/** the old rule, a coin for every this many stars: kept only for the version-5 migration (his coins become a balance) */
export const COIN_EVERY = 10
export const coinsOf = (stars: number) => Math.floor((stars ?? 0) / COIN_EVERY)

export const useDuel2Store = create<Duel2Save & Actions>()(
  persist(
    (set, get) => ({
      ...fresh(),
      settings: DEFAULT_SETTINGS,
      strokeMarks: {},
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
      addCoins: (n) => set((s) => ({ coins: (s.coins ?? 0) + n })),
      spendCoins: (n) => {
        if (n > (get().coins ?? 0)) return false
        set((s) => ({ coins: (s.coins ?? 0) - n }))
        return true
      },
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
      markStrokes: (key, mark) => set((s) => {
        const m = { ...(s.strokeMarks ?? {}) }
        if (mark) m[key] = mark
        else delete m[key]
        return { strokeMarks: m }
      }),
      noteDrawRound: () => set((s) => ({ drawRounds: (s.drawRounds ?? 0) + 1 })),
      resetProgress: () => set((s) => ({ ...fresh(), settings: s.settings, strokeMarks: s.strokeMarks ?? {} })),
    }),
    {
      name: 'alef-duel2', version: 5, storage: createJSONStorage(() => localStorage),
      // Raise `version` when a save must be converted, and convert older saves in migrateSave (never drop his progress: rule).
      // Fields added later (the bosses, the potion) take their defaults from the initial state: persist merges a saved
      // state over it.
      migrate: (state, version) => migrateSave(state, version) as Duel2Save & Actions,
    },
  ),
)
