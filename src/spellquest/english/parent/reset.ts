// The English path's reset for the parent area, loaded on demand (parent/index.ts must not import the store). It resets
// the English save only (alef-spellquest-en), never Spell Quest's.
import { useEnglishStore } from '../store'

export default function resetEnglish() { useEnglishStore.getState().resetProgress() }
