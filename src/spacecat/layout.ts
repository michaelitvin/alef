// Space Cat's layout choice, by the screen's current shape: a screen that is wider than it is high (a tablet in
// landscape, a phone on its side) gets the wide layout; every other screen (a phone or a tablet held upright) gets the
// portrait layout. The choice changes when the screen turns; the round goes on.
export type Layout = 'wide' | 'portrait'

/** the still screens' logical size in each layout (the play screen's portrait area may be taller: canvas/draw.ts) */
export const LOGICAL = { wide: { w: 1600, h: 900 }, portrait: { w: 540, h: 960 } } as const

export function layoutFor(w: number, h: number): Layout {
  return w > h ? 'wide' : 'portrait'
}
