// Grading a set clock, and naming the mistake (spec: Set the clock error classes, Near miss).
import type { Exercise } from './types'
import { type ClockTime, type HandPose, angleDiff, hourAngle, minuteAngle, nextHour, norm, readPose, sameTime } from './time'
import { phraseMinuteNumber, saysTo } from './phrases'
import type { Option, TrickFamily } from './tricks'

/** The short hand passes within this many degrees of its true angle (half past on a number is 15° off: fails). */
const HOUR_TOLERANCE = 12
export type SetError = 'toAsPast' | 'swap' | 'notAdvanced' | 'mirror' | 'numberAsMin' | 'five' | 'hour1' | 'other'

/** The long hand snaps to five-minute marks. */
export const snapMinute = (a: number) => (Math.round(norm(a) / 30) * 30) % 360

/** What the round said to him: only the rounds where he heard the phrase can show the "to" read as "past". */
export interface GradeContext { exercise: Exercise; digital40: boolean }
const HEARD: Exercise[] = ['find', 'what', 'setShort', 'setLong', 'setBoth']
/** The "to" time he heard as "past": 3:45 → 4:15, 3:50 → 4:10. Null when this round did not say "to". */
function toAsPastTime(t: ClockTime, ctx?: GradeContext): ClockTime | null {
  if (!ctx || !HEARD.includes(ctx.exercise) || !saysTo(t.m, ctx.digital40)) return null
  return { h: nextHour(t.h), m: 60 - t.m }
}

export function gradeSet(t: ClockTime, set: HandPose, check: { hour: boolean; minute: boolean }, ctx?: GradeContext): { correct: boolean; error: SetError | null } {
  const hourOk = !check.hour || angleDiff(set.hour, hourAngle(t)) <= HOUR_TOLERANCE
  const minOk = !check.minute || angleDiff(set.minute, minuteAngle(t)) < 1
  if (hourOk && minOk) return { correct: true, error: null }
  const tp = toAsPastTime(t, ctx)
  if (tp && angleDiff(set.minute, minuteAngle(tp)) < 1 && angleDiff(set.hour, hourAngle(tp)) <= HOUR_TOLERANCE) return { correct: false, error: 'toAsPast' }
  return { correct: false, error: classify(t, set, hourOk, minOk) }
}

function classify(t: ClockTime, set: HandPose, hourOk: boolean, minOk: boolean): SetError {
  const ma = minuteAngle(t)
  const ha = hourAngle(t)
  if (!hourOk && !minOk && angleDiff(set.minute, ha) <= 15 && angleDiff(set.hour, ma) <= 15) return 'swap'
  if (hourOk && !minOk) {
    if (t.m !== 0 && t.m !== 30 && angleDiff(set.minute, 360 - ma) < 1) return 'mirror'
    if (angleDiff(set.minute, ma) <= 31) return 'five'
    const n = phraseMinuteNumber(t.m)
    if (n >= 1 && n <= 12 && angleDiff(set.minute, n * 30) < 1) return 'numberAsMin'
    return 'other'
  }
  if (minOk && !hourOk) {
    if (t.m >= 15 && angleDiff(set.hour, (t.h % 12) * 30) <= 3) return 'notAdvanced'
    if (angleDiff(set.hour, ha) <= 30 + HOUR_TOLERANCE) return 'hour1'
  }
  return 'other'
}

export interface Evaluation {
  correct: boolean
  /** five off in Set the clock, the first time in this round: he may try again */
  nearMiss: boolean
  /** what the mistake was: the chosen option's family, or the set-clock error class */
  tag: TrickFamily | SetError | 'confusion' | null
  /** the time he chose (or set), when it is a real time; for confusions */
  chosen: ClockTime | null
}

export function evaluateChoice(options: Option[], correctIndex: number, index: number, ctx?: GradeContext): Evaluation {
  const o = options[index]
  const correct = index === correctIndex
  const right = options[correctIndex]?.time
  const tp = right ? toAsPastTime(right, ctx) : null
  const tag = correct ? null : tp && o.time && sameTime(o.time, tp) ? 'toAsPast' : o.family
  return { correct, nearMiss: false, tag, chosen: o.time }
}

export function evaluateSet(t: ClockTime, set: HandPose, check: { hour: boolean; minute: boolean }, nearMissUsed: boolean, ctx?: GradeContext): Evaluation {
  const g = gradeSet(t, set, check, ctx)
  return { correct: g.correct, nearMiss: !g.correct && g.error === 'five' && !nearMissUsed, tag: g.error, chosen: g.correct ? null : readPose(set) }
}
