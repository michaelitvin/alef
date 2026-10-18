// Grading a set clock, and naming the mistake (spec: Set the clock error classes, Near miss).
import { type ClockTime, type HandPose, angleDiff, hourAngle, minuteAngle, norm, readPose } from './time'
import { phraseMinuteNumber } from './phrases'
import type { Option, TrickFamily } from './tricks'

/** The short hand passes within this many degrees of its true angle (half past on a number is 15° off: fails). */
export const HOUR_TOLERANCE = 12
export type SetError = 'swap' | 'notAdvanced' | 'mirror' | 'numberAsMin' | 'five' | 'hour1' | 'other'

/** The long hand snaps to five-minute marks. */
export const snapMinute = (a: number) => (Math.round(norm(a) / 30) * 30) % 360

export function gradeSet(t: ClockTime, set: HandPose, check: { hour: boolean; minute: boolean }): { correct: boolean; error: SetError | null } {
  const hourOk = !check.hour || angleDiff(set.hour, hourAngle(t)) <= HOUR_TOLERANCE
  const minOk = !check.minute || angleDiff(set.minute, minuteAngle(t)) < 1
  if (hourOk && minOk) return { correct: true, error: null }
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

export function evaluateChoice(options: Option[], correctIndex: number, index: number): Evaluation {
  const o = options[index]
  const correct = index === correctIndex
  return { correct, nearMiss: false, tag: correct ? null : o.family, chosen: o.time }
}

export function evaluateSet(t: ClockTime, set: HandPose, check: { hour: boolean; minute: boolean }, nearMissUsed: boolean): Evaluation {
  const g = gradeSet(t, set, check)
  return { correct: g.correct, nearMiss: !g.correct && g.error === 'five' && !nearMissUsed, tag: g.error, chosen: g.correct ? null : readPose(set) }
}
