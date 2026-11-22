// The English path's save (localStorage 'alef-english', version 1): Book 2's store, made by its factory, with its own key,
// its own purse and the English fields. It never touches Book 2's save (alef-duel2).
import type { StateCreator } from 'zustand'
import { createRunStore, runState, type Duel2Actions, type Duel2Save } from '../spellquest/store'
import { englishStageRule } from './readyStages'
import { ENGLISH_FRESH, ENGLISH_SAVE_KEY, ENGLISH_SAVE_VERSION, type EnglishFields } from './saveFormat'

export const useEnglishStore = createRunStore<EnglishFields>({
  key: ENGLISH_SAVE_KEY, version: ENGLISH_SAVE_VERSION, migrate: (s) => s, initial: ENGLISH_FRESH, recordStageAnswer: englishStageRule,
})

/** the English save's state and actions, without storage (the in-memory save, savePort.ts) */
export const englishState = runState(englishStageRule, ENGLISH_FRESH) as unknown as StateCreator<Duel2Save & Duel2Actions & EnglishFields>
