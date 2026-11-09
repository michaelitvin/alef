// How each letter is written, stroke by stroke, in print (כתב דפוס, the game's print font) and in handwriting (כתב יד;
// the game writes handwriting words in Dana Yad). Loaded by plain Node: erasable TS only, data only.
//
// Coordinates: the letter's normalized box, plain x/y with the origin top-left (x is NOT right to left): y = 0 on the top
// line, y = 1 on the baseline, x in the same unit. Descenders go below 1, ascenders above 0. Each stroke is a polyline,
// its start point first. `w` is the letter's width (it sits centred in the slot).
//
// Sources (researched 2026-11-07; no official per-letter standard exists, but the Israeli teaching sources agree closely):
// - Print: etze.co.il tracing sheets with numbered arrows
//   (https://www.etze.co.il/images/stories/maarechet/yosrim/haashara/2010/otiyot_dfus/otiyot_dfus.pdf),
//   Shlomit Oltchik's text for each letter (https://shlomitoltchik.com/the-letters-of-the-print/), likro.co.il staged
//   images, 2times2.com arrow diagrams, Hebrew4Christians charts (https://www.ancient-hebrew.org/learn/how-to-write-hebrew.htm).
//   The core rule is "like resh": start at the top-left, along the roof left to right, then down; then the other parts,
//   each from top to bottom. Base lines that return under a letter (כ נ פ צ, ע, the bottom of ש) go right to left.
//   Upward motions only in מ (starts bottom-left), ט (up its left side), ש (up its left arm) and one form of ם.
// - Handwriting: etze.co.il cursive sheets (https://www.etze.co.il/images/stories/maarechet/yosrim/haashara/otiyot_ktav.pdf),
//   2times2.com (https://2times2.com/hebrew/cursive.html, the school font Gveret Levin), likro.co.il
//   (https://likro.co.il/otiyot-bekhtav-agol.htm), C. Abzug, James Madison University ("Writing the Alef-Bet").
//   The arch family (ר ה ח ת ק כ ב פ ך) starts at the left and goes clockwise over the top. Paths follow the Ktav Yad font,
//   except where the parent's review (2026-11-07) found the font's slanted forms wrong: handwriting א ב ד ו י ל ן צ ר ף ץ
//   follow the ETZE cursive sheets (Israeli; upright), checked against the upright school font Dana Yad; ף and ץ also
//   against JMU and 2times2.com (all three: they rise above the top line, begin like ל, and ף ends going down, ץ up).
// Where sources disagree the letter holds both variants, and either passes: print ם (one loop or two strokes), print ע
// (the arms in either order); handwriting א (the line first in one source), and lenient directions (`either`) for
// handwriting ס ע ש. The parent's own alternatives pass too: print ז with a zigzag stem, print מ in three strokes or in
// two with the small piece first. The first variant is the one the hand teaches. A pen lift that splits one stroke into two passes (the recognizer joins them), except for
// `strict` letters: print ד is two strokes (the roof, then the down line with a corner) and ר is one curved stroke, and
// the check must tell them apart by that (the parent).

export type Pt = [number, number]
export type Script = 'print' | 'hand'
export interface StrokeDef {
  pts: Pt[]
  /** both directions pass */
  either?: boolean
  /** the way its last bit must go: what tells two letters apart that are the same until there (handwriting ף ץ, ב כ) */
  end?: 'up' | 'down' | 'left'
  /** its height against the lines is checked: ה's short leg (a gap under the roof) is not ח's */
  height?: boolean
}
export interface LetterDef { letter: string; script: Script; w: number; variants: StrokeDef[][]; strict?: boolean }

const s = (...pts: Pt[]): StrokeDef => ({ pts })
const e = (...pts: Pt[]): StrokeDef => ({ pts, either: true })
const t = (end: 'up' | 'down' | 'left', ...pts: Pt[]): StrokeDef => ({ pts, end })
const h = (...pts: Pt[]): StrokeDef => ({ pts, height: true })
const L = (letter: string, script: Script, w: number, variants: StrokeDef[][], strict?: boolean): LetterDef =>
  ({ letter, script, w, variants, ...(strict ? { strict } : {}) })

const PRINT: LetterDef[] = [
  L('א', 'print', 1.1, [[s([0.1, 0.05], [1.05, 1]), s([1, 0.05], [0.7, 0.55]), s([0.33, 0.35], [0.05, 1])]]),
  L('ב', 'print', 1.1, [[s([0.1, 0.08], [0.85, 0.08], [0.87, 0.95]), s([0.02, 0.95], [1.08, 0.95])]]),
  L('ג', 'print', 0.75, [[s([0.15, 0.05], [0.45, 0.05], [0.72, 1]), s([0.5, 0.42], [0.08, 1])]]),
  L('ד', 'print', 1.1, [[s([0.05, 0.08], [1.08, 0.08]), s([0.82, 0.12], [0.84, 1])]], true),
  // the roof starts above the leg (the parent: no overhang; ETZE)
  L('ה', 'print', 1.1, [[s([0.12, 0.08], [1.02, 0.08], [1.04, 1]), h([0.12, 0.48], [0.12, 1])]]),
  L('ו', 'print', 0.35, [[s([0.03, 0.07], [0.25, 0.08], [0.27, 1])]]),
  L('ז', 'print', 0.65, [
    [s([0.03, 0.05], [0.62, 0.2]), s([0.3, 0.18], [0.48, 1])],
    // the parent: the stem may be a zigzag, one break at the middle line (down to the left, then down to the right)
    [s([0.03, 0.05], [0.62, 0.2]), s([0.34, 0.18], [0.2, 0.5], [0.46, 1])],
  ]),
  L('ח', 'print', 1.1, [[s([0.05, 0.08], [1, 0.08], [1.02, 1]), h([0.12, 0.1], [0.12, 1])]]),
  L('ט', 'print', 1.05, [[s([0.55, 0.38], [0.85, 0.05], [1, 0.22], [1, 0.95], [0.1, 0.95], [0.05, 0.05])]]),
  L('י', 'print', 0.4, [[s([0.05, 0.08], [0.32, 0.1], [0.32, 0.6])]]),
  L('כ', 'print', 1, [[s([0.05, 0.08], [0.88, 0.08], [0.95, 0.5], [0.88, 0.95], [0.05, 0.95])]]),
  L('ך', 'print', 0.9, [[s([0.05, 0.08], [0.85, 0.08], [0.85, 1.45])], [s([0.05, 0.08], [0.88, 0.08]), s([0.75, 0.12], [0.75, 1.45])]]),
  L('ל', 'print', 0.95, [[s([0.1, -0.35], [0.1, 0.1], [0.85, 0.1], [0.85, 0.5], [0.45, 1])]]),
  L('מ', 'print', 1.2, [
    [s([0.05, 1], [0.75, 0.08], [0.95, 0.08], [1.15, 0.3], [1.15, 1], [0.65, 1]), s([0.08, 0.08], [0.35, 0.45])],
    // the parent's alternatives. Three strokes, split as the Rubik font builds its מ: the roof and the right side (like
    // ר), the slanted left leg, then the base back from the right. Two strokes: the small piece, then the first stroke
    // backwards (from the base round the box and down the diagonal)
    [s([0.05, 0.08], [1, 0.08], [1.15, 0.22], [1.15, 1]), s([0.32, 0.12], [0.08, 1]), s([1.12, 1], [0.6, 1])],
    [s([0.08, 0.08], [0.35, 0.45]), s([0.65, 1], [1.15, 1], [1.15, 0.3], [0.95, 0.08], [0.75, 0.08], [0.05, 1])],
  ]),
  L('ם', 'print', 1.05, [
    [s([0.05, 0.08], [1, 0.08], [1, 1], [0.05, 1], [0.05, 0.1])],
    [s([0.05, 0.08], [1, 0.08], [1, 1]), s([0.05, 0.1], [0.05, 1], [1, 1])],
  ]),
  L('נ', 'print', 0.75, [[s([0.36, 0.08], [0.56, 0.08], [0.6, 0.95], [0.05, 0.95])]]),
  L('ן', 'print', 0.35, [[s([0.03, 0.07], [0.25, 0.08], [0.27, 1.45])]]),
  L('ס', 'print', 1.1, [[s([0.05, 0.05], [0.75, 0.05], [1.05, 0.35], [1, 0.8], [0.55, 1.02], [0.15, 0.85], [0.05, 0.4], [0.06, 0.1])]]),
  L('ע', 'print', 1.1, [
    [s([1.05, 0.05], [0.6, 0.95], [0, 1]), s([0.1, 0.05], [0.45, 0.65])],
    [s([0.1, 0.05], [0.45, 0.65]), s([1.05, 0.05], [0.6, 0.95], [0, 1])],
  ]),
  L('פ', 'print', 1.05, [[s([0.05, 0.08], [0.9, 0.08], [1, 0.5], [0.9, 0.95], [0.05, 0.95]), s([0.14, 0.12], [0.14, 0.45], [0.45, 0.45])]]),
  L('ף', 'print', 1.05, [[s([0.05, 0.08], [0.95, 0.08], [0.95, 1.45]), s([0.14, 0.12], [0.14, 0.45], [0.45, 0.45])]]),
  L('צ', 'print', 1.05, [[s([0.05, 0.05], [0.85, 0.85], [0.9, 0.95], [0.05, 0.95]), s([1, 0.05], [0.5, 0.5])]]),
  // ETZE: one straight slanted line from the top-left into the basement, the wing from the top-right meets it low
  L('ץ', 'print', 0.95, [[s([0.05, 0.05], [0.75, 1.45]), s([0.88, 0.05], [0.43, 0.78])]]),
  L('ק', 'print', 1.05, [[s([0.05, 0.08], [0.95, 0.08], [0.95, 0.65], [0.7, 0.95]), s([0.16, 0.42], [0.16, 1.45])]]),
  L('ר', 'print', 0.95, [[s([0.05, 0.08], [0.7, 0.08], [0.85, 0.15], [0.9, 0.3], [0.9, 1])]], true),
  L('ש', 'print', 1.25, [[s([1.2, 0.05], [1.05, 0.95], [0.2, 0.95], [0.05, 0.05]), s([0.6, 0.05], [0.62, 0.9])]]),
  L('ת', 'print', 1.3, [[s([0.2, 0.08], [1.2, 0.08], [1.22, 1]), s([0.35, 0.12], [0.35, 1], [0.05, 1])]]),
]

const HAND: LetterDef[] = [
  // the C first (LIKRO, 2x2, JMU) or the line first (ETZE); the line is upright and stands between the lines (ETZE,
  // Dana Yad), not the tall slanted line of the Ktav Yad font
  L('א', 'hand', 0.85, [
    [s([0.8, 0.28], [0.62, 0.24], [0.42, 0.3], [0.24, 0.45], [0.19, 0.62], [0.27, 0.82], [0.45, 0.95], [0.8, 1]), s([0.07, -0.05], [0.06, 1])],
    [s([0.07, -0.05], [0.06, 1]), s([0.8, 0.28], [0.62, 0.24], [0.42, 0.3], [0.24, 0.45], [0.19, 0.62], [0.27, 0.82], [0.45, 0.95], [0.8, 1])],
  ]),
  // Dana Yad (the parent: like the upright school font)
  L('ב', 'hand', 1.35, [[t('down', [0.05, 0.21], [0.25, 0.1], [0.6, 0.05], [0.9, 0.1], [1.15, 0.28], [1.3, 0.55], [1.25, 0.8], [1.1, 0.97], [0.92, 0.99], [0.75, 0.9], [0.6, 0.75], [0.47, 0.62], [0.4, 0.57], [0.35, 0.75], [0.27, 1])]]),
  // within the lines (ETZE, JMU), the font's shape otherwise, its foot going on past the top (the parent)
  L('ג', 'hand', 1.05, [[s([0.56, -0.03], [0.7, 0.18], [1, 0.32], [0.75, 0.38], [0.35, 0.56], [0.1, 0.79], [0.22, 0.97], [0.6, 1], [1, 0.99])]]),
  // Dana Yad, as ETZE: over the top, in to a loop at mid-height, then down (the loop tells it from ר) — between the lines (third review)
  // the loop goes like Dana Yad's: down-left along its bottom, up round the left end, right along its top (the parent)
  L('ד', 'hand', 1, [[s([0.05, 0.17], [0.2, 0.05], [0.5, 0.0], [0.8, 0.05], [0.95, 0.17], [0.94, 0.36], [0.8, 0.5], [0.6, 0.6], [0.4, 0.64], [0.3, 0.6], [0.35, 0.52], [0.5, 0.48], [0.65, 0.5], [0.8, 0.56], [0.9, 0.66], [0.94, 0.78], [0.9, 0.92], [0.7, 1.0])]]),
  L('ה', 'hand', 1.3, [[s([0.1, 0.3], [0.54, 0.08], [0.98, 0.12], [1.25, 0.52], [1.03, 0.96]), h([0.32, 0.6], [0.5, 0.74], [0.37, 0.96])]]),
  // within the lines (ETZE, JMU), upright
  L('ו', 'hand', 0.3, [[s([0.17, 0], [0.12, 1])]]),
  // within the lines (ETZE, JMU), the font's shape otherwise
  L('ז', 'hand', 1.15, [[s([0.7, 0], [0.44, 0.33], [0.83, 0.44], [1.1, 0.66], [0.88, 0.92], [0.44, 1], [0.04, 0.85])]]),
  // Dana Yad (the parent: like the upright school font) — between the lines (third review)
  L('ח', 'hand', 1, [[s([0.04, 0.22], [0.12, 0.12], [0.3, 0.02], [0.48, 0.0], [0.68, 0.06], [0.85, 0.23], [0.95, 0.49], [0.94, 0.71], [0.83, 0.91], [0.68, 1.0]), h([0.12, 0.14], [0.09, 0.98])]]),
  // Dana Yad (the parent: like the upright school font)
  L('ט', 'hand', 1.45, [[s([1.02, 0.08], [1.07, 0.2], [1.11, 0.45], [1.02, 0.75], [0.85, 0.95], [0.6, 1], [0.3, 0.88], [0.13, 0.55], [0.08, 0.15], [0.13, -0.2], [0.3, -0.45], [0.56, -0.7], [0.8, -0.82], [1.05, -0.87], [1.43, -0.9])]]),
  L('י', 'hand', 0.3, [[s([0.18, 0.02], [0.13, 0.45])]]),
  // Dana Yad (the parent: like the upright school font) — between the lines (third review)
  L('כ', 'hand', 0.95, [[t('left', [0.1, 0.11], [0.25, 0.02], [0.43, 0.0], [0.65, 0.05], [0.85, 0.21], [0.93, 0.46], [0.9, 0.66], [0.8, 0.86], [0.63, 0.96], [0.45, 1.0], [0.2, 0.96], [0.03, 0.91])]]),
  L('ך', 'hand', 1.5, [[s([0.5, 0.25], [0.72, 0.06], [1.16, 0.08], [1.46, 0.48], [1.25, 0.89], [0.9, 0.94], [0.59, 0.8], [0.41, 1.48], [0.12, 2.05])]]),
  // ETZE, JMU: from the stem at mid-height left and down round a small loop, up through the start above the top line,
  // a hook to the right; upright (the parent: not slanted)
  L('ל', 'hand', 1, [[s([0.45, 0.5], [0.22, 0.52], [0.08, 0.68], [0.07, 0.88], [0.2, 1], [0.38, 0.97], [0.47, 0.75], [0.5, 0.4], [0.52, -0.2], [0.57, -0.58], [0.7, -0.8], [0.86, -0.82], [0.98, -0.68])]]),
  // Dana Yad (the parent: like the upright school font)
  L('מ', 'hand', 1.2, [[s([1.06, 0], [0.99, 0.2], [0.93, 0.45], [0.89, 0.7], [0.9, 0.95], [0.7, 0.72], [0.45, 0.45], [0.25, 0.22], [0.16, 0.14], [0.12, 0.25], [0.1, 0.6], [0.06, 0.99])]]),
  // Dana Yad (the parent: like the upright school font), drawn between the lines (third review)
  L('ם', 'hand', 1.5, [[s([0.12, 0.35], [0.2, 0.19], [0.38, 0.07], [0.8, 0.0], [1.22, 0.1], [1.44, 0.33], [1.4, 0.55], [1.2, 0.69], [0.95, 0.73], [0.62, 0.68], [0.35, 0.55], [0.18, 0.42], [0.1, 0.4], [0.11, 0.66], [0.14, 1.0])]]),
  L('נ', 'hand', 1.05, [[s([1, 0.05], [0.95, 0.5], [0.8, 0.9], [0.5, 1], [0.1, 0.95])]]),
  L('ן', 'hand', 0.3, [[s([0.18, 0], [0.11, 1.8])]]),
  L('ס', 'hand', 1.15, [[e([0.5, 0.05], [0.85, 0.05], [1.1, 0.3], [1.05, 0.7], [0.7, 0.97], [0.3, 0.95], [0.1, 0.65], [0.15, 0.25], [0.45, 0.07])]]),
  L('ע', 'hand', 1.1, [[e([1, -0.12], [0.75, 0.12], [0.5, 0.4], [0.25, 0.85], [0.45, 1], [0.85, 0.8], [1.03, 0.4], [0.8, 0.1], [0.15, 0.1])]]),
  L('פ', 'hand', 1.1, [[s([0.2, 0.22], [0.5, 0.05], [0.9, 0.08], [1.08, 0.4], [0.95, 0.8], [0.6, 0.98], [0.2, 0.92], [0.1, 0.7], [0.3, 0.52], [0.55, 0.58])]]),
  // ף and ץ rise above the top line (ETZE, JMU, 2x2; the font's ף is another style): they begin like ל (a small loop at
  // the bottom-left, up the stem), go round a loop at the top right and back across the stem; ף then ends going down,
  // ץ going up (the parent)
  L('ף', 'hand', 1, [[t('down', [0.45, 0.5], [0.22, 0.52], [0.08, 0.68], [0.07, 0.88], [0.2, 1], [0.38, 0.97], [0.47, 0.75], [0.5, 0.2], [0.53, -0.45], [0.6, -0.76], [0.72, -0.84], [0.82, -0.72], [0.8, -0.48], [0.66, -0.3], [0.48, -0.2], [0.3, -0.12], [0.2, -0.02], [0.2, 0.14], [0.27, 0.24])]]),
  // Dana Yad (the parent: like the upright school font)
  L('צ', 'hand', 1.1, [[s([0.09, -0.32], [0.15, -0.52], [0.5, -0.67], [0.83, -0.58], [0.94, -0.3], [0.88, -0.05], [0.72, 0.12], [0.52, 0.24], [0.75, 0.2], [0.95, 0.38], [1.07, 0.65], [1.02, 0.8], [0.85, 0.92], [0.55, 0.98], [0.3, 0.95], [0.07, 0.85])]]),
  L('ץ', 'hand', 1, [[t('up', [0.45, 0.5], [0.22, 0.52], [0.08, 0.68], [0.07, 0.88], [0.2, 1], [0.38, 0.97], [0.47, 0.75], [0.5, 0.2], [0.52, -0.35], [0.6, -0.62], [0.74, -0.66], [0.83, -0.46], [0.77, -0.18], [0.6, 0], [0.38, 0.1], [0.22, 0.08], [0.17, -0.06], [0.2, -0.24], [0.3, -0.34])]]),
  // Dana Yad (the parent: like the upright school font)
  L('ק', 'hand', 1.1, [[s([0.03, -0.02], [0.15, -0.15], [0.4, -0.19], [0.75, -0.15], [0.98, 0.05], [1.07, 0.38], [1.03, 0.62], [0.93, 0.85]), s([0.44, 0.35], [0.36, 0.95], [0.3, 1.35], [0.22, 1.6])]]),
  // Dana Yad (the parent: like the upright school font) — between the lines (third review)
  L('ר', 'hand', 1, [[s([0.08, 0.22], [0.25, 0.06], [0.5, 0.0], [0.75, 0.04], [0.9, 0.22], [0.95, 0.45], [0.91, 0.71], [0.8, 0.88], [0.65, 1.0])]]),
  L('ש', 'hand', 1.15, [[e([1.07, 0.69], [0.65, 0.92], [0.2, 0.95], [0.05, 0.5], [0.24, 0.17], [0.62, 0.04], [0.92, 0.2], [0.73, 0.47], [0.28, 0.65])]]),
  L('ת', 'hand', 1.6, [[s([0.63, 0.28], [0.86, 0.09], [1.16, 0.04], [1.5, 0.28], [1.5, 0.65], [1.27, 0.99]), s([0.67, 0.32], [0.63, 0.73], [0.48, 0.99], [0.07, 1.01])]]),
]

/** Rounds a polyline (Chaikin, twice; the ends stay): handwriting and the round print letters are curves, not corners. */
function round(pts: Pt[], times = 2): Pt[] {
  let p = pts
  for (let k = 0; k < times; k++) {
    if (p.length < 3) return p
    const out: Pt[] = [p[0]]
    for (let i = 0; i < p.length - 1; i++) {
      const [a, b] = [p[i], p[i + 1]]
      const q: Pt = [+(0.75 * a[0] + 0.25 * b[0]).toFixed(3), +(0.75 * a[1] + 0.25 * b[1]).toFixed(3)]
      const r: Pt = [+(0.25 * a[0] + 0.75 * b[0]).toFixed(3), +(0.25 * a[1] + 0.75 * b[1]).toFixed(3)]
      if (i > 0) out.push(q)
      if (i < p.length - 2) out.push(r)
    }
    out.push(p[p.length - 1])
    p = out
  }
  return p
}
const ROUND_PRINT = 'סט'
const rounded = (d: LetterDef): LetterDef => ({ ...d, variants: d.variants.map((v) => v.map((st) => ({ ...st, pts: round(st.pts) }))) })

export const STROKES: LetterDef[] = [...PRINT.map((d) => (ROUND_PRINT.includes(d.letter) ? rounded(d) : d)), ...HAND.map(rounded)]
/** handwriting letters drawn after the upright font Dana Yad (the parent's second review): the review card shows it big */
export const HAND_DANA = 'בדחטכמםצקר'
export const LETTERS = 'אבגדהוזחטיכךלמםנןסעפףצץקרשת'
export const strokesOf = (letter: string, script: Script): LetterDef => {
  const d = STROKES.find((x) => x.letter === letter && x.script === script)
  if (!d) throw new Error(`no strokes for ${letter} ${script}`)
  return d
}
