// Space Cat's reset for the parent area, loaded on demand (parent/index.ts must not import the store). It clears only
// Space Cat's save (alef-spacecat); the parent's settings stay.
import { useSpaceCatStore } from '../store'

export default function resetSpaceCat() { useSpaceCatStore.getState().reset() }
