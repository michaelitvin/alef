// Sizes for the bench (spec: Screens and layout; rule: the learning content is the strongest element).
// Each exercise gets the bench's measured box and takes the arrangement (side by side or stacked) that gives
// the biggest clock while the whole case, the cards and the captions still fit, so nothing overlaps.
import type { Extent } from './ClockFace'

export type Box = { w: number; h: number }
export type Dir = 'row' | 'column'

export const GAP = 16
/** an option card's padding and border, both sides together */
export const OPT = 24
/** the prompt caption and its gap */
export const CAPTION_H = 80
/** the digital card prompt (Set the clock from a digital card) and its gap */
export const DIGITAL_PROMPT_H = 100
/** option clocks in Find the clock cut their case off at this many face sizes, so the faces stay big */
export const FIND_CLIP = 1.3
/** a text card with its speaker button beside it; a digital card. Stacked under the clock, text cards may grow
 * to the wide width, so a long phrase stays on one line. */
export const TEXT_CARD_W = 380
export const TEXT_CARD_WIDE = 540
export const DIGITAL_CARD_W = 260
/** the hand buttons beside the face (row) or under it (column) */
export const BUTTONS_W = 96
export const BUTTONS_H = 96

const fit = (w: number, h: number, e: Extent, max: number) => Math.max(40, Math.min(w / e.w, h / e.h, max))
const best = (row: number, column: number): { dir: Dir; size: number } =>
  row >= column ? { dir: 'row', size: row } : { dir: 'column', size: column }

/** Find the clock: the prompt caption on top, three option clocks in a row or a column. */
export function findLayout(box: Box, ext: Extent) {
  const max = Math.min(box.w, box.h) * 0.42
  return best(
    fit((box.w - 2 * GAP) / 3 - OPT, box.h - CAPTION_H - OPT, ext, max),
    fit(box.w - OPT, (box.h - CAPTION_H - 2 * GAP) / 3 - OPT, ext, max),
  )
}

/**
 * A phone-sized bench (either orientation). The clock is the learning content, so it must stay the strongest element
 * (rule): on a phone the cards get smaller (still at least 64px tall to tap) and the case is cut off around the face,
 * as in Find the clock, so that the face itself can grow. Playtest 2026-10-15: "the clock on a phone is much smaller
 * than the answers".
 */
export const COMPACT_MIN = 520
export const isCompact = (box: Box) => Math.min(box.w, box.h) < COMPACT_MIN
/** answer card sizes; `h` is the most a card may grow to (a two-line caption), `wide` the width when stacked under the clock */
export const CARDS = {
  text: { w: TEXT_CARD_W, wide: TEXT_CARD_WIDE, h: 100, gap: 14 },
  digital: { w: DIGITAL_CARD_W, wide: DIGITAL_CARD_W, h: 100, gap: 14 },
  textCompact: { w: 250, wide: 540, h: 72, gap: 10 },
  digitalCompact: { w: 170, wide: 200, h: 72, gap: 10 },
} as const
export type CardKind = 'text' | 'digital'
/** the minimum tap height of an answer card */
export const MIN_TAP = 64
/**
 * A short portrait phone (360x640): the three stacked cards take too much of the height. The cards get the minimum tap
 * height and a smaller gap (QA 2026-10-15: the clock was smaller than the cards).
 */
export const isTight = (box: Box) => box.h > box.w && box.h < 520
export const TIGHT_GAP = 8

/**
 * On a phone the case is shown as fully as the room allows: the whole case if the face still beats the cards, else cut off
 * around the face at the loosest of these that does (the cut edge fades, see ClockFace). The playtest: "some graphics are
 * cut, especially at the top and bottom" (every phone case was cut at 1.4 face sizes).
 */
export const CLIPS: (number | undefined)[] = [undefined, 2.2, 1.9, 1.6, 1.4, 1.25, 1.12]
function loosest<T extends { size: number }>(compute: (clip: number | undefined) => T, minFace: number): T & { clip: number | undefined } {
  let last: (T & { clip: number | undefined }) | null = null
  for (const clip of CLIPS) {
    last = { ...compute(clip), clip }
    if (last.size >= minFace) return last
  }
  return last!
}

/** What time is it / Clock to digital: the clock, and three cards beside it or under it. `ext(clip)` gives the clock's extent. */
export function pickLayout(box: Box, ext: (clip?: number) => Extent, kind: CardKind) {
  const compact = isCompact(box)
  const tight = isTight(box)
  const base = CARDS[compact ? (`${kind}Compact` as const) : kind]
  const c = tight ? { ...base, h: MIN_TAP, gap: TIGHT_GAP } : base
  const cardsH = 3 * c.h + 2 * c.gap
  const max = Math.min(box.w, box.h) * (compact ? 0.85 : 0.62)
  const compute = (clip: number | undefined) => {
    const e = ext(clip)
    const r = best(fit(box.w - c.w - 3 * GAP, box.h - GAP, e, max), fit(box.w - GAP, box.h - cardsH - 3 * GAP, e, max))
    return { ...r, cardW: Math.min(r.dir === 'row' ? c.w : c.wide, box.w - GAP) }
  }
  // the face must stay the strongest thing: wider than a card is tall (by far), its square bigger than a card
  const r = compact
    ? loosest(compute, Math.max(0.56 * Math.min(box.w, box.h), 2.6 * c.h, Math.sqrt(1.55 * Math.min(c.wide, box.w - GAP) * c.h)))
    : { ...compute(undefined), clip: undefined }
  return { ...r, compact, tight, cardH: c.h, cardGap: c.gap }
}

/** Set the clock: the prompt on top, the face with the hand buttons beside it or under it. */
export function setLayout(box: Box, ext: (clip?: number) => Extent, promptH: number) {
  const compact = isCompact(box)
  const max = Math.min(box.w, box.h) * 0.75
  const compute = (clip: number | undefined) => {
    const e = ext(clip)
    return best(
      fit(box.w - BUTTONS_W - 2 * GAP, box.h - promptH - GAP, e, max),
      fit(box.w - GAP, box.h - promptH - BUTTONS_H - 2 * GAP, e, max),
    )
  }
  const r = compact ? loosest(compute, Math.max(0.56 * Math.min(box.w, box.h), 2.1 * BUTTONS_H)) : { ...compute(undefined), clip: undefined }
  return { ...r, compact }
}
