// The play controller's reads and writes of the save: the persisted store in the app, a plain in-memory one in tests
// (which writes nothing to localStorage).
import { createStore } from 'zustand/vanilla'
import { DEFAULT_SAVE, type SpaceCatSave } from './saveFormat'
import { spaceCatCreator, useSpaceCatStore, type Actions } from './store'

export interface SpaceCatSavePort {
  get(): SpaceCatSave
  recordRound: Actions['recordRound']
  endRun: Actions['endRun']
  unlockShips: Actions['unlockShips']
  markHeard: Actions['markHeard']
}

/** the app's port (the play controller is plan Task 15; @public until it imports this) */
export const storeSavePort: SpaceCatSavePort = {
  get: () => useSpaceCatStore.getState(),
  recordRound: (...a) => useSpaceCatStore.getState().recordRound(...a),
  endRun: (...a) => useSpaceCatStore.getState().endRun(...a),
  unlockShips: (...a) => useSpaceCatStore.getState().unlockShips(...a),
  markHeard: (...a) => useSpaceCatStore.getState().markHeard(...a),
}

export function memorySavePort(initial: Partial<SpaceCatSave> = {}): SpaceCatSavePort {
  const store = createStore(spaceCatCreator)
  store.setState({ ...DEFAULT_SAVE, ...initial })
  return {
    get: () => store.getState(),
    recordRound: (...a) => store.getState().recordRound(...a),
    endRun: (...a) => store.getState().endRun(...a),
    unlockShips: (...a) => store.getState().unlockShips(...a),
    markHeard: (...a) => store.getState().markHeard(...a),
  }
}
