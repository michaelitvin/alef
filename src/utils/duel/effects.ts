// How hard a hit lands, by its effect preset (rules.pickEffect): the particles, shake and flash the view draws, the
// hitstop that the flow waits for (flow.feedbackPlan), and the boom's loudness.
import type { EffectPreset } from '../../types/duel'

export interface Juice {
  particles: number
  shake: number
  flash: number
  hitstopMs: number
  boom: number
}

export const EFFECT_PRESETS: Record<EffectPreset, Juice> = {
  gentle: { particles: 10, shake: 4, flash: 1.6, hitstopMs: 0, boom: 0.6 },
  boom: { particles: 24, shake: 12, flash: 2.8, hitstopMs: 0, boom: 1 },
  mega: { particles: 48, shake: 24, flash: 4.2, hitstopMs: 140, boom: 1.5 },
}
