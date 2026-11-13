// Book 2's own save (localStorage 'alef-duel2'); reset never touches alef's progress or the duel's.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { pushRecent, type Tally } from '../shared/adaptive'
import type { ScreenId } from './logic/predict'
import type { Choice, Conf } from './logic/rounds'
import type { BossKind } from './logic/boss'
import { START_STAGE, recordStageAnswer, type StageProgress } from './logic/stages'
import type { NumberRange } from './logic/merchant'
import { pushTowerTail, towerMastered } from './logic/mastery'
import { DUEL_MARKS } from '../utils/duel/marks'
import type { DuelStats } from '../types/duel'
import { COIN_EVERY, DEFAULT_SETTINGS, FRESH_MERCHANT, NEVER_VISITED, STROKES_CHANGED_V2, STROKES_CHANGED_V3, STROKES_CHANGED_V4, SAVE_VERSION, coinsOf, migrateSave } from './saveFormat'

export { COIN_EVERY, DEFAULT_SETTINGS, FRESH_MERCHANT, NEVER_VISITED, STROKES_CHANGED_V2, STROKES_CHANGED_V3, STROKES_CHANGED_V4, SAVE_VERSION, coinsOf, migrateSave }

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
  /** monsters whose "new monster" introduction a tower boss visit jumped over: each is introduced when it first appears */
  towerOwed: string[]
  /** Book 2's minigames are open (stage 0 has passed: the first duel's tower is mastered, or he had a Book 2 save) */
  bookOpen: boolean
  /** the tower's last answers in time order, newest last (o / x): the fast lane of stage 0 (mastery.fastLane) */
  towerTail: string
  /** the first duel's right answers were added to his stars and coins (once; a progress reset does it again) */
  firstDuelImported: boolean
  /** the cycles of the run so far, across runs: a long-mastered screen is skipped in every other one */
  cycleNo: number
  /** broom sessions from the path so far: every second one is a boss fight (the run's boss rhythm) */
  broomSessions: number
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
  /** a boss visit jumped over these monsters' introductions */
  oweMonsters: (ids: string[]) => void
  /** an owed monster was introduced */
  monsterIntroduced: (id: string) => void
  /** an answer on the tower, in time order (the fast lane's tail) */
  noteTowerAnswer: (right: boolean) => void
  /** stage 0 has passed: Book 2's minigames open */
  openBook: () => void
  /** a new cycle of the run starts */
  nextCycle: () => void
  /** a broom session from the path starts */
  noteBroomSession: () => void
  /**
   * Once: the first duel's right answers (`correct` over its marks; lightning kills are not counted) become stars, and a
   * tenth of them coins; Book 2 opens if his marks are already mastered. The first duel's own save is only read.
   */
  importFirstDuel: (duel: DuelStats | null | undefined) => void
  resetProgress: () => void
}

const fresh = (): Omit<Duel2Save, 'settings' | 'strokeMarks'> => ({
  stage: START_STAGE, tallies: {}, recent: {}, confusions: { letters: {}, vowels: {}, syllables: {} }, pace: 1, lastEnded: null,
  demosSeen: [], dotIntrosSeen: [], hintsSeen: {}, mistakes: [], roundNo: 0, runs: 0, bestRun: 0, crystals: 0, totalStars: 0, coins: 0, praiseHeard: {}, drawRounds: 0,
  bossesBeaten: [], bossNewHeard: [], lastBoss: null, potionIntroSeen: false,
  merchant: { ...FRESH_MERCHANT }, checkpointsSinceVisit: NEVER_VISITED,
  towerWave: 1, towerVisits: 0, towerOwed: [], bookOpen: false, towerTail: '', firstDuelImported: false, cycleNo: 0, broomSessions: 0,
})

const bump = (c: Conf, a: string, b: string): Conf => ({ ...c, [a]: { ...(c[a] ?? {}), [b]: (c[a]?.[b] ?? 0) + 1 } })

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
      oweMonsters: (ids) => set((s) => ({ towerOwed: [...new Set([...(s.towerOwed ?? []), ...ids])] })),
      monsterIntroduced: (id) => set((s) => ({ towerOwed: (s.towerOwed ?? []).filter((x) => x !== id) })),
      noteTowerAnswer: (right) => set((s) => ({ towerTail: pushTowerTail(s.towerTail, right) })),
      openBook: () => set({ bookOpen: true }),
      nextCycle: () => set((s) => ({ cycleNo: (s.cycleNo ?? 0) + 1 })),
      noteBroomSession: () => set((s) => ({ broomSessions: (s.broomSessions ?? 0) + 1 })),
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
      name: 'alef-duel2', version: SAVE_VERSION, storage: createJSONStorage(() => localStorage),
      // Raise `version` when a save must be converted, and convert older saves in migrateSave (never drop his progress: rule).
      // Fields added later (the bosses, the potion) take their defaults from the initial state: persist merges a saved
      // state over it.
      migrate: (state, version) => migrateSave(state, version) as Duel2Save & Actions,
    },
  ),
)
