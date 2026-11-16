// Book 2's reset for the parent area, loaded on demand (parent/index.ts must not import the store).
import { useDuel2Store } from '../store'

export default function resetBook2() { useDuel2Store.getState().resetProgress() }
