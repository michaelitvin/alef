// The run (spec: Run): the screens in a fixed cycle; hearts refill when a new screen starts and the next run starts at the
// screen after the one where the last ended (Michael, 2026-10-19); the broom flight's timing.
import type { Stage } from './content.ts'
import type { ScreenId } from './predict'
import { screensOfStage } from './stages'

export const CYCLE: ScreenId[] = ['broom', 'cauldron', 'ladder', 'ghosts', 'doors']
/** waves / rounds / rungs / rounds / doors per visit (spec: visit lengths, tune in playtest) */
export const VISIT: Record<ScreenId, number> = { broom: 10, cauldron: 4, ladder: 5, ghosts: 4, doors: 3 }
export const HEARTS = 3
/** broom: a new target after this many catches */
export const TARGET_EVERY = 3

export const cycleOf = (stage: Stage): ScreenId[] => CYCLE.filter((s) => screensOfStage(stage).includes(s))

export function nextScreen(stage: Stage, current: ScreenId): { screen: ScreenId; newCycle: boolean } {
  const c = cycleOf(stage)
  const i = c.indexOf(current)
  if (i < 0 || i === c.length - 1) return { screen: c[0], newCycle: true }
  return { screen: c[i + 1], newCycle: false }
}

export function runStart(stage: Stage, lastEnded: ScreenId | null): ScreenId {
  const c = cycleOf(stage)
  if (!lastEnded || !c.includes(lastEnded)) return c[0]
  return nextScreen(stage, lastEnded).screen
}

export interface Hearts { left: number; nearMissUsed: boolean }
export const heartsOnScreenStart = (): Hearts => ({ left: HEARTS, nearMissUsed: false })
export const newRound = (h: Hearts): Hearts => ({ ...h, nearMissUsed: false })

export function onAnswer(h: Hearts, a: 'right' | 'wrong' | 'near'): { hearts: Hearts; forgiven: boolean; over: boolean } {
  if (a === 'right') return { hearts: h, forgiven: false, over: false }
  if (a === 'near' && !h.nearMissUsed) return { hearts: { ...h, nearMissUsed: true }, forgiven: true, over: false }
  const left = Math.max(0, h.left - 1)
  return { hearts: { left, nearMissUsed: h.nearMissUsed || a === 'near' }, forgiven: false, over: left === 0 }
}

// broom timing
export const BASE_TRAVEL_MS = 5200
export const travelMs = (pace: number, cycle: number) => BASE_TRAVEL_MS * pace * Math.max(0.6, 0.93 ** cycle)
/** 1 at the right edge → 0 at the wizard */
export const waveX = (startMs: number, nowMs: number, travel: number) => Math.min(1, Math.max(0, 1 - (nowMs - startMs) / travel))
/** a wave resolves when it is this close to the wizard (0 = at the wizard, 1 = at the right edge) */
export const CATCH_AT = 0.04
export const LANES = 3
export const laneAt = (y01: number): 0 | 1 | 2 => Math.min(2, Math.max(0, Math.floor(y01 * LANES))) as 0 | 1 | 2
export { nextPace, PACE_MIN, PACE_MAX } from '../../utils/duel/rules'
