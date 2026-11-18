// The English path's save (localStorage 'alef-english', version 1): Book 2's store, made by its factory, with its own key,
// its own purse and the English fields. It never touches Book 2's save (alef-duel2).
import type { StateCreator } from 'zustand'
import { createRunStore, runState, type Duel2Actions, type Duel2Save } from '../duel2/store'
import type { StageProgress } from '../duel2/logic/stages'
import { ENGLISH_FRESH, ENGLISH_SAVE_KEY, ENGLISH_SAVE_VERSION, type EnglishFields } from './saveFormat'

/** the English stage rule until the English stages are built: the answer is kept, and no stage passes */
const neverPasses = (p: StageProgress, correct: boolean): { progress: StageProgress; passed: boolean } =>
  ({ progress: { ...p, newAnswers: (p.newAnswers + (correct ? 'o' : 'x')).slice(-50) }, passed: false })

export const useEnglishStore = createRunStore<EnglishFields>({
  key: ENGLISH_SAVE_KEY, version: ENGLISH_SAVE_VERSION, migrate: (s) => s, initial: ENGLISH_FRESH, recordStageAnswer: neverPasses,
})

/** the English save's state and actions, without storage (the in-memory save, savePort.ts) */
export const englishState = runState(neverPasses, ENGLISH_FRESH) as unknown as StateCreator<Duel2Save & Duel2Actions & EnglishFields>
