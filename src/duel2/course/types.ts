// The course seam: what Book 2's game reads from the course it plays (Hebrew letters, English words). The Hebrew course
// is today's modules (./hebrew.ts); the English course is built on its own page (src/english/course).
import type { createGameAudio } from '../../shared/gameAudio/kit'
import type { DuelAudio } from '../../utils/duel/controller'
import type { TowerContent } from '../../utils/duel/content'
import type { Round } from '../../types/duel'
import type { DuelTallies } from '../../utils/duel/tallies'
import type { TelemetryLog, createTelemetry } from '../../shared/telemetry'
import type { ScreenView } from '../controller'
import type { Word } from '../data/words'
import type { BossKind, BossKinds } from '../logic/boss'
import type { MarkId } from '../logic/content'
import type { drawWords } from '../logic/draw'
import type { ScreenId } from '../logic/predict'
import type { Choice, Kind, LadderStep, RoundCtx } from '../logic/rounds'
import type { StageProgress } from '../logic/stages'
import type { SavePort } from '../savePort'
import type { Duel2Actions, Duel2Save } from '../store'
import type { Highlight } from '../viewTypes'

export type CourseId = 'he' | 'en'

export interface CourseStages {
  maxStage: number
  /** the cycle's order, tower first; screens not open at a stage are skipped */
  order: ScreenId[]
  /** screens that the drawing setting turns off */
  drawing: ScreenId[]
  screensOfStage(stage: number): ScreenId[]
  recordStageAnswer(p: StageProgress, correct: boolean): { progress: StageProgress; passed: boolean }
  visit: Record<ScreenId, number>
  sessionLength: Record<ScreenId, number>
}

/**
 * Every content function the run calls, with today's Hebrew signatures (a stage is a number). Each later task that
 * makes a screen course-neutral changes its own member.
 */
export interface CourseRounds {
  /**
   * the broom's sound or word to catch (`avoid`: the sound before). `kind` is the Hebrew run's letters or syllables; the
   * English course ignores it and decides by its stage (a unit's sound, a word)
   */
  broomTarget: (ctx: RoundCtx, kind: Kind, avoid?: string, screen?: ScreenId) => Choice
  /** a wave of the broom: the target and the orbs flying with it */
  broomWave: (ctx: RoundCtx, target: Choice, kind: Kind) => Choice[]
  /**
   * the introduction due after an answer on `c` (logic of the English path: a new unit or heart word is asked once
   * before its introduction), its step saved: lines (the run picks a take) and voice ids. Hebrew: unset, none
   */
  introAfter?: (save: SavePort, c: Choice, right: boolean) => ({ line: string } | { id: string })[]
  /** the cauldron's round (`avoid`: the sound heard the round before) */
  cauldronRound: (ctx: RoundCtx, avoid?: string) => CauldronRound
  /**
   * the ghosts' round: the target and the signs of the ghosts (`avoid`: the sound heard the round before; `prevSigns`: the
   * ids of the signs the round before, so a visit keeps its set; Hebrew ignores it)
   */
  ghostRound: (ctx: RoundCtx, kind: Kind, avoid?: string, prevSigns?: string[]) => { target: Choice; signs: Choice[] }
  /** the kind of a visit (letters or syllables/words) on `screen`; unset, or undefined for a screen: the run's own draw */
  visitKind?: (screen: ScreenId, stage: number, rng: () => number) => Kind | undefined
  /**
   * the explanation after a mistake on `c` on `screen` (the English look-alike letters): its parts, lines (the run picks a
   * take) and voice ids, each with what it lights, and the feature his recent mistakes on it are counted by; null: none.
   * Unset (Hebrew): the run's own explanation of a syllable
   */
  explanation?: (c: Choice, screen: ScreenId) => { feature: string; parts: (({ line: string } | { id: string }) & { highlight: Highlight })[] } | null
  /** the ladder of a visit (`rungs` steps; `force`: the gallery's fixed part, Hebrew only) */
  ladderPlan: (ctx: RoundCtx, rungs: number, force?: LadderFixed) => LadderPlan
  isNewStageChoice: (stage: number, c: Choice) => boolean
  /** the features of an answer (logic/predict): what its tallies are kept under */
  features: (c: Choice, screen: ScreenId) => string[]
  /** the doors of a visit (`n` of them) */
  doorRounds: (ctx: RoundCtx, n: number) => DoorRound[]
  /** the keys of a door, the right one (`round.key`) among them */
  doorKeys: (ctx: RoundCtx, round: DoorRound) => DoorKey[]
  wordLinkFor: (itemId: string, markId: MarkId, rng?: () => number) => Word | undefined
  /** the dotted pair to introduce before a round (Hebrew only; English returns null) */
  dotIntroFor: (targetItem: string, stage: number, seen: string[]) => string | null
  drawWords: (ctx: DrawCtx, n?: number) => Word[]
  /**
   * the flight boss's kinds open at `stage` and his score for each, from his mix-ups (the English course's families);
   * unset: Book 2's (logic/boss.ts bossOpen, bossScores)
   */
  bossKinds?: (stage: number, confusions: Duel2Save['confusions']) => BossKinds
  bossTarget: (ctx: RoundCtx, kind: BossKind, avoid?: string) => Choice
  bossWave: (ctx: RoundCtx, kind: BossKind, target: Choice) => Choice[]
}
type LadderFixed = 'letter' | 'vowel' | 'dot'

/**
 * A ladder's rung: he hears `target` and drags the plate that makes it. English: `parts` are the target's boxes, `at` the
 * one changed from the word below (`parts[at]` is the right plate), `grow` 1 when it is a box more than the word below
 * (lip → slip; -1, a box fewer, is reserved: no chain drops one). Hebrew: none of them.
 */
export type LadderPlanStep = LadderStep & { at?: number; grow?: 1 | -1; parts?: Choice[] }
/**
 * A ladder, for both courses. `fixed`: the part that stays on every rung (Hebrew only); `marked`: the changed place is
 * marked on the rung he makes (Hebrew always; English stages 1–3); `base`: the ladder's foot, built already and said
 * before the first rung (English: the chain's first word and its boxes; Hebrew: none). The run's visit has as many
 * rounds as `steps` (at most the rungs asked for).
 */
export interface LadderPlan { fixed?: LadderFixed; marked: boolean; base?: { target: Choice; parts: Choice[] }; steps: LadderPlanStep[] }

/**
 * A cauldron round, for both courses. `boxes`: the parts of the word shown, `boxes[gap]` the one missing (the right
 * tile); `orbs`: the tiles, the right one among them; `target`: the word shown and heard; `becomes`: the word the right
 * tile makes of it (English stage 6: `cap` and a thrown `e` make `cape`; then he hears `becomes`). A picture is its file.
 * Hebrew: one box, the letter, with `gap` 0 on its mark; the orbs are syllables of that letter, the target one of them.
 * `noStage`: its answer never counts towards the stage (the course's call: English, a thrown e is always the e in the
 * last box, so he can give it without listening)
 */
export interface CauldronRound { target: Choice; boxes: Choice[]; gap: number; orbs: Choice[]; becomes?: Choice; noStage?: true }
type DrawCtx = Parameters<typeof drawWords>[0]

/**
 * A door, for both courses. `plate`: the words on it, one per word, in reading order (English: one word, or from stage 4
 * a phrase of two or three); `key`: the id of the right key (the one with the picture of the word, or of the phrase's
 * noun); `soundId`: what he hears when the door opens (a phrase's own clip; unset: the plate's one word's). Hebrew: one
 * plate word, and `word`, the Book 2 door word whose syllables light on the plate.
 */
export interface DoorRound { id: string; plate: Choice[]; key: string; soundId?: string; word?: Word }
/**
 * A key under a door: its id and its picture. English: the picture's file. Hebrew: the keys are Book 2 door words, and
 * `picture` is their image name (the screen looks it up).
 */
export interface DoorKey {
  id: string
  /** Hebrew: an image name (IMAGES key, looked up by the screen); English: the picture's file */
  picture: string
}

/** one piece of a word the blend lights: its letters (a two-letter unit is one piece) and the unit it belongs to */
export interface BlendPart { text: string; unit: number }
/**
 * How a word blends (the hint, after every second miss, the made word): the voice ids it plays; when each unit lights,
 * in ms from the voice's real start (its file loaded and playing); how long it lasts (the lights end by then, also with
 * no clip); and the word's pieces, which the hint card (BlendWord) draws. `stretch`: the times split `totalMs` evenly
 * (no timing of the clip): the run stretches them to the clip's real length once it plays; a missing clip keeps them
 */
export interface BlendPlan { audio: string[]; lights: { unit: number; atMs: number }[]; totalMs: number; parts: BlendPart[]; stretch?: true }

/**
 * The hint that blends a word (English): `plan`, the blends of a screen (where he hears the word: its word; where he
 * reads to choose: each word on the screen, left to right; none: no `?`); `of`, the blend of one word (the made word,
 * the right word after a miss; null: not a word)
 */
export interface CourseHint {
  plan(screen: ScreenView): BlendPlan[]
  of(c: Choice): BlendPlan | null
}

/** a subscription to a course's save (a zustand hook: Book 2's store, or one with more fields) */
export type SaveHook = <T>(pick: (s: Duel2Save & Duel2Actions) => T) => T

/** the kit instance's voice, effects and music */
export type CourseAudio = Pick<
  ReturnType<typeof createGameAudio>,
  'sayParts' | 'say' | 'sayInfo' | 'stopVoice' | 'playSfx' | 'startMusic' | 'stopMusic' | 'voiceSignal' | 'cancelVoice'
>

export interface Course {
  id: CourseId
  /** the GameId of its parent section, its PlaytimeGame and its audio kit's game */
  game: 'book2' | 'english'
  dir: 'rtl' | 'ltr'
  stages: CourseStages
  rounds: CourseRounds
  audio: CourseAudio
  telemetry: ReturnType<typeof createTelemetry>
  /** the log the parent area lists and the registry seals (BOOK2_LOG, ENGLISH_LOG) */
  log: TelemetryLog
  /** lazy: the English store is created only on the English page */
  save: () => SavePort
  /** lazy, like `save`: the save as a store hook, for the screens that subscribe to it (CourseContext's useCourseSave) */
  store: () => SaveHook
  images: Record<string, string>
  /** the shell's preload (useGameShell's `preload`) */
  preload: () => Promise<void>
  /** the boy and girl pictures of the play gate's question, and its line id */
  genderPictures: { boy: string; girl: string; askLine: string }
  /**
   * the tower (the first duel's board): its rounds and spoken parts, where its answers are kept (lazy, like `save`), and
   * the duel's line player (default: the duel's own audio)
   */
  tower: {
    content: TowerContent; tallies: () => DuelTallies; audio?: DuelAudio
    /**
     * what a tower answer on `round` counts for (its target, by what the round asks): the run records it as any screen's answer (its features, and the stage
     * pass when `newStage`). Hebrew: unset, the tower's answers stay the first duel's (English: logic/tower's towerFacts)
     */
    facts?: (round: Round, stage: number) => { features: string[]; newStage: boolean }
  }
  /**
   * the course's placement check in the tower (English, design Part 4; Hebrew: unset, its stage 0 is the book's): while
   * it is `due`, the tower plays `tower(save)` instead of `tower.content`
   */
  placement?: CoursePlacement
  /** the hint that blends a word (English); unset (Hebrew): the run's own hint (a syllable's letter and vowel) */
  hint?: CourseHint
  lineAudioId(id: string, n?: number): string
  /** how many takes a line has (the run picks one: Hebrew `lineById`, English `enLine`; an unknown id has one) */
  lineVariations(id: string): number
}

export interface CoursePlacement {
  due(save: SavePort): boolean
  /** the placement's rounds over this save (they ask what its walk asks next) */
  tower(save: SavePort): TowerContent
  /** every round's walk time (the duel's walkOverride): the pace never adapts during the check */
  walkMs: number
  /**
   * one answer on the round of `target`, walked, credited and saved at once; `stage`: the stage it asked; `done`: he is
   * placed (his stage, his seeded tallies and the open stations are saved then)
   */
  answer(save: SavePort, right: boolean, target: string, at: number): { stage: number; done: { level: number; answers: number } | null }
}
