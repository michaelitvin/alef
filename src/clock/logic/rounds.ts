// Choosing the next round (spec: Round choice): sample candidates from the level mix, predict each candidate's
// mistake rate from its features, and take the one nearest one mistake in five.
import { pickNearTarget, predictedMistakeRate, type Rng, type Tally } from '../../shared/adaptive'
import { type ClockTime, HOURS, LEVEL_MINUTES, MAX_LEVEL, minutesUpTo, parseTimeId, timeId } from './time'
import type { Lang } from './phrases'
import { TRICK_FAMILIES, TRICK_PRIOR, makeOptions, shuffle, type Option, type OptionKind, type TrickFamily } from './tricks'
import { isNewTime } from './levels'
import { kindInfo, pickKind, type ClockKind } from './workday'
import type { Exercise, Hint, RoundPlan, Scaffolds } from './types'

export const EXERCISE_PRIOR: Record<Exercise, number> = {
  find: 0.04, what: 0.06, digitalPick: 0.06, setShort: 0.06, setLong: 0.08, setBoth: 0.12, digitalSet: 0.12,
}
export const MINUTE_PRIOR: Record<number, number> = {
  0: 0.02, 30: 0.04, 15: 0.06, 45: 0.1, 5: 0.1, 10: 0.1, 20: 0.1, 25: 0.12, 35: 0.14, 40: 0.14, 50: 0.14, 55: 0.14,
}
export const SCAFFOLD_PRIOR: Record<string, number> = { nonum: 0.1, quarters: 0.05, noslice: 0.04, nohint: 0.05, sec: 0.04 }
export const CANDIDATES = 24
export const NEW_SHARE = 0.7

const pick = <T,>(rng: Rng, xs: T[]) => xs[Math.floor(rng() * xs.length)]

export function exercisesFor(level: number): Exercise[] {
  const set: Exercise = level === 1 ? 'setShort' : level === 2 ? 'setLong' : 'setBoth'
  const out: Exercise[] = ['find', 'what', 'digitalPick', set]
  if (level >= 3) out.push('digitalSet')
  return out
}
/** The short hand follows the long hand on every level (the parent 2026-10-16: unlinked hands made impossible states). */
export const linkedHands = (_level: number) => true
export const optionKind = (e: Exercise): OptionKind | null =>
  e === 'find' ? 'clock' : e === 'what' ? 'phrase' : e === 'digitalPick' ? 'digital' : null
/** Which hands a Set exercise grades. */
export const checkFor = (e: Exercise) =>
  e === 'setShort' ? { hour: true, minute: false } : e === 'setLong' ? { hour: false, minute: true } : { hour: true, minute: true }

/** Rounds a hint shows by itself before it waits behind the hint button. */
export const HINT_AUTO = 6
/** The hint that fits a time: the quarters for :15/:30/:45, the minutes at each number for the other five-minute times. */
export const hintFor = (m: number): Hint | null => (m === 0 ? null : m % 15 === 0 ? 'quarters' : 'minutes')

export function scaffoldsFor(level: number, kind: ClockKind, rng: Rng, time: ClockTime = { h: 12, m: 0 }, hintsSeen: Partial<Record<Hint, number>> = {}): Scaffolds {
  const numbers: Scaffolds['numbers'] = level <= 5 ? 'all' : level === 6 ? pick(rng, ['all', 'quarters', 'none'] as const) : 'none'
  const hint = hintFor(time.m)
  return {
    numbers,
    slice: level >= 3 && level <= 6 ? rng() < 0.5 : false,
    hint,
    hintAuto: !!hint && (hintsSeen[hint] ?? 0) < HINT_AUTO,
    seconds: level >= 5 && kindInfo(kind).seconds,
  }
}

export function pickTime(rng: Rng, level: number): { time: ClockTime; isNew: boolean } {
  const fresh = LEVEL_MINUTES[Math.min(level, MAX_LEVEL)]
  const old = minutesUpTo(level - 1)
  const useNew = level >= MAX_LEVEL || old.length === 0 || rng() < NEW_SHARE
  const m = pick(rng, useNew ? fresh : old)
  return { time: { h: pick(rng, HOURS), m }, isNew: isNewTime(level, m) }
}

export function features(p: { exercise: Exercise; time: ClockTime; families: TrickFamily[]; scaffolds: Scaffolds; level: number }): string[] {
  const f = [`m:${p.time.m}`, `ex:${p.exercise}`]
  p.families.forEach((t) => f.push(`tr:${t}`))
  if (p.scaffolds.numbers === 'none') f.push('sc:nonum')
  else if (p.scaffolds.numbers === 'quarters') f.push('sc:quarters')
  if (p.level >= 3 && p.level <= 6 && !p.scaffolds.slice && p.time.m !== 0) f.push('sc:noslice')
  if (p.scaffolds.hint && !p.scaffolds.hintAuto) f.push('sc:nohint')
  if (p.scaffolds.seconds) f.push('sc:sec')
  return f
}

export function featurePrior(id: string): number {
  const [k, v] = id.split(':')
  if (k === 'm') return MINUTE_PRIOR[Number(v)] ?? 0.1
  if (k === 'ex') return EXERCISE_PRIOR[v as Exercise] ?? 0.08
  if (k === 'tr') return TRICK_PRIOR[v as TrickFamily] ?? 0.08
  return SCAFFOLD_PRIOR[v] ?? 0.05
}

/** Noisy-or: the round is missed if any of its features trips him. */
export function predict(feats: string[], tallies: Record<string, Tally>, recent: Record<string, string>): number {
  let ok = 1
  for (const f of feats) ok *= 1 - predictedMistakeRate(tallies[f], recent[f], featurePrior(f))
  return 1 - ok
}

/** The time he most often chose when `t` was asked (2+ times), if any. */
export function confusionPartner(confusions: Record<string, Record<string, number>>, t: ClockTime): ClockTime | null {
  const row = confusions[timeId(t)]
  if (!row) return null
  let best: [string, number] | null = null
  for (const [k, n] of Object.entries(row)) if (n >= 2 && (!best || n > best[1])) best = [k, n]
  return best ? parseTimeId(best[0]) : null
}

export interface RoundContext {
  level: number
  lang: Lang
  rng: Rng
  tallies: Record<string, Tally>
  recent: Record<string, string>
  confusions: Record<string, Record<string, number>>
  forcedKind?: ClockKind
  forcedTime?: ClockTime
  forcedExercise?: Exercise
  /** rounds each hint has shown by itself so far */
  hintsSeen?: Partial<Record<Hint, number>>
}

function candidate(c: RoundContext): RoundPlan {
  const { level, rng } = c
  const kind = pickKind(rng, level, c.forcedKind)
  const chosen = c.forcedExercise ?? pick(rng, exercisesFor(level))
  const { time, isNew } = c.forcedTime ? { time: c.forcedTime, isNew: isNewTime(level, c.forcedTime.m) } : pickTime(rng, level)
  // an o'clock long-hand target is ambiguous with linked hands (a drag 6 to 12 moves the short hand on): set the short hand
  const exercise: Exercise = chosen === 'setLong' && time.m === 0 ? 'setShort' : chosen
  const scaffolds = scaffoldsFor(level, kind, rng, time, c.hintsSeen)
  const ok = optionKind(exercise)
  let options: Option[] = []
  let correctIndex = -1
  let families: TrickFamily[] = []
  if (ok) {
    const pool = TRICK_FAMILIES.filter((f) => f !== 'seconds' || scaffolds.seconds)
    const r = makeOptions(time, ok, shuffle(rng, pool).slice(0, 2), rng, confusionPartner(c.confusions, time), minutesUpTo(level))
    ;({ options, correctIndex } = r)
    families = r.used
  }
  const trap = options.find((o) => o.family === 'seconds')
  const secondsAt = scaffolds.seconds ? (trap ? trap.pose.second ?? trap.pose.minute : rng() * 360) : undefined
  const feats = features({ exercise, time, families, scaffolds, level })
  return {
    exercise, time, isNew, lang: c.lang, level, kind, scaffolds, options, correctIndex, families,
    linked: linkedHands(level), secondsAt, features: feats, predicted: predict(feats, c.tallies, c.recent), digital40: rng() < 0.5,
  }
}

export function planRound(c: RoundContext): RoundPlan {
  const cands = Array.from({ length: CANDIDATES }, () => candidate(c))
  return cands[pickNearTarget(c.rng, cands.map((x) => x.predicted))]
}
