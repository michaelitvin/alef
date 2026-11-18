// The course seam: what Book 2's game reads from the course it plays (Hebrew letters, English words). The Hebrew course
// is today's modules (./hebrew.ts); the English course is built on its own page (src/english/course).
import type { createGameAudio } from '../../shared/gameAudio/kit'
import type { TelemetryLog } from '../../shared/telemetry'
import type { createTelemetry } from '../../shared/telemetry'
import type { ScreenId } from '../logic/predict'
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

/** Task 3 fills in the members */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CourseRounds {}

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
  lineAudioId(id: string, n?: number): string
}
