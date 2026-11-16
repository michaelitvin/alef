// The lessons' reset for the parent area, loaded on demand (parent/index.ts must not import the store).
import { useProgressStore } from '../../stores/progressStore'

export default function resetLessons() { useProgressStore.getState().resetProgress() }
