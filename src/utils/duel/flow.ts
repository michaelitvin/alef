// Pacing of what happens after a round. Regular rounds teach (sound → name → word); a boss fight flows: a hit that
// does not finish the boss gets just the sound and the fight goes on, the boss continuing from where it stood.
import type { Outcome, Round } from '../../types/duel'
import { EFFECT_PRESETS } from '../../components/duel/Explosion'

export interface FeedbackPlan {
  /** 'full' = sound → name → word; 'sound-name' = no word; 'sound' = only the vowel sound */
  say: 'full' | 'sound-name' | 'sound'
  /** the result banner (mark + picture) */
  banner: boolean
  /** minimum time for the effects before moving on */
  waitMs: number
  /** pause after the speech before the next round */
  tailMs: number
}

/** How sure the answer was. Without it the plan is the full recap. */
export interface Confidence {
  /** this mark has not come up yet this game */
  firstThisRun: boolean
  /** predicted mistake rate for the mark, before this round */
  predicted: number
  /** fraction of the walk used before the tap (null: tapped before walking) */
  usedFrac: number | null
  /** he tapped the forgiven twin first */
  twin: boolean
}

/** A mark is strong below this predicted mistake rate (the round-selection aim is 0.2). */
export const STRONG_BELOW = 0.2
/** A right answer after this share of the walk counts as slow. */
export const SLOW_AFTER = 0.6

/**
 * Regular rounds teach where he is unsure (miss, first time this game, weak mark, forgiven twin): sound → name → word.
 * A slow right answer gets sound → name; a quick right answer on a strong mark just the sound. A boss hit that does
 * not finish the boss gets just the sound and no banner, so the fight flows.
 */
export function feedbackPlan(r: Round, o: Outcome, c?: Confidence): FeedbackPlan {
  const hitstop = EFFECT_PRESETS[o.effect].hitstopMs
  if (r.boss && o.kind === 'hit' && !o.final) return { say: 'sound', banner: false, waitMs: 700 + hitstop, tailMs: 150 }
  const full: FeedbackPlan = { say: 'full', banner: true, waitMs: o.kind === 'hit' ? 1300 + hitstop : 2000, tailMs: 500 }
  if (o.kind !== 'hit' || !c || c.firstThisRun || c.twin || c.predicted >= STRONG_BELOW) return full
  if (c.usedFrac !== null && c.usedFrac > SLOW_AFTER) return { say: 'sound-name', banner: true, waitMs: 1100 + hitstop, tailMs: 300 }
  return { say: 'sound', banner: true, waitMs: 900 + hitstop, tailMs: 200 }
}

/** How far a hit knocks the boss back along its path (fraction of the whole walk). */
export const BOSS_KNOCKBACK = 0.2

/**
 * Where the boss starts its next round (0 = the right edge, 1 = the tower): where it stood when the round ended,
 * knocked back by a hit (further after bonking the tower on a wrong tap); from the edge again if it reached the tower.
 */
export function nextBossStart(start: number, msWalk: number | null, walkMs: number, result: 'correct' | 'wrong' | 'timeout' | 'mega'): number {
  if (result === 'timeout') return 0
  const stood = start + (1 - start) * Math.min(1, Math.max(0, (msWalk ?? 0) / walkMs))
  const back = result === 'wrong' ? BOSS_KNOCKBACK * 1.75 : BOSS_KNOCKBACK
  return Math.max(0, Math.min(0.8, stood - back))
}
