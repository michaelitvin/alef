// Book 2's own save (localStorage 'alef-duel2'); reset never touches alef's progress or the duel's.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { pushRecent, type Tally } from '../shared/adaptive'
import type { ScreenId } from './logic/predict'
import type { Choice, Conf } from './logic/rounds'
import type { BossKind } from './logic/boss'
import { START_STAGE, recordStageAnswer, type StageProgress } from './logic/stages'
import type { NumberRange } from './logic/merchant'
import { towerMastered } from './logic/mastery'
import { DUEL_MARKS } from '../utils/duel/marks'
import type { DuelStats } from '../types/duel'

export interface Duel2Settings {
  sfx: boolean; music: boolean; volume: number
  /** the two drawing screens in the lap: on by default since the parent reviewed the strokes (spec: one duel, Part 5) */
  drawing?: boolean
  /** the parent's number range for shopping at the merchant: the coin values and the top price (default 100) */
  range: NumberRange
}
/** the merchant's counters (the parent's money section) and his adaptive level (spec: one duel, Part 2) */
export interface MerchantSave {
  visits: number; purchases: number; declines: number
  /** tries that were not enough / too much */
  short: number; over: number
  hints: number
  /** 0–2: how the coins are composed (merchant.ts composeCoins) */
  level: number
  /** the first-visit demo was shown; the undo was shown (the first time he gave too much) */
  demoSeen: boolean; undoShown: boolean
  /** exact payments in a row with no wrong try and no hint; payments in a row with a hint */
  cleanRow: number; hintRow: number
}
export const FRESH_MERCHANT: MerchantSave = {
  visits: 0, purchases: 0, declines: 0, short: 0, over: 0, hints: 0, level: 0, demoSeen: false, undoShown: false, cleanRow: 0, hintRow: 0,
}
/** checkpointsSinceVisit before his first visit (JSON cannot keep Infinity) */
export const NEVER_VISITED = 999
/** the level goes up after this many clean payments in a row, and down after this many hinted ones */
const LEVEL_UP_ROW = 3
const LEVEL_DOWN_ROW = 2
const LEVEL_MAX = 2
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
  /** the old flying potion was introduced (it no longer flies: kept so old saves read the same) */
  potionIntroSeen: boolean
  settings: Duel2Settings
  /** the parent's marks on the stroke review page (`<letter>-<script>`): kept through a progress reset */
  strokeMarks: Record<string, 'ok' | 'wrong'>
  /** his drawing rounds so far (telemetry only: the screen now decides print or handwriting) */
  drawRounds: number
  merchant: MerchantSave
  /** checkpoints since the merchant's last visit, across runs (a declined visit counts as a visit) */
  checkpointsSinceVisit: number
  /** the first duel's tower in the run: the wave its next visit starts at, and its visits so far (every third a boss) */
  towerWave: number
  towerVisits: number
  /** Book 2's minigames are open (stage 0 has passed: the first duel's tower is mastered, or he had a Book 2 save) */
  bookOpen: boolean
  /** the first duel's right answers were added to his stars and coins (once; a progress reset does it again) */
  firstDuelImported: boolean
  /** the cycles of the run so far, across runs: a long-mastered screen is skipped in every other one */
  cycleNo: number
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
  noteMerchant: (e: 'visit' | 'purchase' | 'decline' | 'short' | 'over' | 'hint') => void
  setMerchantFlag: (k: 'demoSeen' | 'undoShown') => void
  /** a purchase: `exactNoHint` = exact at the first try with no hint; `hinted` = he used the hint (the level adapts) */
  merchantPaid: (exactNoHint: boolean, hinted?: boolean) => void
  /** a checkpoint passed: with his visit (back to 0) or without (one more) */
  noteCheckpoint: (visited: boolean) => void
  /** a tower visit starts (its boss rhythm counts visits) */
  noteTowerVisit: () => void
  /** the wave the next tower visit starts at */
  setTowerWave: (wave: number) => void
  /** stage 0 has passed: Book 2's minigames open */
  openBook: () => void
  /** a new cycle of the run starts */
  nextCycle: () => void
  /**
   * Once: the first duel's right answers (`correct` over its marks; lightning kills are not counted) become stars, and a
   * tenth of them coins; Book 2 opens if his marks are already mastered. The first duel's own save is only read.
   */
  importFirstDuel: (duel: DuelStats | null | undefined) => void
  resetProgress: () => void
}

export const DEFAULT_SETTINGS: Duel2Settings = { sfx: true, music: true, volume: 0.8, drawing: true, range: 100 }
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
  merchant: { ...FRESH_MERCHANT }, checkpointsSinceVisit: NEVER_VISITED,
  towerWave: 1, towerVisits: 0, bookOpen: false, firstDuelImported: false, cycleNo: 0,
})

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
      noteMerchant: (e) => set((s) => {
        const m = { ...FRESH_MERCHANT, ...s.merchant }
        const key = ({ visit: 'visits', purchase: 'purchases', decline: 'declines', short: 'short', over: 'over', hint: 'hints' } as const)[e]
        return { merchant: { ...m, [key]: m[key] + 1 } }
      }),
      setMerchantFlag: (k) => set((s) => ({ merchant: { ...FRESH_MERCHANT, ...s.merchant, [k]: true } })),
      merchantPaid: (exactNoHint, hinted = false) => set((s) => {
        const m = { ...FRESH_MERCHANT, ...s.merchant }
        let { level, cleanRow, hintRow } = m
        cleanRow = exactNoHint ? cleanRow + 1 : 0
        hintRow = hinted ? hintRow + 1 : 0
        if (cleanRow >= LEVEL_UP_ROW) { level = Math.min(LEVEL_MAX, level + 1); cleanRow = 0 }
        if (hintRow >= LEVEL_DOWN_ROW) { level = Math.max(0, level - 1); hintRow = 0 }
        return { merchant: { ...m, level, cleanRow, hintRow } }
      }),
      noteCheckpoint: (visited) => set((s) => ({ checkpointsSinceVisit: visited ? 0 : Math.min(NEVER_VISITED, (s.checkpointsSinceVisit ?? NEVER_VISITED) + 1) })),
      noteTowerVisit: () => set((s) => ({ towerVisits: (s.towerVisits ?? 0) + 1 })),
      setTowerWave: (wave) => set({ towerWave: Math.max(1, wave) }),
      openBook: () => set({ bookOpen: true }),
      nextCycle: () => set((s) => ({ cycleNo: (s.cycleNo ?? 0) + 1 })),
      importFirstDuel: (duel) => set((s) => {
        if (s.firstDuelImported) return s
        const right = Object.values(duel?.byMark ?? {}).reduce((a, t) => a + Math.max(0, t?.correct ?? 0), 0)
        const mastered = towerMastered(duel?.recent ?? {}, DUEL_MARKS.map((m) => m.id))
        return {
          totalStars: (s.totalStars ?? 0) + right, coins: (s.coins ?? 0) + coinsOf(right),
          bookOpen: !!s.bookOpen || mastered, firstDuelImported: true,
        }
      }),
      resetProgress: () => set((s) => ({ ...fresh(), settings: s.settings, strokeMarks: s.strokeMarks ?? {} })),
    }),
    {
      name: 'alef-duel2', version: 7, storage: createJSONStorage(() => localStorage),
      // Raise `version` when a save must be converted, and convert older saves in migrateSave (never drop his progress: rule).
      // Fields added later (the bosses, the potion) take their defaults from the initial state: persist merges a saved
      // state over it.
      migrate: (state, version) => migrateSave(state, version) as Duel2Save & Actions,
    },
  ),
)
