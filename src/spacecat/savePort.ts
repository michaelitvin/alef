// The play controller's reads and writes of the save: the persisted store in the app, a plain in-memory one in tests
// (which writes nothing to localStorage).
import { createStore } from 'zustand/vanilla'
import { DEFAULT_SAVE, type SpaceCatSave } from './saveFormat'
import { spaceCatCreator, useSpaceCatStore, type Actions } from './store'

export interface SpaceCatSavePort {
  get(): SpaceCatSave
  recordRound: Actions['recordRound']
  beginRun: Actions['beginRun']
  takeRound: Actions['takeRound']
  findLevelAgain: Actions['findLevelAgain']
  endRun: Actions['endRun']
  unlockShips: Actions['unlockShips']
  chooseShip: Actions['chooseShip']
  markHeard: Actions['markHeard']
  markLearned: Actions['markLearned']
  noteIntroMistake: Actions['noteIntroMistake']
  markIntroAgain: Actions['markIntroAgain']
}

/** the app's port */
export const storeSavePort: SpaceCatSavePort = {
  get: () => useSpaceCatStore.getState(),
  recordRound: (...a) => useSpaceCatStore.getState().recordRound(...a),
  beginRun: (...a) => useSpaceCatStore.getState().beginRun(...a),
  takeRound: (...a) => useSpaceCatStore.getState().takeRound(...a),
  findLevelAgain: (...a) => useSpaceCatStore.getState().findLevelAgain(...a),
  endRun: (...a) => useSpaceCatStore.getState().endRun(...a),
  unlockShips: (...a) => useSpaceCatStore.getState().unlockShips(...a),
  chooseShip: (...a) => useSpaceCatStore.getState().chooseShip(...a),
  markHeard: (...a) => useSpaceCatStore.getState().markHeard(...a),
  markLearned: (...a) => useSpaceCatStore.getState().markLearned(...a),
  noteIntroMistake: (...a) => useSpaceCatStore.getState().noteIntroMistake(...a),
  markIntroAgain: (...a) => useSpaceCatStore.getState().markIntroAgain(...a),
}

export function memorySavePort(initial: Partial<SpaceCatSave> = {}): SpaceCatSavePort {
  const store = createStore(spaceCatCreator)
  store.setState({ ...DEFAULT_SAVE, ...initial })
  return {
    get: () => store.getState(),
    recordRound: (...a) => store.getState().recordRound(...a),
    beginRun: (...a) => store.getState().beginRun(...a),
    takeRound: (...a) => store.getState().takeRound(...a),
    findLevelAgain: (...a) => store.getState().findLevelAgain(...a),
    endRun: (...a) => store.getState().endRun(...a),
    unlockShips: (...a) => store.getState().unlockShips(...a),
    chooseShip: (...a) => store.getState().chooseShip(...a),
    markHeard: (...a) => store.getState().markHeard(...a),
    markLearned: (...a) => store.getState().markLearned(...a),
    noteIntroMistake: (...a) => store.getState().noteIntroMistake(...a),
    markIntroAgain: (...a) => store.getState().markIntroAgain(...a),
  }
}
