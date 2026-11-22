// Spell Quest's reset for the parent area, loaded on demand (parent/index.ts must not import the store).
import { useSpellQuestStore } from '../store'

export default function resetSpellQuest() { useSpellQuestStore.getState().resetProgress() }
