// Andika's text widths, from a table (jsdom has no text layout, and the screens size Latin text before the font loads).
// The table is Andika-Regular's advance widths in em (units per em 2048), read once from public/fonts/andika/ with fontTools
// (hmtx and cmap). Kerning is not in it: Andika's pairs are few, and a sum of advances is the safe side of them.

/** advance in em: a–z, A–Z and the space */
const ADVANCE_EM: Record<string, number> = {
  a: 0.562, b: 0.564, c: 0.498, d: 0.581, e: 0.535, f: 0.366, g: 0.549, h: 0.574, i: 0.276, j: 0.291, k: 0.505, l: 0.276, m: 0.823,
  n: 0.579, o: 0.557, p: 0.571, q: 0.552, r: 0.435, s: 0.471, t: 0.408, u: 0.579, v: 0.522, w: 0.757, x: 0.530, y: 0.518, z: 0.508,
  A: 0.681, B: 0.627, C: 0.662, D: 0.701, E: 0.566, F: 0.562, G: 0.693, H: 0.720, I: 0.476, J: 0.471, K: 0.640, L: 0.527, M: 0.876,
  N: 0.732, O: 0.713, P: 0.583, Q: 0.720, R: 0.637, S: 0.574, T: 0.618, U: 0.703, V: 0.667, W: 1.016, X: 0.647, Y: 0.645, Z: 0.601,
  ' ': 0.269,
}
/** a character outside the table (a hyphen, say): the mean lowercase advance, about */
const OTHER_EM = 0.52

/** the width of `text` in Andika at `px`, in the same units as `px` */
export function measureText(text: string, px: number): number {
  let em = 0
  for (const ch of text) em += ADVANCE_EM[ch] ?? OTHER_EM
  return em * px
}
