export type TapMode = 'word' | 'decode'

export interface TapState {
  /** Identity of the last-tapped word (location key, not text) */
  wordKey: string | null
  lastMode: TapMode | null
}

export const INITIAL_TAP_STATE: TapState = { wordKey: null, lastMode: null }

/**
 * Tap cycle: first tap on a word -> 'decode', tap again -> 'word',
 * then alternate. Tapping a different word starts over at 'decode'.
 * Decode comes first so help scaffolds reading instead of replacing it:
 * the kid hears the letter sounds and still has to blend them himself.
 */
export function nextTap(
  state: TapState,
  wordKey: string
): { mode: TapMode; state: TapState } {
  const mode: TapMode =
    state.wordKey === wordKey && state.lastMode === 'decode' ? 'word' : 'decode'
  return { mode, state: { wordKey, lastMode: mode } }
}
