// The course seam: what Book 2's game reads from the course it plays (Hebrew letters, English words). The Hebrew course
// is today's modules (./hebrew.ts); the English course is built on its own page (src/english/course).
import type { createGameAudio } from '../../shared/gameAudio/kit'
import type { DuelAudio } from '../../utils/duel/controller'
import type { TowerContent } from '../../utils/duel/content'
import type { DuelTallies } from '../../utils/duel/tallies'
import type { TelemetryLog, createTelemetry } from '../../shared/telemetry'
import type { Word } from '../data/words'
import type { BossKind } from '../logic/boss'
import type { Item, Mark, MarkId, Syllable } from '../logic/content'
import type { drawWords } from '../logic/draw'
import type { ScreenId } from '../logic/predict'
import type { Choice, Kind, LadderStep, RoundCtx } from '../logic/rounds'
import type { StageProgress } from '../logic/stages'
import type { SavePort } from '../savePort'

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
  broomTarget: (ctx: RoundCtx, kind: Kind, avoid?: string, screen?: ScreenId) => Choice
  broomWave: (ctx: RoundCtx, target: Choice, kind: Kind) => Choice[]
  cauldronRound: (ctx: RoundCtx, avoid?: string) => { letter: Item; target: Syllable; orbs: Mark[] }
  ghostRound: (ctx: RoundCtx, kind: Kind, avoid?: string) => { target: Choice; signs: Choice[] }
  ladderPlan: (ctx: RoundCtx, rungs: number, force?: LadderFixed) => { fixed: LadderFixed; steps: LadderStep[] }
  isNewStageChoice: (stage: number, c: Choice) => boolean
  letterChoice: (it: Item) => Choice
  /** the features of an answer (logic/predict): what its tallies are kept under */
  features: (c: Choice, screen: ScreenId) => string[]
  /** the doors' words of a visit */
  doorWords: (ctx: RoundCtx, n: number) => Word[]
  /** the keys of a door (its word among them) */
  doorKeys: (ctx: RoundCtx, word: Word) => Word[]
  wordLinkFor: (itemId: string, markId: MarkId, rng?: () => number) => Word | undefined
  /** the dotted pair to introduce before a round (Hebrew only; English returns null) */
  dotIntroFor: (targetItem: string, stage: number, seen: string[]) => string | null
  drawWords: (ctx: DrawCtx, n?: number) => Word[]
  bossTarget: (ctx: RoundCtx, kind: BossKind, avoid?: string) => Choice
  bossWave: (ctx: RoundCtx, kind: BossKind, target: Choice) => Choice[]
}
type LadderFixed = 'letter' | 'vowel' | 'dot'
type DrawCtx = Parameters<typeof drawWords>[0]

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
  images: Record<string, string>
  /** the shell's preload (useGameShell's `preload`) */
  preload: () => Promise<void>
  /** the boy and girl pictures of the play gate's question, and its line id */
  genderPictures: { boy: string; girl: string; askLine: string }
  /**
   * the tower (the first duel's board): its rounds and spoken parts, where its answers are kept (lazy, like `save`), and
   * the duel's line player (default: the duel's own audio)
   */
  tower: { content: TowerContent; tallies: () => DuelTallies; audio?: DuelAudio }
  lineAudioId(id: string, n?: number): string
}
