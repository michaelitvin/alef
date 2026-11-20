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

/** the pause between two unit sounds of a blend ("s… a… t…") */
export const BLEND_UNIT_GAP_MS = 120
/** the pause between the last unit sound and the word ("… sat") */
export const BLEND_WORD_GAP_MS = 300
/** a word's length when its clip is missing: the lights still go through it and end */
export const BLEND_MISSING_WORD_MS = 700

/** a blend that says each unit's own sound in turn and then the word: `audio` (the unit's clip) lights `units` as it plays */
export interface BlendStep { audio: string; units: number[] }

/** what the engine gives the units-then-word blend: its voice, its wait, its lights and whether the blend is still on */
export interface BlendStepDeps {
  /** says one clip; `onHeard` comes when the file really plays (never for a missing file) */
  say(id: string, onHeard: () => void): Promise<unknown>
  sleep(ms: number): Promise<void>
  /** lights units (they stay lit) */
  light(units: number[]): void
  alive(): boolean
}

/**
 * The slow-word blend: each unit's own sound one after another (the unit lights as its clip really starts, and stays lit),
 * a short pause, then the word with all units lit. Returns false when a unit's clip is missing (the caller plays the word's
 * fallback blend instead: nothing goes silent and nothing waits); true when it played (or was ended by `alive`).
 */
export async function playUnitsThenWord(steps: BlendStep[], wordId: string, allUnits: number[], d: BlendStepDeps): Promise<boolean> {
  for (let i = 0; i < steps.length; i++) {
    if (!d.alive()) return true
    if (i > 0) await d.sleep(BLEND_UNIT_GAP_MS)
    if (!d.alive()) return true
    let heard = false
    await d.say(steps[i].audio, () => { heard = true; if (d.alive()) d.light(steps[i].units) })
    if (!heard && d.alive()) return false
  }
  if (!d.alive()) return true
  await d.sleep(BLEND_WORD_GAP_MS)
  if (!d.alive()) return true
  let heard = false
  await d.say(wordId, () => { heard = true; if (d.alive()) d.light(allUnits) })
  if (!heard && d.alive()) { d.light(allUnits); await d.sleep(BLEND_MISSING_WORD_MS) }
  return true
}
