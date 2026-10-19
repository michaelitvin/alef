// Stages (spec: Content → Stages): letters → plain syllables → the dot changes the sound → words. A stage passes like a
// clock level: the first 5 answers on its new items all right, or 8 of the last 10.
import type { Stage } from './content.ts'
import type { ScreenId } from './predict'

export const FAST_FORWARD = 5
export const PASS_WINDOW = 10
export const PASS_CORRECT = 8
/** share of rounds aimed at the newest stage's items */
export const NEW_SHARE = 0.6

export interface StageProgress { stage: Stage; newAnswers: string }
export const START_STAGE: StageProgress = { stage: 1, newAnswers: '' }

export function recordStageAnswer(p: StageProgress, correct: boolean): { progress: StageProgress; passed: boolean } {
  const newAnswers = p.newAnswers + (correct ? 'o' : 'x')
  if (p.stage >= 4) return { progress: { ...p, newAnswers: newAnswers.slice(-PASS_WINDOW) }, passed: false }
  const fast = newAnswers.length === FAST_FORWARD && !newAnswers.includes('x')
  const last = newAnswers.slice(-PASS_WINDOW)
  const steady = newAnswers.length >= PASS_WINDOW && [...last].filter((c) => c === 'o').length >= PASS_CORRECT
  if (fast || steady) return { progress: { stage: (p.stage + 1) as Stage, newAnswers: '' }, passed: true }
  return { progress: { ...p, newAnswers: newAnswers.slice(-50) }, passed: false }
}

export function screensOfStage(stage: Stage): ScreenId[] {
  if (stage === 1) return ['broom', 'ghosts']
  if (stage < 4) return ['broom', 'cauldron', 'ladder', 'ghosts']
  return ['broom', 'cauldron', 'ladder', 'ghosts', 'doors']
}
