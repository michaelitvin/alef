/** Slow exhaustive sweeps run in full on CI or with FULL_SWEEP=1; locally a deterministic sample is enough. */
export const FULL_SWEEP = !!(process.env.CI || process.env.FULL_SWEEP)
