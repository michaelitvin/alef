// The placement: the first English run finds his level (spec: placement). Task 6 declares its state, kept in the English
// save; its steps come with the placement itself.

export interface PlacementState { asked: number; stage: number; missed: boolean; counts: Record<number, { right: number; wrong: number }>; jumped: number[]; confirming: number[]; kind: 'picture' | 'name' }
