// Stages (spec: Content → Stages): letters → plain syllables → the dot changes the sound → words. A stage passes like a
// clock level: the first 5 answers on its new items all right, or 8 of the last 10.
import type { ScreenId } from './predict'

const FAST_FORWARD = 5
const PASS_WINDOW = 10
const PASS_CORRECT = 8
/** share of rounds aimed at the newest stage's items */
export const NEW_SHARE = 0.6

export interface StageProgress { stage: number; newAnswers: string }
export const START_STAGE: StageProgress = { stage: 1, newAnswers: '' }

/** a stage's new-item answers ('o' right, 'x' wrong) pass it: the first 5 all right, or 8 of the last 10 */
export function stagePassed(newAnswers: string): boolean {
  const fast = newAnswers.length === FAST_FORWARD && !newAnswers.includes('x')
  const last = newAnswers.slice(-PASS_WINDOW)
  const steady = newAnswers.length >= PASS_WINDOW && [...last].filter((c) => c === 'o').length >= PASS_CORRECT
  return fast || steady
}
/** the answers kept at a stage that cannot pass (the last stage): the pass window */
export const keptAtLastStage = (newAnswers: string): string => newAnswers.slice(-PASS_WINDOW)
/** the answers kept while a stage has not passed yet */
export const keptAnswers = (newAnswers: string): string => newAnswers.slice(-50)

export function recordStageAnswer(p: StageProgress, correct: boolean): { progress: StageProgress; passed: boolean } {
  const newAnswers = p.newAnswers + (correct ? 'o' : 'x')
  if (p.stage >= 4) return { progress: { ...p, newAnswers: keptAtLastStage(newAnswers) }, passed: false }
  if (stagePassed(newAnswers)) return { progress: { stage: p.stage + 1, newAnswers: '' }, passed: true }
  return { progress: { ...p, newAnswers: keptAnswers(newAnswers) }, passed: false }
}

export function screensOfStage(stage: number): ScreenId[] {
  if (stage === 1) return ['broom', 'ghosts']
  if (stage < 4) return ['broom', 'cauldron', 'ladder', 'ghosts']
  // the spell book opens with the doors (writing after reading: it comes after them in the cycle)
  return ['broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'spell']
}
