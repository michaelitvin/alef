// Space Cat's layout choice: a phone (shorter side under 600 CSS px) keeps the portrait layout, also on its side;
// a tablet or screen that is wider than high gets the wide layout.
export type Layout = 'wide' | 'portrait'

/** the game area's logical size in each layout */
export const LOGICAL = { wide: { w: 1600, h: 900 }, portrait: { w: 540, h: 960 } } as const
/** a screen whose shorter side is less than this is a phone */
export const PHONE_SHORT_SIDE = 600

export function layoutFor(w: number, h: number): Layout {
  if (Math.min(w, h) < PHONE_SHORT_SIDE) return 'portrait'
  return w > h ? 'wide' : 'portrait'
}
