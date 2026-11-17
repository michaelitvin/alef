// The clock's reset for the parent area, loaded on demand (parent/index.ts must not import the store).
import { useClockStore } from '../store'

export default function resetClock() { useClockStore.getState().resetProgress() }
