// Levels and explanations (spec: Levels, Explanations).
import { LEVEL_MINUTES, MAX_LEVEL } from './time'
import { saysTo } from './phrases'
import type { Exercise, Scaffolds } from './types'

/** Michael chose fast-forward over a placement test: 5 answers on a level's new times, all right, with a spoken set round among them, pass it. */
const FAST_FORWARD = 5
const PASS_WINDOW = 10
const PASS_CORRECT = 8
/** the set window: 3 right of the last 5 spoken set rounds (setting is harder than choosing) */
const SET_WINDOW = 5
const SET_CORRECT = 3
const KEEP = 50

export interface LevelProgress {
  level: number
  /** answers on this level's new times, oldest first (o right, x wrong): every exercise except the spoken set ones */
  newAnswers: string
  /** the spoken set rounds (setShort, setLong, setBoth) on this level's new times, oldest first */
  newSetAnswers: string
}
export const START_PROGRESS: LevelProgress = { level: 1, newAnswers: '', newSetAnswers: '' }

export const isNewTime = (level: number, m: number) => LEVEL_MINUTES[Math.min(level, MAX_LEVEL)].includes(m)

const SPOKEN_SET: Exercise[] = ['setShort', 'setLong', 'setBoth']
export const isSpokenSet = (e: Exercise) => SPOKEN_SET.includes(e)
const rights = (s: string) => [...s].filter((c) => c === 'o').length

const choicePasses = (a: string) => a.length >= PASS_WINDOW && rights(a.slice(-PASS_WINDOW)) >= PASS_CORRECT
const setPasses = (a: string) => a.length >= SET_WINDOW && rights(a.slice(-SET_WINDOW)) >= SET_CORRECT

export function recordNewAnswer(p: LevelProgress, correct: boolean, exercise: Exercise): { progress: LevelProgress; passed: boolean } {
  const mark = correct ? 'o' : 'x'
  const isSet = isSpokenSet(exercise)
  const prevSet = p.newSetAnswers ?? ''
  const newAnswers = isSet ? p.newAnswers : p.newAnswers + mark
  const newSetAnswers = isSet ? prevSet + mark : prevSet
  if (p.level >= MAX_LEVEL) return { progress: { ...p, newAnswers: newAnswers.slice(-PASS_WINDOW), newSetAnswers: newSetAnswers.slice(-SET_WINDOW) }, passed: false }
  // fast-forward holds only while the windows still hold every answer on this level (shorter than KEEP): an old mistake cannot scroll out
  const whole = newAnswers.length < KEEP && newSetAnswers.length < KEEP
  const fast = whole && newAnswers.length + newSetAnswers.length >= FAST_FORWARD && newSetAnswers.length >= 1 && !newAnswers.includes('x') && !newSetAnswers.includes('x')
  const steady = choicePasses(newAnswers) && setPasses(newSetAnswers)
  if (fast || steady) return { progress: { level: p.level + 1, newAnswers: '', newSetAnswers: '' }, passed: true }
  return { progress: { ...p, newAnswers: newAnswers.slice(-KEEP), newSetAnswers: newSetAnswers.slice(-KEEP) }, passed: false }
}

/** The choice window passes but the set window does not: every 3rd round is then a spoken set round on a new time. */
export function needsSetRound(p: LevelProgress, roundNo: number): boolean {
  return p.level < MAX_LEVEL && roundNo % 3 === 0 && choicePasses(p.newAnswers) && !setPasses(p.newSetAnswers ?? '')
}

export type ExplainId =
  | 'hands' | 'level-2' | 'level-3' | 'level-4' | 'level-5' | 'level-6' | 'nonumbers'
  | 'ex-find' | 'ex-what' | 'ex-set' | 'ex-digital' | 'seconds'
  | 'fix-swap' | 'fix-notAdvanced' | 'fix-mirror' | 'fix-numberAsMin' | 'fix-hour1' | 'fix-five' | 'fix-toAsPast'

interface ExplainState {
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
  const toSide = !plan.time || saysTo(plan.time.m, !!plan.digital40)
  if (plan.isNew && plan.level >= 2 && plan.level <= 6 && (plan.level !== 6 || toSide)) {
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
const FIX_COOLDOWN = 6
const FIX_FOR: Record<string, ExplainId | undefined> = {
  swap: 'fix-swap', notAdvanced: 'fix-notAdvanced', mirror: 'fix-mirror', numberAsMin: 'fix-numberAsMin',
  hour1: 'fix-hour1', five: 'fix-five', toAsPast: 'fix-toAsPast', seconds: 'seconds',
}

/** The explanation for the mistake just made (its trick tag), unless it played in the last FIX_COOLDOWN rounds. */
export function fixFor(s: Pick<ExplainState, 'explained' | 'roundNo'>, tag: string | null): ExplainId | null {
  const id = tag ? FIX_FOR[tag] : undefined
  if (!id) return null
  const last = s.explained[id]
  return last === undefined || s.roundNo - last >= FIX_COOLDOWN ? id : null
}
