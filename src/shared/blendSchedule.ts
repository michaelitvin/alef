// When the units of a blended word light (the English hint, after a miss, the made word): the part both engines share (the
// run's screens and the tower's board). Each engine keeps its own voice, waiting and view; this is only the arithmetic.

/** the pause between two words that blend in turn */
export const BLEND_GAP_MS = 300

/** a blend's times: when each unit lights, in ms from the voice's real start, and how long it lasts; `stretch`: an even split */
export interface BlendTimes { lights: { unit: number; atMs: number }[]; totalMs: number; stretch?: true }

/**
 * The plan's times once its voice plays: an even split (`stretch`: no timing of the clip) is stretched to the clip's real
 * length (`clipMs`; null: not known, so the plan's own length stays); a timed plan keeps its times.
 */
export function scheduleBlend(plan: BlendTimes, clipMs: number | null): { lights: { unit: number; atMs: number }[]; totalMs: number } {
  const k = plan.stretch && clipMs ? clipMs / plan.totalMs : 1
  return { lights: plan.lights.map((l) => ({ unit: l.unit, atMs: Math.round(l.atMs * k) })), totalMs: plan.totalMs * k }
}
