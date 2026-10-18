// Levels and explanations (spec: Levels, Explanations).
import { LEVEL_MINUTES, MAX_LEVEL } from './time'
import type { Exercise, Scaffolds } from './types'

/** Michael chose fast-forward over a placement test: the first 5 rounds on a level's new times all right pass it. */
export const FAST_FORWARD = 5
export const PASS_WINDOW = 10
export const PASS_CORRECT = 8

export interface LevelProgress {
  level: number
  /** answers on this level's new times, oldest first (o right, x wrong) */
  newAnswers: string
}
export const START_PROGRESS: LevelProgress = { level: 1, newAnswers: '' }


export const isNewTime = (level: number, m: number) => LEVEL_MINUTES[Math.min(level, MAX_LEVEL)].includes(m)

export function recordNewAnswer(p: LevelProgress, correct: boolean): { progress: LevelProgress; passed: boolean } {
  const newAnswers = p.newAnswers + (correct ? 'o' : 'x')
  if (p.level >= MAX_LEVEL) return { progress: { ...p, newAnswers: newAnswers.slice(-PASS_WINDOW) }, passed: false }
  const fast = newAnswers.length === FAST_FORWARD && !newAnswers.includes('x')
  const last = newAnswers.slice(-PASS_WINDOW)
  const steady = newAnswers.length >= PASS_WINDOW && [...last].filter((c) => c === 'o').length >= PASS_CORRECT
  if (fast || steady) return { progress: { level: p.level + 1, newAnswers: '' }, passed: true }
  return { progress: { ...p, newAnswers: newAnswers.slice(-50) }, passed: false }
}

export type ExplainId =
  | 'hands' | 'level-2' | 'level-3' | 'level-4' | 'level-5' | 'level-6' | 'nonumbers'
  | 'ex-find' | 'ex-what' | 'ex-set' | 'ex-digital' | 'seconds'
  | 'fix-swap' | 'fix-notAdvanced' | 'fix-mirror' | 'fix-numberAsMin' | 'fix-hour1' | 'fix-five'

export interface ExplainState {
  /** round number at which each explanation last played */
  explained: Partial<Record<ExplainId, number>>
  roundNo: number
  mistakes: { round: number; tag: string }[]
}

export const exerciseIntro = (e: Exercise): ExplainId =>
  e === 'find' ? 'ex-find' : e === 'what' ? 'ex-what' : e === 'digitalPick' || e === 'digitalSet' ? 'ex-digital' : 'ex-set'

/** Explanations to play before this round, in order: first appearance of each element. */
export function introsFor(
  s: ExplainState,
  plan: { level: number; isNew: boolean; exercise: Exercise; scaffolds: Scaffolds; time?: { m: number }; digital40?: boolean },
): ExplainId[] {
  const out: ExplainId[] = []
  const fresh = (id: ExplainId) => s.explained[id] === undefined
  if (fresh('hands')) out.push('hands')
  // level 6 explains the "to" side: it waits for a round whose phrase says "to" (:35, and :40 read as "forty", do not)
  const saysTo = !plan.time || plan.time.m === 50 || plan.time.m === 55 || (plan.time.m === 40 && !plan.digital40)
  if (plan.isNew && plan.level >= 2 && plan.level <= 6 && (plan.level !== 6 || saysTo)) {
    const id = `level-${plan.level}` as ExplainId
    if (fresh(id)) out.push(id)
  }
  if (plan.scaffolds.numbers === 'none' && fresh('nonumbers')) out.push('nonumbers')
  if (plan.scaffolds.seconds && fresh('seconds')) out.push('seconds')
  const ex = exerciseIntro(plan.exercise)
  if (fresh(ex)) out.push(ex)
  // digital → clock is a Set exercise too: the finger demo comes with it if he has not seen it yet
  if (plan.exercise === 'digitalSet' && fresh('ex-set')) out.push('ex-set')
  return out
}

/** Rounds before the same mistake's explanation may play again (the parent 2026-10-17: an explanation from time to time) */
export const FIX_COOLDOWN = 6
export const FIX_FOR: Record<string, ExplainId | undefined> = {
  swap: 'fix-swap', notAdvanced: 'fix-notAdvanced', mirror: 'fix-mirror', numberAsMin: 'fix-numberAsMin',
  hour1: 'fix-hour1', five: 'fix-five', seconds: 'seconds',
}

/** The explanation for the mistake just made (its trick tag), unless it played in the last FIX_COOLDOWN rounds. */
export function fixFor(s: Pick<ExplainState, 'explained' | 'roundNo'>, tag: string | null): ExplainId | null {
  const id = tag ? FIX_FOR[tag] : undefined
  if (!id) return null
  const last = s.explained[id]
  return last === undefined || s.roundNo - last >= FIX_COOLDOWN ? id : null
}
