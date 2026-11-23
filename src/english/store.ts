// The English path's save (localStorage 'alef-english', version 2): Spell Quest's store, made by its factory, with its own key,
// its own purse and the English fields. It never touches Spell Quest's save (alef-spellquest).
import type { StateCreator } from 'zustand'
import { createRunStore, runState, type SpellQuestActions, type SpellQuestSave } from '../spellquest/store'
import { englishStageRule } from './readyStages'
import { ENGLISH_FRESH, ENGLISH_SAVE_KEY, ENGLISH_SAVE_VERSION, migrateEnglishSave, type EnglishFields } from './saveFormat'

export const useEnglishStore = createRunStore<EnglishFields>({
  key: ENGLISH_SAVE_KEY, version: ENGLISH_SAVE_VERSION, migrate: migrateEnglishSave, initial: ENGLISH_FRESH, recordStageAnswer: englishStageRule,
})

/** the English save's state and actions, without storage (the in-memory save, savePort.ts) */
export const englishState = runState(englishStageRule, ENGLISH_FRESH) as unknown as StateCreator<SpellQuestSave & SpellQuestActions & EnglishFields>
