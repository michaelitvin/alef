// Pacing of what happens after a round. Regular rounds teach (sound → name → word); a boss fight flows: a hit that
// does not finish the boss gets just the sound and the fight goes on, the boss continuing from where it stood.
import type { Outcome, Round } from '../../types/duel'
import { EFFECT_PRESETS } from '../../components/duel/Explosion'

export interface FeedbackPlan {
  /** 'full' = sound → name → word; 'sound' = only the vowel sound */
  say: 'full' | 'sound'
  /** the result banner (mark + picture) */
  banner: boolean
  /** minimum time for the effects before moving on */
  waitMs: number
  /** pause after the speech before the next round */
  tailMs: number
}

export function feedbackPlan(r: Round, o: Outcome): FeedbackPlan {
  const hitstop = EFFECT_PRESETS[o.effect].hitstopMs
  if (r.boss && o.kind === 'hit' && !o.final) return { say: 'sound', banner: false, waitMs: 700 + hitstop, tailMs: 150 }
  return { say: 'full', banner: true, waitMs: o.kind === 'hit' ? 1300 + hitstop : 2000, tailMs: 500 }
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
