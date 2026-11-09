// The drawing screen's rounds (spec: The screen): which words, which script, how the word splits around the slot, which
// marks he draws after the letter, and when the demo plays.
import type { Rng, Tally } from '../../shared/adaptive'
import { WORDS, type Word } from '../data/words'
import type { Script } from '../data/strokes'
import type { MarkShape, MarkSpec } from './recognizer'
import { item, type MarkId, type Stage } from './content'
import { predict } from './predict'
import type { Conf } from './rounds'

export const DRAW_WORDS = 3
/** the tally of one letter drawn in one script */
export const drawFeature = (letter: string, script: Script) => `dr:${letter}:${script}`

const MARK = /[֑-ׇ]/
const clusters = (t: string) => {
  const out: string[] = []
  for (const ch of t.normalize('NFC')) {
    if (MARK.test(ch) && out.length) out[out.length - 1] += ch
    else out.push(ch)
  }
  return out
}
export const bare = (t: string) => t.replace(/[֑-ׇ]/g, '')

/** The slot's letter, a bare vav when the first vowel sits on it (he draws its dot), and the rest of the word. */
export function splitWord(w: Word, script: Script): { letter: string; vav: boolean; rest: string } {
  const c = clusters(w.text)
  const vav = w.first.mark === 'shuruk' || w.first.mark === 'cholam-male'
  const rest = c.slice(vav ? 2 : 1).join('')
  return { letter: bare(c[0]), vav, rest: script === 'hand' ? bare(rest) : rest }
}

const VOWEL: Record<MarkId, MarkSpec> = {
  kamatz: { zone: 'under', shape: 'T' },
  patach: { zone: 'under', shape: 'bar' },
  tsere: { zone: 'under', shape: 'dots2' },
  segol: { zone: 'under', shape: 'dots3-tri' },
  chirik: { zone: 'under', shape: 'dot' },
  cholam: { zone: 'above-left', shape: 'dot' },
  'cholam-male': { zone: 'vav-above', shape: 'dot' },
  kubutz: { zone: 'under', shape: 'dots3-diag' as MarkShape },
  shuruk: { zone: 'vav-left', shape: 'dot' },
}

/**
 * The marks of the first syllable, in the order they are written (letter first, then the dagesh, the ש dot, the vowel).
 * None at stage 1 (letters only). The dagesh only where the game shows one (בּ כּ פּ: it changes the sound).
 */
export function marksFor(w: Word, stage: Stage): MarkSpec[] {
  if (stage < 2) return []
  const it = item(w.first.item)
  const out: MarkSpec[] = []
  if (it.glyph.includes('ּ')) out.push({ zone: 'inside', shape: 'dot' })
  if (it.glyph.includes('ׁ')) out.push({ zone: 'above-right', shape: 'dot' })
  if (it.glyph.includes('ׂ')) out.push({ zone: 'above-left', shape: 'dot' })
  out.push(VOWEL[w.first.mark])
  return out
}

/** Print below stage 3; from stage 3 print and handwriting alternate (n = his drawing rounds so far). */
export const scriptFor = (stage: Stage, n: number): Script => (stage < 3 || n % 2 === 0 ? 'print' : 'hand')

export interface DrawCtx { rng: Rng; tallies: Record<string, Tally>; recent: Record<string, string>; confusions: Conf; avoid?: string }

/**
 * The words of a visit: from WORDS (each has a picture and its spoken word), more often those whose first letter he mixes
 * up (confusions, either way) or drew wrong; never the same first letter twice in a visit.
 */
export function drawWords(ctx: DrawCtx, n = DRAW_WORDS): Word[] {
  const mixups = (id: string) => {
    let k = 0
    for (const [a, row] of Object.entries(ctx.confusions)) for (const [b, c] of Object.entries(row)) if (a === id || b === id) k += c
    return k
  }
  const pool = WORDS.map((w) => {
    const letter = splitWord(w, 'print').letter
    const p = predict([drawFeature(letter, 'print'), drawFeature(letter, 'hand')].filter((f) => ctx.tallies[f]), ctx.tallies, ctx.recent)
    return { w, letter, weight: 1 + Math.min(3, mixups(w.first.item) / 2) + 6 * p }
  })
  const out: Word[] = []
  const used = new Set<string>(ctx.avoid ? [ctx.avoid] : [])
  while (out.length < n) {
    const left = pool.filter((x) => !used.has(x.letter))
    const from = left.length ? left : pool.filter((x) => !out.includes(x.w))
    const total = from.reduce((a, x) => a + x.weight, 0)
    let r = ctx.rng() * total
    let pick = from[from.length - 1]
    for (const x of from) { r -= x.weight; if (r <= 0) { pick = x; break } }
    out.push(pick.w)
    used.add(pick.letter)
  }
  return out
}

/** The demo plays for a letter he has not drawn yet in this script, or drew wrong in his last tries. */
export function needsDemo(letter: string, script: Script, tallies: Record<string, Tally>, recent: Record<string, string>): boolean {
  const f = drawFeature(letter, script)
  if (!tallies[f]?.seen) return true
  return (recent[f] ?? '').slice(-3).includes('x')
}
