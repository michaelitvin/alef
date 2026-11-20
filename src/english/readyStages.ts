// The stages this build has the content of (content/ready.ts), and the English stage rule over them: the one rule that
// the course (course.ts), the real save and the save in memory (store.ts) all use.
import type { StageProgress } from '../duel2/logic/stages'
import { ENGLISH_VOICE_URLS } from './assets/audioFiles'
import { contentStages } from './content/ready'
import { enRecordStageAnswer } from './logic/stages'

/** strict in the staging and production builds; dev, tests and the verify build (VITE_DUEL2_TEST) open every stage with words */
const strict = !import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_DUEL2_TEST !== '1'

export const READY_STAGES: number[] = contentStages({ strict, voices: new Set(Object.keys(ENGLISH_VOICE_URLS)) })

/** the English stage rule (the course's recordStageAnswer and the store's) */
export const englishStageRule = (p: StageProgress, correct: boolean): { progress: StageProgress; passed: boolean } =>
  enRecordStageAnswer(p, correct, READY_STAGES)
