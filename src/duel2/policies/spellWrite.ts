// The spell book's written words (English, stage 4 on): one box per letter, not per unit (sh is two letters in two boxes
// of its one unit), on the drawing's slate across the book's pages. This file holds the round's facts and its board; the
// row's rules (the checker per box, the marks) are latinRow.ts, and the flow is the spell policy's (spell.ts).
import type { CourseWriting } from '../course/types'
import type { LetterDef, Pt } from '../data/strokes'
import { SPELL_BOARD, latinLayout, type DrawLayout } from '../logic/drawLayout'
import { LetterChecker, splitMarks, type LetterMark } from '../logic/recognizer'
import type { Owed, RowStroke } from './latinRow'
import type { SpellRound } from './spell'

/** the letters of a word, in order, with the box of their unit (a unit of two letters, sh, is two letters of one box) */
export const spellLetters = (round: SpellRound): { ch: string; box: number }[] =>
  round.boxes.flatMap((b, box) => [...b.text].map((ch) => ({ ch, box })))

/** a written round's own facts: each letter without its marks (one checker each, in turn), its marks, the board */
export interface SpellWriteCtx { defs: LetterDef[]; marks: LetterMark[][]; layout: DrawLayout }

/**
 * A written round's facts from the course's writing: the letters' strokes and marks (the drawing's split), and the board
 * on the book's two pages (four lines, a box per letter, then the faint tail e).
 */
export function spellWriting(round: SpellRound, w: Pick<CourseWriting, 'strokesOf' | 'isMark' | 'lines' | 'font' | 'unitEm' | 'em'>): SpellWriteCtx {
  const parts = spellLetters(round).map((l) => splitMarks(w.strokesOf(l.ch), w.isMark))
  const defs = parts.map((x) => x.body)
  const layout = latinLayout({ defs, rest: round.tail ?? '', capital: false, lines: w.lines, font: w.font, unitEm: w.unitEm, em: w.em, board: SPELL_BOARD })
  return { defs, marks: parts.map((x) => x.marks), layout }
}

/** the written word's board: its letters, one box each (`at`: the one he writes now), his strokes, the hand */
export interface SpellWriteView {
  layout: DrawLayout
  letters: string[]
  /** the letter he writes now (letters.length: every letter is written) */
  at: number
  /** his strokes, in letter units from the first box's origin (`box`: the letter's index) */
  strokes: RowStroke[]
  /** `mark`: every letter is written, the marks still missing are asked for */
  mode: 'letter' | 'mark' | 'done'
  /** the glowing hand draws these strokes (the demo, the hint, the fix) */
  demo?: { id: number; strokes: Pt[][]; hint?: true }
  /** the marks still missing, where his letters put them */
  owed?: Pt[][]
}

/** a written round as it goes: the letter he writes now and its checker, and the marks owed */
export interface WriteState extends SpellWriteCtx {
  /** each letter's box (its unit) */
  boxOf: number[]
  at: number
  checker: LetterChecker
  /** wrong strokes of this letter while he fixes it */
  tries: number
  /** the marks of the letters he has written, where his letters put them */
  due: Owed[]
  markTries: number
  /** a mark was wrong, or the hand put the marks in: the word is not clean */
  markWrong: boolean
  strokeNo: number
  demoNo: number
  /** the idle line or the hint spoke in this wait (his next stroke stops the voice) */
  spoke: boolean
}

/** the written round as it starts (from its first letter), and its board */
export function writeStart(round: SpellRound, w: SpellWriteCtx): { state: WriteState; view: SpellWriteView } {
  const letters = spellLetters(round)
  return {
    state: {
      ...w, boxOf: letters.map((l) => l.box), at: 0, checker: new LetterChecker(w.defs[0]), tries: 0, due: [], markTries: 0, markWrong: false,
      strokeNo: 0, demoNo: 0, spoke: false,
    },
    view: { layout: w.layout, letters: letters.map((l) => l.ch), at: 0, strokes: [], mode: 'letter' },
  }
}
