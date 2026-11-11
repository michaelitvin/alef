// The run (spec: Run; one duel, Part 1): the screens in a fixed cycle; the hearts last the whole run, and one comes back
// at the end of each pass (one trip through the cycle); the next run starts at the screen after the one where the last
// ended (Michael, 2026-10-19); the streak multiplier of the coins; the broom flight's timing.
import type { Stage } from './content.ts'
import type { ScreenId } from './predict'
import { screensOfStage } from './stages'

export const CYCLE: ScreenId[] = ['broom', 'cauldron', 'ladder', 'ghosts', 'doors']
/** the two drawing screens (print, then handwriting) go after the doors, when drawing is on (spec: one duel, Part 5) */
const ORDER: ScreenId[] = ['broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'draw', 'draw-hand']
const DRAWING: ScreenId[] = ['draw', 'draw-hand']
/** waves / rounds / rungs / rounds / doors / words / words per visit (spec: visit lengths, tune in playtest) */
export const VISIT: Record<ScreenId, number> = { broom: 10, cauldron: 4, ladder: 5, ghosts: 4, doors: 3, draw: 3, 'draw-hand': 3 }
export const HEARTS = 3
/** broom: a new target after this many catches */
export const TARGET_EVERY = 3

export const cycleOf = (stage: Stage, draw = false): ScreenId[] =>
  ORDER.filter((s) => (DRAWING.includes(s) ? draw : screensOfStage(stage).includes(s)))

/** The screen after `current` (which need not be in the cycle, e.g. drawing turned off since). */
export function nextScreen(stage: Stage, current: ScreenId, draw = false): { screen: ScreenId; newCycle: boolean } {
  const c = cycleOf(stage, draw)
  const at = ORDER.indexOf(current)
  const after = c.find((s) => ORDER.indexOf(s) > at)
  return after ? { screen: after, newCycle: false } : { screen: c[0], newCycle: true }
}

export function runStart(stage: Stage, lastEnded: ScreenId | null, draw = false): ScreenId {
  const c = cycleOf(stage, draw)
  // a screen that is not in the cycle (another stage's, or drawing turned off) starts the cycle over
  if (!lastEnded || !c.includes(lastEnded)) return c[0]
  return nextScreen(stage, lastEnded, draw).screen
}

export interface Hearts { left: number; nearMissUsed: boolean }
/** the hearts of a run: they do not refill when a new screen starts (spec: one duel, Part 1) */
export const heartsAtRunStart = (): Hearts => ({ left: HEARTS, nearMissUsed: false })
/** the end of a pass: one heart comes back, never more than HEARTS */
export function passEndHeart(h: Hearts): { hearts: Hearts; gained: boolean } {
  if (h.left >= HEARTS) return { hearts: h, gained: false }
  return { hearts: { ...h, left: h.left + 1 }, gained: true }
}

/** the streak multiplier: x1 for a streak of 0-4, x2 for 5-9, x3 for 10 or more */
export const multiplierOf = (streak: number): 1 | 2 | 3 => (streak >= 10 ? 3 : streak >= 5 ? 2 : 1)
/** the coins of a right answer; `streak` counts this answer */
export const coinsFor = (streak: number): number => multiplierOf(streak)
export const newRound = (h: Hearts): Hearts => ({ ...h, nearMissUsed: false })

export function onAnswer(h: Hearts, a: 'right' | 'wrong' | 'near'): { hearts: Hearts; forgiven: boolean; over: boolean } {
  if (a === 'right') return { hearts: h, forgiven: false, over: false }
  if (a === 'near' && !h.nearMissUsed) return { hearts: { ...h, nearMissUsed: true }, forgiven: true, over: false }
  const left = Math.max(0, h.left - 1)
  return { hearts: { left, nearMissUsed: h.nearMissUsed || a === 'near' }, forgiven: false, over: left === 0 }
}

// broom timing
/** base travel time of an orb (spec 2026-11-07: 5800, was 5200; the per-lap speed-up is gone: the flight follows him) */
export const BASE_TRAVEL_MS = 5800
export const travelMs = (pace: number) => BASE_TRAVEL_MS * pace
/** Book 2's own pace rule (the duel keeps its own): a catch speeds the flight up 1%, a mistake slows it 4% (was 12%). */
export function flightPace(pace: number, r: 'catch' | 'miss'): number {
  return Math.min(PACE_MAX, Math.max(PACE_MIN, pace * (r === 'catch' ? 0.99 : 1.04)))
}
/** 1 at the right edge → 0 at the wizard */
export const waveX = (startMs: number, nowMs: number, travel: number) => Math.min(1, Math.max(0, 1 - (nowMs - startMs) / travel))
/** a wave resolves when it is this close to the wizard (0 = at the wizard, 1 = at the right edge) */
export const CATCH_AT = 0.04
/** unclamped below: an orb flies on past the wizard (negative = behind his front) */
export const wavePos = (startMs: number, nowMs: number, travel: number) => Math.min(1, 1 - (nowMs - startMs) / travel)
/** the target counts as missed only when its centre is past the wizard's back (Michael: it failed while it still overlapped him) */
export const PASS_AT = -0.07

/**
 * One tick of a wave (forgiving for a child): the target is caught while it overlaps him in his lane (CATCH_AT to
 * PASS_AT) and missed only once it has passed him; a wrong orb hits only if he is in its lane when it reaches him. `k` = each orb's wavePos, `isTarget` = it carries the target sound.
 */
export function orbEvents(k: number[], resolved: boolean[], lane: number, isTarget: boolean[], lanes?: number[]): { resolved: boolean[]; hit: number | null; missedTarget: boolean } {
  const r = [...resolved]
  for (let i = 0; i < k.length; i++) {
    if (r[i]) continue
    // `lanes`: each orb's lane (a two-orb wave); by default an orb's lane is its index
    const inLane = (lanes?.[i] ?? i) === lane
    if (isTarget[i]) {
      // the target: caught any time it overlaps him in his lane; missed only once it has passed him
      if (inLane && k[i] <= CATCH_AT && k[i] >= PASS_AT) { r[i] = true; return { resolved: r, hit: i, missedTarget: false } }
      if (k[i] < PASS_AT) { r[i] = true; return { resolved: r, hit: null, missedTarget: true } }
    } else if (k[i] <= CATCH_AT) {
      // a wrong orb hits only if he is in its lane when it reaches him; moving into one that is already passing is no hit
      r[i] = true
      if (inLane) return { resolved: r, hit: i, missedTarget: false }
    }
  }
  return { resolved: r, hit: null, missedTarget: false }
}
export const LANES = 3
export const laneAt = (y01: number): 0 | 1 | 2 => Math.min(2, Math.max(0, Math.floor(y01 * LANES))) as 0 | 1 | 2
import { PACE_MIN, PACE_MAX } from '../../utils/duel/rules'
export { PACE_MIN, PACE_MAX }
