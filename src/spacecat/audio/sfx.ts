// The names of Space Cat's coded sound effects: the engine asks for them, the synth (synth.ts) plays them.
export const SFX_NAMES = ['new-sum', 'right', 'right-zoom', 'wrong', 'timeout', 'heart', 'heart-up', 'level', 'ship', 'end'] as const
export type SfxName = (typeof SFX_NAMES)[number]
