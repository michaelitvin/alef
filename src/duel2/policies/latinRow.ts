// A row of Latin letters, one box each, written left to right (the drawing's Latin board and the spell book's written
// words): the pure rules both policies share. His strokes come in letter units from the first box's origin; each letter
// is judged by its own checker in its own box (`shift`). A verdict restyles his last strokes (`afterVerdict`). The dots
// and bars of a letter are owed once the letter is done, where his letter puts them (`oweMarks`), and follow the Hebrew
// marks rule: any order, also after the next letter, each stroke matched to the nearest one missing (`takeMark`); while
// he writes a letter, a stroke is first tried as a missing mark (`rowStroke`). A tap is no stroke of a letter.
import type { Pt } from '../data/strokes'
import type { DrawLayout } from '../logic/drawLayout'
import { matchMark, pathLength, type LetterChecker, type LetterMark, type MarkTarget, type Verdict } from '../logic/recognizer'

/** a stroke shorter than this (letter units) is a tap, not a stroke of the letter */
export const TAP_LEN = 0.06

/** one of his strokes on a board (letter units): live while judged, gold when right; `box`: its letter; `mark`: a dot or a bar */
export interface RowStroke { id: number; pts: Pt[]; state: 'live' | 'pending' | 'ok' | 'wrong' | 'helped' | 'mark'; box?: number; mark?: true }
/** a mark he owes, where his letter puts it; `got`: drawn, or drawn for him by the hand */
export type Owed = MarkTarget & { got: boolean }
/** the line that asks for a mark */
export type MarkLine = { line: 'draw-dot' | 'draw-cross'; take: 1 }

/** the offset of letter `box`'s origin from the first box's (letter units) */
export const boxDx = (layout: DrawLayout, box: number) => layout.boxes?.[box]?.dx ?? 0
/** points moved by `d` across (`d` < 0: into a box from the row's origin) */
export const shift = (p: Pt[], d: number): Pt[] => (d ? p.map(([x, y]): Pt => [x + d, y]) : p)

/** his stroke's middle is inside letter `box`'s box (across) */
export function inBox(layout: DrawLayout, box: number, pts: Pt[]): boolean {
  const b = layout.boxes?.[box]
  if (!b || !pts.length) return false
  const xs = pts.map((p) => p[0])
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2
  return mid >= (b.left - layout.x0) / layout.u && mid <= (b.right - layout.x0) / layout.u
}

/** a tap is no stroke of a letter (it may be a dot) */
export const isTap = (pts: Pt[]) => pathLength(pts) < TAP_LEN

/**
 * His strokes after a verdict of the checker: the last `pieces` strokes take its kind (pending while a piece waits); a
 * piece that waited before them was right (`settled`) or wrong.
 */
export function afterVerdict<S extends RowStroke>(strokes: S[], v: Verdict): S[] {
  const mine: RowStroke['state'] = v.kind === 'ok' ? 'ok' : v.kind === 'partial' ? 'pending' : 'wrong'
  return strokes.map((x, i, all) => (i >= all.length - v.pieces ? { ...x, state: mine } : x.state === 'pending' ? { ...x, state: v.settled ? 'ok' : 'wrong' } : x))
}
/** his strokes without the faded wrong ones */
export const dropFaded = <S extends RowStroke>(strokes: S[]): S[] => strokes.filter((x) => x.state !== 'wrong')

/** the marks of letter `box`, just done: owed where his letter (its checker) puts them, from the row's origin (`dx`) */
export const oweMarks = (marks: LetterMark[], c: LetterChecker, box: number, dx: number): Owed[] =>
  marks.map((m) => ({ ...m, pts: shift(c.place(m.pts), dx), box, k: c.scale, got: false }))

/** the marks still missing */
export const missingMarks = (due: Owed[]) => due.filter((m) => !m.got)
/** the line that asks for the first mark still missing */
export const markLine = (due: Owed[]): MarkLine => ({ line: missingMarks(due)[0]?.shape === 'bar' ? 'draw-cross' : 'draw-dot', take: 1 })

/** his stroke as a missing mark: the marks with it got, and the one it is; null: it is none */
export function takeMark(due: Owed[], pts: Pt[]): { due: Owed[]; mark: Owed } | null {
  const missing = missingMarks(due)
  const i = matchMark(pts, missing)
  if (i < 0) return null
  const mark = missing[i]
  return { due: due.map((m) => (m === mark ? { ...m, got: true } : m)), mark }
}

/**
 * What his stroke is while he writes a letter: a missing mark of a letter he has written (when no piece waits), a tap
 * (nothing), or a stroke of the letter (the checker judges it).
 */
export function rowStroke(pts: Pt[], checker: LetterChecker, due: Owed[]): { k: 'mark'; due: Owed[]; mark: Owed } | { k: 'tap' } | { k: 'letter' } {
  if (!checker.hasPending && missingMarks(due).length) {
    const m = takeMark(due, pts)
    if (m) return { k: 'mark', ...m }
  }
  return isTap(pts) ? { k: 'tap' } : { k: 'letter' }
}
