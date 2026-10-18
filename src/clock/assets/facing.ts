// Which way each customer picture faces, as drawn (rule: a sprite faces the direction it moves or looks).
// Judged by eye from src/clock/assets/img/<id>-idle.webp and <id>-happy.webp (2026-10-15): the direction of the snout or
// beak and the turn of the head and body; 'front' = the face looks at the viewer, with no clear side. Check this map
// again when a picture is regenerated.
export type Facing = 'left' | 'right' | 'front'

export const FACING: Record<string, { idle: Facing; happy: Facing }> = {
  bear: { idle: 'left', happy: 'left' }, // snout to the left (happy: arms up, head turned left; the parent 2026-10-16)
  cat: { idle: 'left', happy: 'left' }, // head turned left, tail out to the right
  fox: { idle: 'left', happy: 'left' }, // pointed snout to the left, tail to the right
  hedgehog: { idle: 'left', happy: 'left' }, // nose to the left, spines behind on the right
  owl: { idle: 'left', happy: 'left' }, // beak and eyes turned left, wing and tail to the right
  turtle: { idle: 'left', happy: 'left' }, // head out on the left, shell on the right
  penguin: { idle: 'left', happy: 'left' }, // beak left of the middle, head turned a little left (the parent 2026-10-16)
  rabbit: { idle: 'left', happy: 'left' }, // idle: head in profile to the left; happy: head turned a little left (the parent 2026-10-16)
}

/** The way a customer must look: toward the bench. */
export type Toward = 'left' | 'right'

/** Mirror the picture when it faces away from the bench. A front view is never mirrored. */
export function mirrorFor(id: string, mood: 'idle' | 'happy', toward: Toward): boolean {
  const f = FACING[id]?.[mood] ?? 'front'
  return f !== 'front' && f !== toward
}

/**
 * Where the bench is, seen from the customer. Landscape: the door column is right of the bench, so he looks left.
 * Portrait: the customer stands at the left of the bottom strip and the bench is above the middle of the screen, so he
 * looks right, up toward it.
 */
export const benchSide = (portrait: boolean): Toward => (portrait ? 'right' : 'left')
