// Wrong answers that trick (spec: Trick families). Each family imitates one real misunderstanding; the round
// chooser picks families to keep him near one mistake in five.
import type { Rng } from '../../shared/adaptive'
import { type ClockTime, type HandPose, MINUTES, addMinutes, angleDiff, digital, hourAngle, minuteAngle, nextHour, poseOf, prevHour, readPose, sameTime } from './time'
import { phraseMinuteNumber } from './phrases'

export type TrickFamily = 'far' | 'hour1' | 'mirror' | 'swap' | 'notAdvanced' | 'numberAsMin' | 'five' | 'seconds'
export const TRICK_FAMILIES: TrickFamily[] = ['far', 'hour1', 'mirror', 'swap', 'notAdvanced', 'numberAsMin', 'five', 'seconds']
/** Prior chance he falls for each family, before any data (easiest first). */
export const TRICK_PRIOR: Record<TrickFamily, number> = {
  far: 0.02, hour1: 0.06, swap: 0.1, mirror: 0.12, seconds: 0.12, notAdvanced: 0.15, numberAsMin: 0.15, five: 0.18,
}

/** What the options are: clocks (find the clock), spoken phrases (what time is it) or digital cards. */
export type OptionKind = 'clock' | 'phrase' | 'digital'

export interface Option {
  /** null = the right answer; 'confusion' = a time he chose for this one before */
  family: TrickFamily | 'confusion' | null
  /** the clock drawn for this option (clock options) */
  pose: HandPose
  /** the time the option says or reads as; null when it is not a five-minute time (e.g. the "3:04" card) */
  time: ClockTime | null
  /** the digital card text */
  digital: string
}
type Made = Omit<Option, 'family'>

export function shuffle<T>(rng: Rng, xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const of = (time: ClockTime, pose: HandPose = poseOf(time)): Made => ({ time, pose, digital: digital(time.h, time.m) })
const hourDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 12 - Math.abs(a - b))

/** The twin with the same hour word: quarter past three ↔ quarter to three. None for o'clock and half past. */
export function mirrorTime(t: ClockTime): ClockTime | null {
  if (t.m === 0 || t.m === 30) return null
  return t.m < 30 ? { h: prevHour(t.h), m: 60 - t.m } : { h: nextHour(t.h), m: 60 - t.m }
}

/** One wrong answer of family `f`, or null when the family cannot apply here. */
export function trickOption(f: TrickFamily, t: ClockTime, kind: OptionKind, rng: Rng, known: number[] = MINUTES): Made | null {
  switch (f) {
    case 'far': {
      for (let i = 0; i < 30; i++) {
        const c = { h: 1 + Math.floor(rng() * 12), m: known[Math.floor(rng() * known.length)] }
        if (hourDistance(c.h, t.h) >= 3 && (c.m !== t.m || known.length === 1)) return of(c)
      }
      return of(addMinutes(t, 6 * 60))
    }
    case 'hour1':
      return of({ h: rng() < 0.5 ? nextHour(t.h) : prevHour(t.h), m: t.m })
    case 'mirror': {
      const mt = mirrorTime(t)
      return mt && of(mt)
    }
    case 'swap': {
      const pose = { hour: minuteAngle(t), minute: (Math.round(hourAngle(t) / 30) * 30) % 360 }
      if (angleDiff(pose.hour, hourAngle(t)) < 10 && angleDiff(pose.minute, minuteAngle(t)) < 10) return null
      const read = readPose(pose)
      if (sameTime(read, t)) return null
      // a clock shows the time the swapped hands are read as, with its hands where they belong (rule: never show an
      // impossible clock)
      return of(read)
    }
    case 'notAdvanced': {
      if (t.m < 30) return null
      // not as a clock: a short hand still on the hour number is an impossible clock, and beside the right one the two
      // pictures differ only by a few degrees (the parent 2026-10-17: two 9:30 clocks, "too confusing")
      if (kind === 'clock') return null
      return of({ h: nextHour(t.h), m: t.m })
    }
    case 'numberAsMin': {
      if (kind === 'digital') return t.m === 0 ? null : { ...of(t), time: null, digital: digital(t.h, t.m / 5) }
      if (kind === 'phrase') return null
      const n = phraseMinuteNumber(t.m)
      if (n !== 5 && n !== 10) return null
      const c = { h: t.h, m: (n * 5) % 60 }
      return sameTime(c, t) ? null : of(c)
    }
    case 'five':
      return of(addMinutes(t, rng() < 0.5 ? 5 : -5))
    case 'seconds': {
      // wrong minutes; on a clock the seconds hand sits where the right long hand would be
      const w = addMinutes(t, (rng() < 0.5 ? 1 : -1) * (10 + 5 * Math.floor(rng() * 3)))
      return kind === 'clock' ? { ...of(w), pose: { ...poseOf(w), second: minuteAngle(t) } } : of(w)
    }
  }
}

/**
 * Three options: the right one, a confused time if he has one, then the families in order, then 'far' to fill.
 * Options are distinct in what the child compares: the hands (clock), the time (phrase) or the card (digital).
 */
export function makeOptions(t: ClockTime, kind: OptionKind, families: TrickFamily[], rng: Rng, confusion?: ClockTime | null, known: number[] = MINUTES) {
  const out: Option[] = [{ family: null, ...of(t) }]
  const used: TrickFamily[] = []
  const distinct = (o: Made) =>
    out.every((x) =>
      kind === 'clock'
        ? !(angleDiff(x.pose.hour, o.pose.hour) < 4 && angleDiff(x.pose.minute, o.pose.minute) < 4)
        : kind === 'phrase'
          ? !(x.time && o.time && sameTime(x.time, o.time))
          : x.digital !== o.digital,
    )
  // the playtest: "ten to eleven" among the answers on level 1. An answer says only minutes he has learned; a clock
  // picture of a misreading (swapped hands, the short hand not moved on, the seconds trap) stays, as its hands are the trick
  const learned = (o: Made, f: TrickFamily | 'confusion') =>
    !o.time || known.includes(o.time.m) || f === 'confusion' || (kind === 'clock' && (f === 'swap' || f === 'seconds'))
  const usable = (o: Made | null, f: TrickFamily | 'confusion'): o is Made => !!o && (kind !== 'phrase' || o.time !== null) && distinct(o) && learned(o, f)

  if (confusion && !sameTime(confusion, t)) {
    const c = of(confusion)
    if (usable(c, 'confusion')) out.push({ family: 'confusion', ...c })
  }
  for (const f of families) {
    if (out.length >= 3) break
    const o = trickOption(f, t, kind, rng, known)
    if (usable(o, f)) {
      out.push({ family: f, ...o })
      used.push(f)
    }
  }
  for (let guard = 0; out.length < 3 && guard < 60; guard++) {
    const o = trickOption('far', t, kind, rng, known)
    if (usable(o, 'far')) {
      out.push({ family: 'far', ...o })
      used.push('far')
    }
  }
  const options = shuffle(rng, out)
  return { options, correctIndex: options.findIndex((o) => o.family === null), used }
}
