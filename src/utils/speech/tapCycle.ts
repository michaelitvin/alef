export type TapMode = 'word' | 'decode'

export interface TapState {
  /** Identity of the last-tapped word (location key, not text) */
  wordKey: string | null
  lastMode: TapMode | null
}

export const INITIAL_TAP_STATE: TapState = { wordKey: null, lastMode: null }

/**
 * Tap cycle: first tap on a word -> 'word', tap again -> 'decode',
 * then alternate. Tapping a different word starts over at 'word'.
 */
export function nextTap(
  state: TapState,
  wordKey: string
): { mode: TapMode; state: TapState } {
  const mode: TapMode =
    state.wordKey === wordKey && state.lastMode === 'word' ? 'decode' : 'word'
  return { mode, state: { wordKey, lastMode: mode } }
}
