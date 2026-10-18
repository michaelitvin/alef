// Clock time model: 12-hour times on five-minute steps, and the hand angles that show them.
// Angles are degrees clockwise from 12 o'clock. Loaded by plain Node (export script): erasable TS only.

export interface ClockTime {
  /** 1..12 */
  h: number
  /** 0..55, a multiple of 5 */
  m: number
}

/** Where the hands point. A pose need not be a real time: tricks bend it. */
export interface HandPose {
  hour: number
  minute: number
  /** the seconds hand, when the clock shows one */
  second?: number
}

export const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
export const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export const timeId = (t: ClockTime) => `${t.h}-${String(t.m).padStart(2, '0')}`
export function parseTimeId(id: string): ClockTime {
  const [h, m] = id.split('-').map(Number)
  return { h, m }
}
export const sameTime = (a: ClockTime, b: ClockTime) => a.h === b.h && a.m === b.m
export const nextHour = (h: number) => (h % 12) + 1
export const prevHour = (h: number) => ((h + 10) % 12) + 1

/** Adds minutes (may be negative), wrapping round the 12 hours. */
export function addMinutes(t: ClockTime, d: number): ClockTime {
  const total = ((((t.h % 12) * 60 + t.m + d) % 720) + 720) % 720
  const h = Math.floor(total / 60)
  return { h: h === 0 ? 12 : h, m: total % 60 }
}

export const norm = (a: number) => ((a % 360) + 360) % 360
/** Smallest difference between two angles, 0..180. */
export function angleDiff(a: number, b: number) {
  const d = Math.abs(norm(a) - norm(b))
  return d > 180 ? 360 - d : d
}
/** Signed change from a to b, in (-180, 180]. */
export function angleDelta(a: number, b: number) {
  let d = norm(b) - norm(a)
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

export const hourAngle = (t: ClockTime) => norm(((t.h % 12) + t.m / 60) * 30)
export const minuteAngle = (t: ClockTime) => t.m * 6
export const poseOf = (t: ClockTime): HandPose => ({ hour: hourAngle(t), minute: minuteAngle(t) })

/** How a pose reads: the hour number the short hand has passed, the long hand to the nearest five minutes. */
export function readPose(p: HandPose): ClockTime {
  const h = Math.floor(norm(p.hour) / 30)
  return { h: h === 0 ? 12 : h, m: (Math.round(norm(p.minute) / 30) * 5) % 60 }
}

/** "3:05": 12-hour, no AM/PM, minutes always two digits. */
export const digital = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`

/** The new times each level teaches (level 7 = all of them, on faces with no numbers). */
export const LEVEL_MINUTES: Record<number, number[]> = {
  1: [0], 2: [30], 3: [15], 4: [45], 5: [5, 10, 20, 25], 6: [35, 40, 50, 55], 7: [...MINUTES],
}
export const MAX_LEVEL = 7

/** Every minute value that levels 1..level teach, ascending. */
export function minutesUpTo(level: number): number[] {
  const s = new Set<number>()
  for (let l = 1; l <= Math.min(level, MAX_LEVEL); l++) LEVEL_MINUTES[l].forEach((m) => s.add(m))
  return [...s].sort((a, b) => a - b)
}
